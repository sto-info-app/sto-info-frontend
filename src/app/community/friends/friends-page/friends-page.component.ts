import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, take } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { CommunityService } from '../../community.service';
import {
  BlockedMember,
  CommunityMember,
  CommunitySummary,
  Friend,
  FriendRequest,
  FriendRequestDirection,
  FriendsTab,
} from '../../models/community.models';
import { buildRegistryProfileLink } from '../../registry/registry-card.builders';

const PAGE_SIZE = 12;

/**
 * Heading and empty-state copy for each tab.
 */
const TAB_CONFIG: Record<FriendsTab, { heading: string; empty: string }> = {
  friends: {
    heading: 'Friends',
    empty: 'You have not added any friends yet.',
  },
  incoming: {
    heading: 'Requests Received',
    empty: 'No officer is waiting on your reply.',
  },
  outgoing: {
    heading: 'Requests Sent',
    empty: 'You have no requests awaiting a reply.',
  },
  blocked: {
    heading: 'Blocked',
    empty: 'You have not blocked anyone.',
  },
};

/**
 * The signed-in half of the community: the viewer's friends, the requests
 * waiting on either side, and the members they have blocked.
 *
 * All four lists share this page and differ only by the `tab` query parameter,
 * which is reflected in the URL so a tab is shareable and survives a reload.
 */
@Component({
  selector: 'app-friends-page',
  templateUrl: './friends-page.component.html',
  styleUrls: ['./friends-page.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class FriendsPageComponent implements OnInit {
  private readonly _communityService = inject(CommunityService);
  private readonly _routingService = inject(RoutingService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _dialog = inject(MatDialog);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;

  tab: FriendsTab = 'friends';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  friends: Friend[] = [];
  requests: FriendRequest[] = [];
  blocked: BlockedMember[] = [];

  searchTerm = '';
  page = 1;
  total = 0;

  summary: CommunitySummary = {
    friendCount: 0,
    incomingRequestCount: 0,
    outgoingRequestCount: 0,
    blockedCount: 0,
  };

  /**
   * Reads the active tab from the URL and loads it, keeping the two in step if
   * the viewer navigates with the back button.
   */
  ngOnInit(): void {
    this._route.queryParamMap
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe(params => {
        this.tab = this.toTab(params.get('tab'));
        this.searchTerm = params.get('q') ?? '';
        this.page = 1;
        this.load();
      });

    this.refreshSummary();
  }

  // ----- Navigation -----

  /**
   * Switches tab, reflecting the choice in the URL.
   *
   * @param tab - The tab to open.
   */
  selectTab(tab: FriendsTab): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: tab === 'friends' ? {} : { tab },
      replaceUrl: true,
    });
  }

  /**
   * Runs a friend search, resetting to the first page.
   */
  search(): void {
    const term = this.searchTerm.trim();

    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: term ? { q: term } : {},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Clears the friend search.
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.search();
  }

  /**
   * Loads a specific page of the friend list.
   *
   * @param page - The 1-based page number.
   */
  loadPage(page: number): void {
    this.page = page;
    this.load();
  }

  // ----- Loading -----

  /**
   * Loads whichever list the active tab shows.
   */
  private load(): void {
    if (this.tab === 'friends') {
      this.loadFriends();
      return;
    }

    if (this.tab === 'blocked') {
      this.loadBlocked();
      return;
    }

    this.loadRequests();
  }

  /**
   * Loads the current page of friends.
   */
  private loadFriends(): void {
    this.runLoad(
      this._communityService.getFriends({
        page: this.page,
        pageSize: PAGE_SIZE,
        search: this.searchTerm.trim() || undefined,
      }),
      result => {
        this.friends = result?.items ?? [];
        this.total = result?.total ?? 0;
      },
      'Something went wrong loading your friends.',
    );
  }

  /**
   * Loads the pending requests for the active direction.
   */
  private loadRequests(): void {
    const direction =
      this.tab === 'incoming'
        ? FriendRequestDirection.INCOMING
        : FriendRequestDirection.OUTGOING;

    this.runLoad(
      this._communityService.getFriendRequests(direction),
      requests => {
        this.requests = requests ?? [];
        this.total = this.requests.length;
      },
      'Something went wrong loading your friend requests.',
    );
  }

  /**
   * Loads the members the viewer has blocked.
   */
  private loadBlocked(): void {
    this.runLoad(
      this._communityService.getBlockedMembers(),
      blocked => {
        this.blocked = blocked ?? [];
        this.total = this.blocked.length;
      },
      'Something went wrong loading your blocked members.',
    );
  }

  /**
   * Refreshes the counts behind the tab badges.
   */
  private refreshSummary(): void {
    this._communityService
      .getSummary()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: summary => (this.summary = summary),
        error: () => {
          // The badges are decorative; a stale count is better than an error.
        },
      });
  }

  // ----- Actions -----

  /**
   * Accepts a request addressed to the viewer.
   *
   * @param request - The request to accept.
   */
  acceptRequest(request: FriendRequest): void {
    this.runAction(
      this._communityService.acceptFriendRequest(request.id),
      `You and ${request.member.username} are now friends.`,
      'Something went wrong accepting that request.',
    );
  }

  /**
   * Declines a request addressed to the viewer, after confirmation.
   *
   * @param request - The request to decline.
   */
  declineRequest(request: FriendRequest): void {
    this.confirm(
      {
        title: 'Decline Request',
        message: `
          <p>Decline the friend request from
          <strong>${request.member.username}</strong>?</p>
          <p>They are not told, and they may ask again later.</p>`,
        confirmText: 'Decline',
      },
      () =>
        this.runAction(
          this._communityService.declineFriendRequest(request.id),
          'Request declined.',
          'Something went wrong declining that request.',
        ),
    );
  }

  /**
   * Withdraws a request the viewer sent, after confirmation.
   *
   * @param request - The request to withdraw.
   */
  cancelRequest(request: FriendRequest): void {
    this.confirm(
      {
        title: 'Cancel Request',
        message: `
          <p>Withdraw your friend request to
          <strong>${request.member.username}</strong>?</p>`,
        confirmText: 'Withdraw',
      },
      () =>
        this.runAction(
          this._communityService.cancelFriendRequest(request.id),
          'Request withdrawn.',
          'Something went wrong withdrawing that request.',
        ),
    );
  }

  /**
   * Ends a friendship, after confirmation.
   *
   * @param friend - The friend to remove.
   */
  removeFriend(friend: Friend): void {
    this.confirm(
      {
        title: 'Remove Friend',
        message: `
          <p>Remove <strong>${friend.member.username}</strong> from your
          friends?</p>
          <p>They are not told, and either of you may ask again later.</p>`,
        confirmText: 'Remove',
      },
      () =>
        this.runAction(
          this._communityService.removeFriend(friend.id),
          `${friend.member.username} was removed from your friends.`,
          'Something went wrong removing that friend.',
        ),
    );
  }

  /**
   * Lifts a block, after confirmation.
   *
   * @param blockedMember - The block to lift.
   */
  unblockMember(blockedMember: BlockedMember): void {
    this.confirm(
      {
        title: 'Unblock Member',
        message: `
          <p>Unblock <strong>${blockedMember.member.username}</strong>?</p>
          <p>You will be able to see each other in the registry again, but
          any friendship the block ended is not restored.</p>`,
        confirmText: 'Unblock',
      },
      () =>
        this.runAction(
          this._communityService.unblockMember(blockedMember.id),
          `${blockedMember.member.username} was unblocked.`,
          'Something went wrong unblocking that member.',
        ),
    );
  }

  // ----- Presentation -----

  /**
   * The heading for the active tab.
   *
   * @returns The heading text.
   */
  get heading(): string {
    return TAB_CONFIG[this.tab].heading;
  }

  /**
   * The empty-state copy for the active tab.
   *
   * @returns The empty-state text.
   */
  get emptyMessage(): string {
    return TAB_CONFIG[this.tab].empty;
  }

  /**
   * Total number of friend pages for the current query.
   *
   * @returns The page count (at least 1).
   */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / PAGE_SIZE));
  }

  /**
   * The link to a member's public registry profile.
   *
   * @param member - The member.
   * @returns The profile router link segments.
   */
  profileLink(member: CommunityMember): string[] {
    return buildRegistryProfileLink(member.username);
  }

  /**
   * Builds a router link for a route constant.
   *
   * @param route - The route constant.
   * @returns The path string.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  // ----- Helpers -----

  /**
   * Normalises the `tab` query parameter onto a known tab.
   *
   * @param value - The raw query parameter.
   * @returns The tab to show, defaulting to friends.
   */
  private toTab(value: string | null): FriendsTab {
    const tabs: FriendsTab[] = ['friends', 'incoming', 'outgoing', 'blocked'];
    return tabs.includes(value as FriendsTab)
      ? (value as FriendsTab)
      : 'friends';
  }

  /**
   * Runs a list request through the shared load lifecycle.
   *
   * @param source - The request to run.
   * @param onNext - Handler invoked with the loaded value.
   * @param failureMessage - Copy shown when the request fails.
   */
  private runLoad<T>(
    source: Observable<T>,
    onNext: (value: T) => void,
    failureMessage: string,
  ): void {
    this.isLoading = true;
    this.errorMessage = '';

    source.pipe(take(1), observeInZone(this._ngZone, this._cdr)).subscribe({
      next: value => {
        onNext(value);
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.status === 0
            ? 'Unable to reach the server. Please try again later.'
            : failureMessage;
        this.isLoading = false;
      },
    });
  }

  /**
   * Runs a mutation, then reloads the active list and the tab counts so the
   * page reflects what the action actually changed.
   *
   * @param source - The mutation to run.
   * @param successMessage - Copy shown when it succeeds.
   * @param failureMessage - Copy shown when it fails.
   */
  private runAction(
    source: Observable<unknown>,
    successMessage: string,
    failureMessage: string,
  ): void {
    this.errorMessage = '';
    this.successMessage = '';

    source.pipe(take(1), observeInZone(this._ngZone, this._cdr)).subscribe({
      next: () => {
        this.successMessage = successMessage;
        this.load();
        this.refreshSummary();
      },
      error: () => (this.errorMessage = failureMessage),
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
}
