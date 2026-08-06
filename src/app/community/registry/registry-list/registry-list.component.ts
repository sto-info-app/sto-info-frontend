import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, take } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { MemberCardComponent } from 'src/app/shared/components/member-card/member-card.component';
import { MemberCardVm } from 'src/app/shared/components/member-card/member-card.model';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { CommunityService } from '../../community.service';
import { CommunityTabsComponent } from '../../community-tabs/community-tabs.component';
import {
  MEMBER_CARD_ACCEPT_REQUEST,
  MEMBER_CARD_ADD_FRIEND,
  MEMBER_CARD_BLOCK,
  MEMBER_CARD_UNFRIEND,
  buildRegistryMemberCard,
} from '../../member-card.builders';
import {
  RegistryListMode,
  RegistryProfileSummary,
  RegistrySort,
} from '../../models/registry.models';
import { RegistryPageBaseDirective } from '../registry-page-base.directive';
import { RegistryService } from '../registry.service';

const PAGE_SIZE = 12;

/**
 * A listed member alongside the card built for them.
 */
export interface RegistryProfileVm {
  /** Stable identity for list tracking. */
  id: string;
  /** The member the card represents. */
  profile: RegistryProfileSummary;
  /** Presentation model handed to the shared member card. */
  card: MemberCardVm;
}

/**
 * Copy and sort order for each list mode.
 */
const MODE_CONFIG: Record<
  RegistryListMode,
  { heading: string; intro: string; sort: RegistrySort; empty: string }
> = {
  all: {
    heading: 'Profiles',
    intro: 'Every officer who has opened their record to the fleet.',
    sort: RegistrySort.USERNAME,
    empty: 'No officers have opened their records yet.',
  },
  search: {
    heading: 'Search the Registry',
    intro: 'Search for an officer by their STO Info username.',
    sort: RegistrySort.USERNAME,
    empty: 'No officers match that search.',
  },
  'recently-joined': {
    heading: 'Recently Joined',
    intro: 'The newest officers to open their records to the fleet.',
    sort: RegistrySort.RECENTLY_JOINED,
    empty: 'No officers have opened their records yet.',
  },
  'recently-active': {
    heading: 'Recently Active',
    intro: 'Officers seen most recently on station.',
    sort: RegistrySort.RECENTLY_ACTIVE,
    empty: 'No officers have opened their records yet.',
  },
};

/**
 * The registry's list pages — Search, Recently Joined, Recently Active and the
 * full profile browse. All four share this component and differ only by the
 * `mode` supplied in route data.
 */
@Component({
  selector: 'app-registry-list',
  templateUrl: './registry-list.component.html',
  styleUrls: ['./registry-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
    MemberCardComponent,
    CommunityTabsComponent,
  ],
})
export class RegistryListComponent
  extends RegistryPageBaseDirective
  implements OnInit
{
  private readonly _registryService = inject(RegistryService);
  private readonly _communityService = inject(CommunityService);
  private readonly _authService = inject(AuthService);
  private readonly _dialog = inject(MatDialog);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);

  mode: RegistryListMode = 'all';
  searchTerm = '';

  profiles: RegistryProfileSummary[] = [];

  /** Precomputed card rows for the listed members. */
  profileVms: RegistryProfileVm[] = [];

  page = 1;
  total = 0;

  /** Copy shown after a friend or block action succeeds. */
  actionMessage = '';

  /** Copy shown when a friend or block action fails. */
  actionError = '';

  /** Set while an action is in flight, so every card's buttons disable. */
  isActing = false;

  /**
   * Reads the list mode from route data, seeds the search box from the URL and
   * loads the first page.
   */
  ngOnInit(): void {
    this.mode =
      (this._route.snapshot.data['mode'] as RegistryListMode) ?? 'all';

    if (this.mode === 'search') {
      this.searchTerm = this._route.snapshot.queryParamMap.get('q') ?? '';
    }

    this.loadPage(1);
  }

  /**
   * Loads a specific page of registry members.
   *
   * @param page - The 1-based page number.
   */
  loadPage(page: number): void {
    this.page = page;

    this.runLoad(
      this._registryService.getProfiles({
        page,
        pageSize: PAGE_SIZE,
        sort: MODE_CONFIG[this.mode].sort,
        search: this.activeSearch,
      }),
      result => {
        this.profiles = result?.items ?? [];
        this.total = result?.total ?? 0;
        this.profileVms = this.profiles.map(profile => ({
          id: profile.username,
          profile,
          card: buildRegistryMemberCard(profile, this.canAct),
        }));
      },
      'Something went wrong loading the registry.',
    );
  }

  /**
   * Runs a search, resetting to the first page and reflecting the term in the
   * URL so the result is shareable.
   */
  search(): void {
    const term = this.searchTerm.trim();

    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: term ? { q: term } : {},
      replaceUrl: true,
    });

    this.loadPage(1);
  }

  /**
   * Clears the search term and reloads the unfiltered first page.
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.search();
  }

  // ----- Friend and block actions -----

  /**
   * Whether the viewer is signed in, and so can act on the listed members.
   *
   * @returns True when signed in.
   */
  get canAct(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * Routes a member card action to the matching handler.
   *
   * @param profile - The member the card represents.
   * @param actionKey - The key emitted by the card.
   */
  onMemberCardAction(profile: RegistryProfileSummary, actionKey: string): void {
    switch (actionKey) {
      case MEMBER_CARD_ADD_FRIEND:
        this.addFriend(profile);
        return;

      case MEMBER_CARD_ACCEPT_REQUEST:
        this.acceptRequest(profile);
        return;

      case MEMBER_CARD_UNFRIEND:
        this.unfriend(profile);
        return;

      case MEMBER_CARD_BLOCK:
        this.blockMember(profile);
    }
  }

  /**
   * Sends a friend request to a listed member.
   *
   * @param profile - The member to add.
   */
  addFriend(profile: RegistryProfileSummary): void {
    this.runAction(
      this._communityService.sendFriendRequest({
        username: profile.username,
      }),
      `Friend request sent to ${profile.username}.`,
      'Something went wrong sending that friend request.',
    );
  }

  /**
   * Accepts the request a listed member sent the viewer.
   *
   * @param profile - The member whose request to accept.
   */
  acceptRequest(profile: RegistryProfileSummary): void {
    const friendshipId = profile.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.runAction(
      this._communityService.acceptFriendRequest(friendshipId),
      `You and ${profile.username} are now friends.`,
      'Something went wrong accepting that request.',
    );
  }

  /**
   * Ends the friendship with a listed member, after confirmation.
   *
   * @param profile - The friend to remove.
   */
  unfriend(profile: RegistryProfileSummary): void {
    const friendshipId = profile.relationship?.friendshipId;
    if (!friendshipId) {
      return;
    }

    this.confirm(
      {
        title: 'Unfriend Member',
        message: `
          <p>Remove <strong>${profile.username}</strong> from your
          friends?</p>
          <p>They are not told, they stay visible in the registry, and either
          of you may ask again later.</p>`,
        confirmText: 'Unfriend',
      },
      () =>
        this.runAction(
          this._communityService.removeFriend(friendshipId),
          `${profile.username} was removed from your friends.`,
          'Something went wrong removing that friend.',
        ),
    );
  }

  /**
   * Blocks a listed member, after confirmation.
   *
   * @param profile - The member to block.
   */
  blockMember(profile: RegistryProfileSummary): void {
    this.confirm(
      {
        title: 'Block Member',
        message: `
          <p>Block <strong>${profile.username}</strong>?</p>
          <p>Any friendship or pending request between you ends, neither of
          you can send the other a request, and you disappear from each
          other's registry records. They are not told.</p>`,
        confirmText: 'Block',
      },
      () =>
        this.runAction(
          this._communityService.blockMember({ username: profile.username }),
          `${profile.username} was blocked.`,
          'Something went wrong blocking that member.',
        ),
    );
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
   * Runs an action, then reloads the page so the indicators and buttons match
   * the new relationship — and so a member the viewer just blocked drops out
   * of the listing.
   *
   * @param source - The action to run.
   * @param successMessage - Copy shown when it succeeds.
   * @param failureMessage - Copy shown when it fails.
   */
  private runAction(
    source: Observable<unknown>,
    successMessage: string,
    failureMessage: string,
  ): void {
    this.isActing = true;
    this.actionMessage = '';
    this.actionError = '';

    source.pipe(take(1), observeInZone(this._ngZone, this._cdr)).subscribe({
      next: () => {
        this.isActing = false;
        this.actionMessage = successMessage;
        this.loadPage(this.page);
      },
      error: () => {
        this.isActing = false;
        this.actionError = failureMessage;
      },
    });
  }

  /**
   * The search term to send to the API, if this mode searches at all.
   *
   * @returns The trimmed term, or undefined when not searching.
   */
  private get activeSearch(): string | undefined {
    if (this.mode !== 'search') {
      return undefined;
    }

    return this.searchTerm.trim() || undefined;
  }

  /**
   * The page heading for the active mode.
   *
   * @returns The heading text.
   */
  get heading(): string {
    return MODE_CONFIG[this.mode].heading;
  }

  /**
   * The introductory copy for the active mode.
   *
   * @returns The intro text.
   */
  get intro(): string {
    return MODE_CONFIG[this.mode].intro;
  }

  /**
   * The empty-state copy for the active mode.
   *
   * @returns The empty-state text.
   */
  get emptyMessage(): string {
    return MODE_CONFIG[this.mode].empty;
  }

  /**
   * Total number of pages for the current query.
   *
   * @returns The page count (at least 1).
   */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / PAGE_SIZE));
  }
}
