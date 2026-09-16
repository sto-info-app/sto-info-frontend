import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { EntityAvatarComponent } from 'src/app/shared/components/entity-avatar/entity-avatar.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  getFactionClass,
  getLauncherIconClass,
  getPlatformIconClass,
} from 'src/app/shared/utils/card-theme.utils';

import { SwitcherAccount } from '../models/account-switcher.model';
import { StoAccountService } from '../services/sto-account.service';

/**
 * What the switcher needs to know about where it was opened from.
 *
 * Only the two identifiers: the dialog fetches the list itself, so the page
 * that opens it does not have to hold one.
 */
export interface StoSwitcherDialogData {
  /** The account currently being viewed, or null when none is. */
  currentAccountId: string | null;
  /** The captain currently being viewed, or null when none is. */
  currentCharacterId: string | null;
}

/**
 * What the dialog closes with when somebody picks a row.
 *
 * Handles rather than IDs, because handles are what the dashboard's addresses
 * are built from; the caller turns these into a route.
 */
export interface StoSwitcherSelection {
  /** The chosen account's handle. */
  accountHandle: string;
  /** The chosen captain's handle, or null when an account itself was chosen. */
  characterHandle: string | null;
}

/** One captain row, with everything it draws already worked out. */
interface SwitcherCharacterVm {
  id: string;
  handle: string;
  avatarUrl: string | null;
  factionName: string | null;
  factionIconUrl: string | null;
  /** Colours the row's spine by allegiance. */
  factionClass: string;
  pinned: boolean;
  /** Whether this is the captain being viewed, so the row does not offer a jump. */
  isCurrent: boolean;
}

/** One account group, with its captains beneath it. */
interface SwitcherAccountVm {
  id: string;
  handle: string;
  platformIconClass: string | null;
  platformName: string | null;
  launcherIconClass: string | null;
  launcherName: string | null;
  lifetimeSubscription: boolean;
  pinned: boolean;
  /** Whether this is the account being viewed in its own right. */
  isCurrent: boolean;
  /** How many captains the account has, before any filtering. */
  totalCharacterCount: number;
  characters: SwitcherCharacterVm[];
}

/**
 * The quick-switch dialog: every account the user owns with every captain on
 * it, and one click to any of them.
 *
 * One flat list rather than an account picker followed by a captain picker.
 * Moving between captains on different accounts is the move this exists for,
 * and a two-step picker would make that the slowest thing it does.
 *
 * Rows are ordered as the dashboard's own lists order them — pinned first,
 * then by handle — so an entry is where its owner already expects it. Accounts
 * with no captains are still listed: they are somewhere to switch to.
 */
@Component({
  selector: 'app-sto-switcher-dialog',
  templateUrl: './sto-switcher-dialog.component.html',
  styleUrls: ['./sto-switcher-dialog.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    EntityAvatarComponent,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
  ],
})
export class StoSwitcherDialogComponent {
  /** Where the dialog was opened from. */
  readonly data: StoSwitcherDialogData = inject(MAT_DIALOG_DATA);

  private readonly _dialogRef =
    inject<MatDialogRef<StoSwitcherDialogComponent, StoSwitcherSelection>>(
      MatDialogRef,
    );
  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _destroyRef = inject(DestroyRef);

  /** True while the list is being fetched. */
  readonly isLoading = signal(true);

  /** Set when the list could not be fetched. */
  readonly hasFailed = signal(false);

  /** What has been typed into the filter box. */
  readonly filterTerm = signal('');

  private readonly _accounts = signal<SwitcherAccount[]>([]);

  /**
   * Every account as a row group, whether or not the filter lets it through.
   *
   * Built once per fetch so that typing only re-runs the filter rather than
   * re-deriving icon classes and avatars on every keystroke.
   */
  private readonly _accountVms = computed<SwitcherAccountVm[]>(() =>
    this._accounts().map(account => this.toAccountVm(account)),
  );

  /**
   * The groups the filter lets through.
   *
   * An account whose own handle matches keeps all of its captains: somebody who
   * has typed an account name is looking for that account, not for a captain
   * whose name happens to contain the same letters. Otherwise the group is kept
   * only for the captains that match, so what is left on screen is what was
   * asked for.
   */
  readonly visibleAccounts = computed<SwitcherAccountVm[]>(() => {
    const term = this.filterTerm().trim().toLowerCase();
    if (!term) {
      return this._accountVms();
    }

    return this._accountVms()
      .map(account => this.filterAccountVm(account, term))
      .filter(account => account !== null);
  });

  /** Whether the filter has hidden everything there was to show. */
  readonly hasNoMatches = computed(
    () => this._accountVms().length > 0 && this.visibleAccounts().length === 0,
  );

  /** Whether the user has no accounts at all yet. */
  readonly hasNoAccounts = computed(() => this._accountVms().length === 0);

  /**
   * Creates the dialog and starts fetching the list it shows.
   */
  constructor() {
    this.loadAccounts();
  }

  /**
   * Records what has been typed into the filter box.
   *
   * @param event - The input event from the filter box.
   */
  onFilterInput(event: Event): void {
    this.filterTerm.set((event.target as HTMLInputElement).value);
  }

  /**
   * Closes the dialog, asking the caller to open the given account.
   *
   * @param account - The account row that was activated.
   */
  selectAccount(account: SwitcherAccountVm): void {
    this._dialogRef.close({
      accountHandle: account.handle,
      characterHandle: null,
    });
  }

  /**
   * Closes the dialog, asking the caller to open the given captain.
   *
   * @param account - The account the captain belongs to.
   * @param character - The captain row that was activated.
   */
  selectCharacter(
    account: SwitcherAccountVm,
    character: SwitcherCharacterVm,
  ): void {
    this._dialogRef.close({
      accountHandle: account.handle,
      characterHandle: character.handle,
    });
  }

  /**
   * Closes the dialog without switching anywhere.
   */
  cancel(): void {
    this._dialogRef.close();
  }

  /**
   * Fetches every account with its captains.
   */
  private loadAccounts(): void {
    this._stoAccountService
      .getSwitcherList()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: accounts => {
          this._accounts.set(accounts);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasFailed.set(true);
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Reduces an account and its captains to the rows the dialog draws.
   *
   * @param account - The account from the API.
   * @returns The row group for that account.
   */
  private toAccountVm(account: SwitcherAccount): SwitcherAccountVm {
    return {
      id: account.id,
      handle: account.handle,
      platformIconClass: getPlatformIconClass(account.platformName),
      platformName: account.platformName,
      launcherIconClass: getLauncherIconClass(account.launcherName),
      launcherName: account.launcherName,
      lifetimeSubscription: account.lifetimeSubscription,
      pinned: !!account.pinnedAt,
      // An account is only the current entry when it is what is being read. On
      // a captain's page the captain is the entry, and the account above them
      // stays reachable — going up to it is a switch like any other.
      isCurrent:
        account.id === this.data.currentAccountId &&
        !this.data.currentCharacterId,
      totalCharacterCount: account.characters.length,
      characters: account.characters.map(character => ({
        id: character.id,
        handle: character.handle,
        avatarUrl: character.profilePicture100,
        factionName: character.factionName,
        factionIconUrl: character.factionIconUrl,
        factionClass: getFactionClass(character.generalFactionName),
        pinned: !!character.pinnedAt,
        isCurrent: character.id === this.data.currentCharacterId,
      })),
    };
  }

  /**
   * Narrows one group to what the filter term matches.
   *
   * @param account - The group to narrow.
   * @param term - The lower-cased filter term.
   * @returns The group as it should appear, or null when nothing in it matches.
   */
  private filterAccountVm(
    account: SwitcherAccountVm,
    term: string,
  ): SwitcherAccountVm | null {
    if (account.handle.toLowerCase().includes(term)) {
      return account;
    }

    const characters = account.characters.filter(character =>
      character.handle.toLowerCase().includes(term),
    );

    return characters.length > 0 ? { ...account, characters } : null;
  }
}
