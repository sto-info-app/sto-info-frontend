import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { AccountCardComponent } from 'src/app/shared/components/account-card/account-card.component';
import {
  AccountCardDetail,
  AccountCardVm,
} from 'src/app/shared/components/account-card/account-card.model';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import {
  AccountFilterFields,
  AccountFilters,
  AccountSortBy,
  AccountSortOption,
  AccountSortOrder,
  DEFAULT_ACCOUNT_SORT_BY,
  DEFAULT_ACCOUNT_SORT_ORDER,
  buildAccountSearchHaystack,
  countActiveAccountFilters,
  matchesAccountFilters,
} from 'src/app/shared/utils/account-list.utils';
import {
  getAccountBgImagePath,
  getLauncherClass,
  getPlatformClass,
} from 'src/app/shared/utils/card-theme.utils';
import { encodeStoHandle } from 'src/app/shared/utils/sto-handle.utils';
import { Launcher, Platform, StoAccount } from '../models/sto-account.model';
import { StoAccountService } from '../services/sto-account.service';
import { PrivacyModeService } from '../services/privacy-mode.service';

/**
 * View model for a single STO account card, with all display values precomputed at load time.
 */
export interface AccountVm {
  /** Unique identifier of the account. */
  id: string;
  /** The underlying STO account data. */
  account: StoAccount;
  /** Precomputed Font Awesome icon class for the account platform, or null if unavailable. */
  platformIcon: string | null;
  /** Precomputed Font Awesome icon class for the account launcher, or null if unavailable. */
  launcherIcon: string | null;
  /** Presentation model handed to the shared account card. */
  card: AccountCardVm;
  /** Precomputed values the side-column filters match against. */
  filterFields: AccountFilterFields;
}

/** Action keys emitted by the account cards on this page. */
export const ACCOUNT_CARD_EDIT = 'edit';
export const ACCOUNT_CARD_DELETE = 'delete';
export const ACCOUNT_CARD_PIN = 'pin';

/**
 * The orderings offered for the account list.
 *
 * The values are the API's own, so they are sent to it unchanged.
 */
export const ACCOUNT_SORT_OPTIONS: readonly AccountSortOption[] = [
  { value: 'handle', label: 'Handle' },
  { value: 'characterCount', label: 'Captains' },
  { value: 'endeavourTotalNodes', label: 'Endeavour Nodes' },
  { value: 'accountCreatedDate', label: 'Account Created' },
];

/**
 * Component to list and manage STO accounts.
 */
@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule,
    RouterModule,
    FormsModule,
    LoadingBarComponent,
    AccountCardComponent,
  ],
})
export class AccountsComponent implements OnInit, OnDestroy {
  /** Precomputed router link to the main dashboard. */
  readonly dashboardLink = `/${APP_ROUTES.STO_DASHBOARD}`;

  /** Application route titles for navigation labels. */
  readonly appRouteTitles = APP_ROUTE_TITLES;

  /** List of STO accounts for the current user. */
  accounts: StoAccount[] = [];

  /** List of available platforms. */
  platforms: Platform[] = [];

  /** List of available launchers. */
  launchers: Launcher[] = [];

  /** Precomputed view-model rows for the account cards, in the API's order. */
  readonly accountVms = signal<AccountVm[]>([]);

  /** Flag to indicate if data is being loaded. */
  isLoading = true;

  /** The orderings offered in the Sort panel. */
  readonly sortOptions = ACCOUNT_SORT_OPTIONS;

  /** Field the list is ordered by. Applied by the API, not here. */
  readonly sortBy = signal<AccountSortBy>(DEFAULT_ACCOUNT_SORT_BY);

  /** Direction the list is ordered in. Applied by the API, not here. */
  readonly sortOrder = signal<AccountSortOrder>(DEFAULT_ACCOUNT_SORT_ORDER);

  /** Free-text search over handle, username, email and notes. */
  readonly searchText = signal('');

  /** Platform ID to filter by, or an empty string for all platforms. */
  readonly platformFilter = signal('');

  /** Launcher ID to filter by, or an empty string for all launchers. */
  readonly launcherFilter = signal('');

  /** Whether to show only accounts with a lifetime subscription. */
  readonly lifetimeOnly = signal(false);

  /** Whether to show only pinned accounts. */
  readonly pinnedOnly = signal(false);

  /** Whether the Filters panel is collapsed. */
  filtersCollapsed = false;

  /** Whether the Sort panel is collapsed. */
  sortCollapsed = false;

  /** The filters currently applied, as the shared filter helpers expect them. */
  readonly filters = computed<AccountFilters>(() => ({
    searchText: this.searchText(),
    platformKey: this.platformFilter(),
    launcherKey: this.launcherFilter(),
    lifetimeOnly: this.lifetimeOnly(),
    pinnedOnly: this.pinnedOnly(),
  }));

  /**
   * The cards to render: the API's ordering, narrowed by the filters.
   *
   * Filtering happens here rather than at the API because the whole list is
   * already loaded, so hiding a card needs no round trip.
   */
  readonly filteredAccountVms = computed(() => {
    const filters = this.filters();

    return this.accountVms().filter(vm =>
      matchesAccountFilters(vm.filterFields, filters),
    );
  });

  /** How many filters are narrowing the list. */
  readonly activeFilterCount = computed(() =>
    countActiveAccountFilters(this.filters()),
  );

  /**
   * Whether to offer sorting and filtering at all.
   *
   * With a single account there is nothing to order and nothing to narrow, so
   * the panels would only be clutter. Pinning stays available regardless: it is
   * a per-account choice that keeps its meaning once a second account arrives.
   */
  readonly showListControls = computed(() => this.accountVms().length > 1);

  /** Whether every loaded account has been filtered out of the list. */
  readonly allAccountsFilteredOut = computed(
    () =>
      this.accountVms().length > 0 && this.filteredAccountVms().length === 0,
  );

  /**
   * How many accounts are pinned, so the controls that only make sense with a
   * pin in play stay hidden until there is one.
   */
  readonly pinnedCount = computed(
    () => this.accountVms().filter(vm => vm.filterFields.pinned).length,
  );

  private readonly _stoAccountService = inject(StoAccountService);
  readonly privacyMode = inject(PrivacyModeService);
  private readonly _routingService = inject(RoutingService);
  private readonly _dialog = inject(MatDialog);
  private readonly _router = inject(Router);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  /**
   * Initialises the component by fetching STO accounts.
   */
  ngOnInit(): void {
    this.privacyMode.load().pipe(takeUntil(this._destroy$)).subscribe();
    this.loadAccounts();
  }

  /**
   * Fetches the list of STO accounts, platforms, and launchers from the service,
   * then builds the precomputed view-model rows.
   */
  loadAccounts(): void {
    this.isLoading = true;
    forkJoin({
      accounts: this._stoAccountService.getAccounts(
        this.sortBy(),
        this.sortOrder(),
      ),
      platforms: this._stoAccountService.getPlatforms(),
      launchers: this._stoAccountService.getLaunchers(),
    })
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: ({ accounts, platforms, launchers }) => {
          this.accounts = accounts;
          this.platforms = platforms;
          this.launchers = launchers;
          this.accountVms.set(
            accounts.map(account => this._buildAccountVm(account)),
          );
          this.isLoading = false;
          this._cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this._cdr.detectChanges();
        },
      });
  }

  /**
   * Changes the field the list is ordered by and reloads it.
   *
   * @param sortBy The field to order by.
   */
  setSortBy(sortBy: AccountSortBy): void {
    this.sortBy.set(sortBy);
    this.loadAccounts();
  }

  /**
   * Changes the direction the list is ordered in and reloads it.
   *
   * @param sortOrder The direction to order in.
   */
  setSortOrder(sortOrder: AccountSortOrder): void {
    this.sortOrder.set(sortOrder);
    this.loadAccounts();
  }

  /**
   * Clears every filter, leaving the ordering alone.
   */
  clearFilters(): void {
    this.searchText.set('');
    this.platformFilter.set('');
    this.launcherFilter.set('');
    this.lifetimeOnly.set(false);
    this.pinnedOnly.set(false);
  }

  /**
   * Pins or unpins an account, then reloads the list so its new position comes
   * from the API rather than being guessed at here.
   *
   * @param account The account to pin or unpin.
   */
  togglePin(account: StoAccount): void {
    const pinned = !account.pinnedAt;

    this.isLoading = true;
    this._cdr.markForCheck();

    this._stoAccountService
      .setAccountPinned(account.id, pinned)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: () => this.loadAccounts(),
        error: err => {
          this.isLoading = false;
          this._cdr.markForCheck();
          console.error('Failed to update the STO account pin:', err);
        },
      });
  }

  /**
   * Navigates to the in-page account creation screen.
   */
  addAccount(): void {
    this._router.navigate(['/dashboard/accounts/add']);
  }

  /**
   * Navigates to the in-page account edit screen.
   *
   * @param account The account to edit.
   */
  editAccount(account: StoAccount): void {
    this._router.navigate([
      '/dashboard/accounts',
      this.encodeHandle(account.handle),
      'edit',
    ]);
  }

  /**
   * Deletes an STO account after user confirmation.
   *
   * @param account The account to delete.
   */
  deleteAccount(account: StoAccount): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: {
        title: 'Delete STO Account',
        message: `
          <p>Are you sure you want to delete account <span class="go-bluey">${account.handle}</span>?</p>
          <p><strong>WARNING:</strong> Unlike the making of Tuvix, this action cannot be undone.</p>`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(result => {
        if (result) {
          this._stoAccountService
            .deleteAccount(account.id)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
              next: () => this.loadAccounts(),
              error: err => {
                this.isLoading = false;
                this._cdr.markForCheck();
                console.error('Failed to delete STO account:', err);
              },
            });
        }
      });
  }

  /**
   * Resolves a navigation route into a router link string.
   *
   * @param route Application route key.
   * @returns A router link string for the given route.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Returns the Font Awesome icon class for a given platform.
   *
   * @param platformId The platform ID.
   * @returns A Font Awesome icon class string, or null if not found.
   */
  getPlatformIcon(platformId?: string): string | null {
    if (!platformId) return null;

    const platform = this.platforms.find(p => p.id === platformId);
    if (!platform) return null;

    const name = platform.name.toLowerCase();
    if (name === 'arc') return 'fak fa-arc-games';
    if (name === 'epic') return 'fak fa-epic-games';
    if (name === 'steam') return 'fab fa-steam';
    if (name === 'windows' || name === 'pc') return 'fab fa-windows';
    if (name === 'playstation' || name === 'ps') return 'fab fa-playstation';
    if (name === 'xbox') return 'fab fa-xbox';

    return null;
  }

  /**
   * Returns the platform for a given platform ID.
   *
   * @param platformId The platform ID.
   * @returns The Platform object, or undefined if not found.
   */
  getPlatform(platformId?: string): Platform | undefined {
    if (!platformId) return undefined;
    return this.platforms.find(p => p.id === platformId);
  }

  /**
   * Returns the Font Awesome icon class for a given launcher.
   *
   * @param launcherId The launcher ID.
   * @returns A Font Awesome icon class string, or null if not found.
   */
  getLauncherIcon(launcherId?: string): string | null {
    if (!launcherId) return null;

    const launcher = this.launchers.find(l => l.id === launcherId);
    if (!launcher) return null;

    const name = launcher.name.toLowerCase();
    if (name === 'arc') return 'fak fa-arc-games';
    if (name === 'epic') return 'fak fa-epic-games';
    if (name === 'steam') return 'fab fa-steam';

    return null;
  }

  /**
   * Returns the launcher for a given launcher ID.
   *
   * @param launcherId The launcher ID.
   * @returns The Launcher object, or undefined if not found.
   */
  getLauncher(launcherId?: string): Launcher | undefined {
    if (!launcherId) return undefined;
    return this.launchers.find(l => l.id === launcherId);
  }

  /**
   * Encodes an STO handle for URL safety.
   *
   * @param handle The STO handle to encode.
   * @returns The URL-safe encoded handle.
   */
  encodeHandle(handle: string): string {
    return encodeStoHandle(handle);
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Builds a view-model for a single account card, precomputing all display values.
   * Must be called after {@link platforms} and {@link launchers} have been set.
   *
   * @param account The STO account to build a view-model for.
   * @returns A precomputed AccountVm for template binding.
   */
  private _buildAccountVm(account: StoAccount): AccountVm {
    const handleSegment = this.encodeHandle(account.handle);
    const accountLink = `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}/${handleSegment}`;
    const platformClass = this.getPlatformClass(account.platformId);
    const launcherName = this.getLauncher(account.launcherId)?.name;
    const isPinned = !!account.pinnedAt;

    return {
      id: account.id,
      account,
      platformIcon: this.getPlatformIcon(account.platformId),
      launcherIcon: this.getLauncherIcon(account.launcherId),
      card: {
        id: account.id,
        handle: account.handle,
        link: accountLink,
        themeClass: [
          platformClass,
          getLauncherClass(platformClass, launcherName),
        ]
          .filter(Boolean)
          .join(' '),
        bgImagePath:
          account.accountTypeImageUrl?.trim() ||
          getAccountBgImagePath(platformClass, launcherName),
        lifetimeSubscription: !!account.lifetimeSubscription,
        characterCount: account.characterCount || 0,
        platformName: this.getPlatform(account.platformId)?.name ?? 'Platform',
        launcherName: account.launcherId ? (launcherName ?? 'Launcher') : null,
        details: this._buildAccountDetails(account),
        endeavour: {
          totalNodes: account.endeavourTotalNodes || 0,
          link: `${accountLink}/endeavours`,
        },
        actions: [
          {
            key: ACCOUNT_CARD_PIN,
            icon: 'fas fa-thumbtack',
            title: isPinned ? 'Unpin Account' : 'Pin Account to Top',
            active: isPinned,
          },
          {
            key: ACCOUNT_CARD_EDIT,
            icon: 'fas fa-user-pen',
            title: 'Edit Account',
          },
          {
            key: ACCOUNT_CARD_DELETE,
            icon: 'fas fa-trash',
            title: 'Delete Account',
            destructive: true,
          },
        ],
      },
      filterFields: {
        searchHaystack: buildAccountSearchHaystack([
          account.handle,
          account.username,
          account.email,
          account.notes,
        ]),
        platformKey: account.platformId ?? null,
        launcherKey: account.launcherId ?? null,
        lifetimeSubscription: !!account.lifetimeSubscription,
        pinned: isPinned,
      },
    };
  }

  /**
   * Builds the owner-facing detail rows shown in an account card's body.
   *
   * The username is omitted when it merely repeats the handle.
   *
   * @param account The STO account to describe.
   * @returns The detail rows for the card.
   */
  private _buildAccountDetails(account: StoAccount): AccountCardDetail[] {
    const details: AccountCardDetail[] = [];

    const showUsername =
      !!account.username &&
      account.username.toLowerCase() !== account.handle.toLowerCase();
    if (showUsername && account.username) {
      details.push({
        icon: 'fas fa-user',
        text: account.username,
        label: 'Username',
        private: true,
      });
    }

    if (account.email) {
      details.push({
        icon: 'fas fa-envelope',
        text: account.email,
        label: 'Email',
        variant: 'secondary',
        private: true,
      });
    }

    if (account.notes) {
      details.push({
        icon: 'fas fa-note-sticky',
        text: account.notes,
        label: 'Notes',
        variant: 'muted',
      });
    }

    return details;
  }

  /**
   * Routes an account card action to the matching handler.
   *
   * @param account The account the card represents.
   * @param actionKey The key emitted by the card.
   */
  onAccountCardAction(account: StoAccount, actionKey: string): void {
    if (actionKey === ACCOUNT_CARD_PIN) {
      this.togglePin(account);
      return;
    }

    if (actionKey === ACCOUNT_CARD_EDIT) {
      this.editAccount(account);
      return;
    }

    if (actionKey === ACCOUNT_CARD_DELETE) {
      this.deleteAccount(account);
    }
  }

  /**
   * Resolves the account-card theme class for a platform.
   *
   * @param platformId The platform ID.
   * @returns The theme class, or an empty string when unrecognised.
   */
  getPlatformClass(platformId?: string): string {
    return getPlatformClass(this.getPlatform(platformId)?.name);
  }
}
