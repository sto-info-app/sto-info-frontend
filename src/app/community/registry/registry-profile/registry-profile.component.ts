import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Observable, take } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { AccountCardComponent } from 'src/app/shared/components/account-card/account-card.component';
import { AccountCardVm } from 'src/app/shared/components/account-card/account-card.model';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { EntityAvatarComponent } from 'src/app/shared/components/entity-avatar/entity-avatar.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ModerationService } from 'src/app/shared/services/moderation.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import {
  AccountFilterFields,
  AccountFilters,
  AccountSortBy,
  AccountSortOption,
  AccountSortOrder,
  AccountSortFields,
  DEFAULT_ACCOUNT_SORT_BY,
  DEFAULT_ACCOUNT_SORT_ORDER,
  buildAccountFilterOptions,
  buildAccountSearchHaystack,
  countActiveAccountFilters,
  matchesAccountFilters,
  sortAccounts,
} from 'src/app/shared/utils/account-list.utils';
import { CommunityService } from '../../community.service';
import { CommunityTabsComponent } from '../../community-tabs/community-tabs.component';
import { RelationshipStatus } from '../../models/community.models';
import {
  ReportMemberDialogComponent,
  ReportMemberDialogResult,
} from '../../report-member-dialog/report-member-dialog.component';
import {
  RegistryAccountSummary,
  RegistryProfile,
} from '../../models/registry.models';
import { buildRegistryAccountCard } from '../registry-card.builders';
import { RegistryPageBaseDirective } from '../registry-page-base.directive';
import { RegistryService } from '../registry.service';

/**
 * One public account, with the card and the values the controls work on.
 *
 * The sort fields sit on the view model itself so the ordered list can be
 * mapped straight to cards, without wrapping each account a second time on
 * every keystroke.
 */
interface RegistryAccountVm extends AccountSortFields {
  id: string;
  card: AccountCardVm;
  filterFields: AccountFilterFields;
}

/**
 * The orderings offered for a member's public account list.
 *
 * Endeavour progress is never published, so — unlike the owner's own dashboard
 * — there is no ordering by it here.
 */
export const REGISTRY_ACCOUNT_SORT_OPTIONS: readonly AccountSortOption[] = [
  { value: 'handle', label: 'Handle' },
  { value: 'characterCount', label: 'Captains' },
  { value: 'accountCreatedDate', label: 'Account Created' },
];

/**
 * A registry member's public profile: their identity, the STO accounts they
 * have chosen to show, and — for a signed-in visitor — the friend and block
 * actions available against them.
 */
@Component({
  selector: 'app-registry-profile',
  templateUrl: './registry-profile.component.html',
  styleUrls: ['./registry-profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
    EntityAvatarComponent,
    AccountCardComponent,
    CommunityTabsComponent,
    FormsModule,
  ],
})
export class RegistryProfileComponent
  extends RegistryPageBaseDirective
  implements OnInit
{
  private readonly _registryService = inject(RegistryService);
  private readonly _communityService = inject(CommunityService);
  private readonly _moderationService = inject(ModerationService);
  private readonly _authService = inject(AuthService);
  private readonly _dialog = inject(MatDialog);
  private readonly _route = inject(ActivatedRoute);
  private readonly _seoService = inject(SeoService);
  private readonly _pageTitleService = inject(PageTitleService);

  relationshipStatus = RelationshipStatus;

  username = '';
  profile: RegistryProfile | null = null;

  /** The member's public accounts, in the order the API returned them. */
  private readonly _accountVms = signal<RegistryAccountVm[]>([]);

  /** The orderings offered in the Sort panel. */
  readonly sortOptions = REGISTRY_ACCOUNT_SORT_OPTIONS;

  /** Field the list is ordered by. */
  readonly sortBy = signal<AccountSortBy>(DEFAULT_ACCOUNT_SORT_BY);

  /** Direction the list is ordered in. */
  readonly sortOrder = signal<AccountSortOrder>(DEFAULT_ACCOUNT_SORT_ORDER);

  /** Free-text search over the handle, platform and launcher. */
  readonly searchText = signal('');

  /** Platform name to filter by, or an empty string for all platforms. */
  readonly platformFilter = signal('');

  /** Launcher name to filter by, or an empty string for all launchers. */
  readonly launcherFilter = signal('');

  /** Whether to show only accounts with a lifetime subscription. */
  readonly lifetimeOnly = signal(false);

  /** Whether the Filters panel is collapsed. */
  filtersCollapsed = false;

  /** Whether the Sort panel is collapsed. */
  sortCollapsed = false;

  /** The platforms present among the accounts on show. */
  readonly platformOptions = computed(() =>
    buildAccountFilterOptions(
      this._accountVms().map(vm => vm.filterFields.platformKey),
    ),
  );

  /** The launchers present among the accounts on show. */
  readonly launcherOptions = computed(() =>
    buildAccountFilterOptions(
      this._accountVms().map(vm => vm.filterFields.launcherKey),
    ),
  );

  /** Whether any account on show has a lifetime subscription. */
  readonly hasLifetimeAccounts = computed(() =>
    this._accountVms().some(vm => vm.filterFields.lifetimeSubscription),
  );

  /** The filters currently applied, as the shared filter helpers expect them. */
  readonly filters = computed<AccountFilters>(() => ({
    searchText: this.searchText(),
    platformKey: this.platformFilter(),
    launcherKey: this.launcherFilter(),
    lifetimeOnly: this.lifetimeOnly(),
    pinnedOnly: false,
  }));

  /**
   * Presentation models for the member's public accounts, narrowed and ordered.
   *
   * Both happen here rather than at the API: the accounts arrive inside the
   * profile payload, so ordering them server-side would mean refetching the
   * whole profile to move a few cards.
   */
  readonly accountCards = computed<AccountCardVm[]>(() => {
    const filters = this.filters();
    const visible = this._accountVms().filter(vm =>
      matchesAccountFilters(vm.filterFields, filters),
    );

    return sortAccounts(visible, this.sortBy(), this.sortOrder()).map(
      vm => vm.card,
    );
  });

  /** How many filters are narrowing the list. */
  readonly activeFilterCount = computed(() =>
    countActiveAccountFilters(this.filters()),
  );

  /**
   * Whether to offer sorting and filtering at all.
   *
   * With a single public account there is nothing to order and nothing to
   * narrow, so the panels would only be clutter.
   */
  readonly showListControls = computed(() => this._accountVms().length > 1);

  /** Whether every public account has been filtered out of the list. */
  readonly allAccountsFilteredOut = computed(
    () => this._accountVms().length > 0 && this.accountCards().length === 0,
  );

  /** Copy shown after a friend or block action succeeds. */
  actionMessage = '';

  /** Copy shown when a friend or block action fails. */
  actionError = '';

  /** Set while an action is in flight, so its buttons can be disabled. */
  isActing = false;

  /**
   * Reads the username from the route and loads the member's profile.
   */
  ngOnInit(): void {
    this.username = this._route.snapshot.paramMap.get('username') ?? '';

    this.loadProfile();
  }

  /**
   * Loads (or reloads) the member's profile.
   *
   * The relationship comes back with the profile, so reloading after an action
   * is what re-derives which buttons the page should now offer.
   */
  private loadProfile(): void {
    this.runLoad(
      this._registryService.getProfile(this.username),
      profile => {
        this.profile = profile;
        this._accountVms.set(
          profile.accounts.map(account => this.buildAccountVm(account)),
        );
        this.applyProfileMeta(profile);
      },
      'Something went wrong loading this profile.',
    );
  }

  // ----- Friend and block actions -----

  /**
   * Whether the viewer is signed in, and so can act on this member at all.
   *
   * @returns True when signed in.
   */
  get isLoggedIn(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * The viewer's relationship to this member, when the API reported one.
   *
   * @returns The relationship status, or null for an anonymous visitor.
   */
  get relationship(): RelationshipStatus | null {
    return this.profile?.relationship?.status ?? null;
  }

  /**
   * Whether there is any officer action to offer against this member.
   *
   * An anonymous visitor has none to take, and nobody befriends or blocks
   * themselves.
   *
   * @returns True when the officer actions should be shown.
   */
  get canActOnMember(): boolean {
    return this.isLoggedIn && this.relationship !== RelationshipStatus.SELF;
  }

  /**
   * Sends a friend request to this member.
   */
  addFriend(): void {
    this.runAction(
      this._communityService.sendFriendRequest({ username: this.username }),
      `Friend request sent to ${this.username}.`,
      'Something went wrong sending that friend request.',
    );
  }

  /**
   * Withdraws the request the viewer sent this member.
   */
  cancelRequest(): void {
    const friendshipId = this.profile?.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.runAction(
      this._communityService.cancelFriendRequest(friendshipId),
      'Friend request withdrawn.',
      'Something went wrong withdrawing that request.',
    );
  }

  /**
   * Accepts the request this member sent the viewer.
   */
  acceptRequest(): void {
    const friendshipId = this.profile?.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.runAction(
      this._communityService.acceptFriendRequest(friendshipId),
      `You and ${this.username} are now friends.`,
      'Something went wrong accepting that request.',
    );
  }

  /**
   * Declines the request this member sent the viewer.
   */
  declineRequest(): void {
    const friendshipId = this.profile?.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.confirm(
      {
        title: 'Decline Request',
        message: `
          <p>Decline the friend request from
          <strong>${this.username}</strong>?</p>
          <p>They are not told, and they may ask again later.</p>`,
        confirmText: 'Decline',
      },
      () =>
        this.runAction(
          this._communityService.declineFriendRequest(friendshipId),
          'Request declined.',
          'Something went wrong declining that request.',
        ),
    );
  }

  /**
   * Ends the friendship with this member.
   */
  removeFriend(): void {
    const friendshipId = this.profile?.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.confirm(
      {
        title: 'Remove Friend',
        message: `
          <p>Remove <strong>${this.username}</strong> from your friends?</p>
          <p>They are not told, and either of you may ask again later.</p>`,
        confirmText: 'Remove',
      },
      () =>
        this.runAction(
          this._communityService.removeFriend(friendshipId),
          `${this.username} was removed from your friends.`,
          'Something went wrong removing that friend.',
        ),
    );
  }

  /**
   * Blocks this member.
   *
   * The confirmation spells out the two consequences that are not obvious: it
   * ends any friendship, and it hides both records from each other.
   */
  blockMember(): void {
    this.confirm(
      {
        title: 'Block Member',
        message: `
          <p>Block <strong>${this.username}</strong>?</p>
          <p>Any friendship or pending request between you ends, neither of
          you can send the other a request, and you disappear from each
          other's registry records. They are not told.</p>`,
        confirmText: 'Block',
      },
      () =>
        this.runAction(
          this._communityService.blockMember({ username: this.username }),
          `${this.username} was blocked.`,
          'Something went wrong blocking that member.',
        ),
    );
  }

  /**
   * Lifts the viewer's block on this member.
   */
  unblockMember(): void {
    const blockId = this.profile?.relationship?.blockId;
    if (!blockId) {
      return;
    }

    this.confirm(
      {
        title: 'Unblock Member',
        message: `
          <p>Unblock <strong>${this.username}</strong>?</p>
          <p>You will be able to see each other in the registry again, but any
          friendship the block ended is not restored.</p>`,
        confirmText: 'Unblock',
      },
      () =>
        this.runAction(
          this._communityService.unblockMember(blockId),
          `${this.username} was unblocked.`,
          'Something went wrong unblocking that member.',
        ),
    );
  }

  // ----- Reporting -----

  /**
   * Reports this member to the site's administrators.
   *
   * Unlike the friend and block actions this asks for a reason first: an
   * administrator who was not there needs the reporter's account of what
   * happened to act on it.
   */
  reportMember(): void {
    const dialogRef = this._dialog.open<
      ReportMemberDialogComponent,
      { username: string },
      ReportMemberDialogResult
    >(ReportMemberDialogComponent, {
      width: '75%',
      data: { username: this.username },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(result => {
        if (!result) {
          return;
        }

        this.runAction(
          this._moderationService.reportMember({
            username: this.username,
            reason: result.reason,
            details: result.details,
          }),
          'Your report has been sent to the administrators. Thank you.',
          'Something went wrong sending that report.',
          {
            [HttpStatusCode.Conflict]:
              'You have already reported this officer. That report is still ' +
              'awaiting review.',
          },
        );
      });
  }

  // ----- Helpers -----

  /**
   * Runs an action, then reloads the profile so the buttons reflect the new
   * relationship.
   *
   * @param source - The action to run.
   * @param successMessage - Copy shown when it succeeds.
   * @param failureMessage - Copy shown when it fails.
   * @param failureByStatus - Copy for particular response statuses, used where
   *   the reason for the failure is worth telling the viewer.
   */
  private runAction(
    source: Observable<unknown>,
    successMessage: string,
    failureMessage: string,
    failureByStatus: Record<number, string> = {},
  ): void {
    this.isActing = true;
    this.actionMessage = '';
    this.actionError = '';

    source.pipe(take(1), observeInZone(this._ngZone, this._cdr)).subscribe({
      next: () => {
        this.isActing = false;
        this.actionMessage = successMessage;
        this.loadProfile();
      },
      error: (error: unknown) => {
        this.isActing = false;
        this.actionError =
          (error instanceof HttpErrorResponse
            ? failureByStatus[error.status]
            : undefined) ?? failureMessage;
      },
    });
  }

  /**
   * Opens the LCARS confirmation dialog and runs the action if confirmed.
   *
   * @param data - The dialog copy.
   * @param onConfirm - Invoked when the viewer confirms.
   */
  private confirm(
    data: { title: string; message: string; confirmText: string },
    onConfirm: () => void,
  ): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: { ...data, cancelText: 'Cancel' },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(confirmed => {
        if (confirmed) {
          onConfirm();
        }
      });
  }

  /**
   * Builds the read-only account card for one of this member's accounts.
   *
   * @param account - The public account summary.
   * @returns The card presentation model.
   */
  private buildAccountVm(account: RegistryAccountSummary): RegistryAccountVm {
    const card = buildRegistryAccountCard(account, this.username);

    return {
      id: card.id,
      card,
      handle: account.handle,
      characterCount: account.publicCharacterCount,
      // Endeavour progress is never published, so there is nothing to order by;
      // the option is not offered and the value never consulted.
      endeavourTotalNodes: 0,
      accountCreatedDate: account.accountCreatedDate,
      // Pinning is the owner's private curation and is not published.
      pinned: false,
      filterFields: {
        searchHaystack: buildAccountSearchHaystack([
          account.handle,
          account.platformName,
          account.launcherName,
        ]),
        platformKey: account.platformName,
        launcherKey: account.launcherName,
        lifetimeSubscription: account.lifetimeSubscription,
        pinned: false,
      },
    };
  }

  /**
   * Clears every filter, leaving the ordering alone.
   */
  clearFilters(): void {
    this.searchText.set('');
    this.platformFilter.set('');
    this.launcherFilter.set('');
    this.lifetimeOnly.set(false);
  }

  /**
   * Sets the page title and social meta once the member has loaded.
   *
   * @param profile - The loaded member profile.
   */
  private applyProfileMeta(profile: RegistryProfile): void {
    this._pageTitleService.setTitle(profile.username);
    this._seoService.setPageMeta(
      profile.username,
      `${profile.username} in the Galactic Personnel Registry: ` +
        `${profile.publicAccountCount} account(s) and ` +
        `${profile.publicCharacterCount} captain(s).`,
      profile.profilePicture300 ?? undefined,
    );
  }
}
