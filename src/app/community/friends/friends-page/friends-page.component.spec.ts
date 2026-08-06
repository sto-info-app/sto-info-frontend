import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { CommunityService } from '../../community.service';
import {
  BlockedMember,
  CommunityMember,
  CommunitySummary,
  Friend,
  FriendRequest,
  FriendRequestDirection,
  PaginatedFriends,
} from '../../models/community.models';
import { FriendsPageComponent } from './friends-page.component';

/**
 * Builds a member summary fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A member summary.
 */
function buildMember(
  overrides: Partial<CommunityMember> = {},
): CommunityMember {
  return {
    username: 'captain.picard',
    profilePicture100: null,
    profilePicture300: null,
    joinedAt: '2026-01-14T09:21:00.000Z',
    lastActiveAt: null,
    publicAccountCount: 2,
    publicCharacterCount: 11,
    publiclyVisible: true,
    ...overrides,
  };
}

/**
 * Builds a friend fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A friend.
 */
function buildFriend(overrides: Partial<Friend> = {}): Friend {
  return {
    id: 'friendship-1',
    member: buildMember(),
    friendsSince: '2026-08-02T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Builds a friend request fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A friend request.
 */
function buildRequest(overrides: Partial<FriendRequest> = {}): FriendRequest {
  return {
    id: 'friendship-1',
    direction: FriendRequestDirection.INCOMING,
    member: buildMember(),
    requestedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Builds a blocked-member fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A blocked member.
 */
function buildBlocked(overrides: Partial<BlockedMember> = {}): BlockedMember {
  return {
    id: 'block-1',
    member: buildMember(),
    blockedAt: '2026-08-01T00:00:00.000Z',
    reason: null,
    ...overrides,
  };
}

/**
 * Builds a page of friends.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A paginated friend listing.
 */
function buildFriendPage(
  overrides: Partial<PaginatedFriends> = {},
): PaginatedFriends {
  return {
    items: [buildFriend()],
    total: 1,
    page: 1,
    pageSize: 12,
    ...overrides,
  };
}

const summary: CommunitySummary = {
  friendCount: 3,
  incomingRequestCount: 2,
  outgoingRequestCount: 1,
  blockedCount: 4,
};

describe('FriendsPageComponent', () => {
  let fixture: ComponentFixture<FriendsPageComponent>;
  let component: FriendsPageComponent;
  let communityServiceSpy: {
    getSummary: jest.Mock;
    getFriends: jest.Mock;
    removeFriend: jest.Mock;
    getFriendRequests: jest.Mock;
    acceptFriendRequest: jest.Mock;
    declineFriendRequest: jest.Mock;
    cancelFriendRequest: jest.Mock;
    getBlockedMembers: jest.Mock;
    unblockMember: jest.Mock;
  };
  let dialogSpy: { open: jest.Mock };
  let routerSpy: { navigate: jest.Mock };
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  /**
   * Configures the testing module and creates the component.
   *
   * @param params - The initial query parameters.
   */
  async function setup(params: Record<string, string> = {}) {
    queryParams = new BehaviorSubject(convertToParamMap(params));

    communityServiceSpy = {
      getSummary: jest.fn(() => of(summary)),
      getFriends: jest.fn(() => of(buildFriendPage())),
      removeFriend: jest.fn(() => of(undefined)),
      getFriendRequests: jest.fn(() => of([buildRequest()])),
      acceptFriendRequest: jest.fn(() => of(buildFriend())),
      declineFriendRequest: jest.fn(() => of(undefined)),
      cancelFriendRequest: jest.fn(() => of(undefined)),
      getBlockedMembers: jest.fn(() => of([buildBlocked()])),
      unblockMember: jest.fn(() => of(undefined)),
    };
    dialogSpy = { open: jest.fn(() => ({ afterClosed: () => of(true) })) };
    routerSpy = { navigate: jest.fn(() => Promise.resolve(true)) };

    await TestBed.configureTestingModule({
      imports: [FriendsPageComponent],
      providers: [
        { provide: CommunityService, useValue: communityServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParams.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FriendsPageComponent);
    component = fixture.componentInstance;
  }

  describe('tab selection', () => {
    it('should default to the friends tab', async () => {
      await setup();
      fixture.detectChanges();

      expect(component.tab).toBe('friends');
      expect(component.heading).toBe('Friends');
      expect(communityServiceSpy.getFriends).toHaveBeenCalled();
    });

    it('should open the tab named in the URL', async () => {
      await setup({ tab: 'blocked' });
      fixture.detectChanges();

      expect(component.tab).toBe('blocked');
      expect(communityServiceSpy.getBlockedMembers).toHaveBeenCalled();
    });

    it('should fall back to friends for an unknown tab', async () => {
      await setup({ tab: 'nonsense' });
      fixture.detectChanges();

      expect(component.tab).toBe('friends');
    });

    it('should load incoming requests for the incoming tab', async () => {
      await setup({ tab: 'incoming' });
      fixture.detectChanges();

      expect(communityServiceSpy.getFriendRequests).toHaveBeenCalledWith(
        FriendRequestDirection.INCOMING,
      );
      expect(component.heading).toBe('Requests Received');
    });

    it('should load outgoing requests for the outgoing tab', async () => {
      await setup({ tab: 'outgoing' });
      fixture.detectChanges();

      expect(communityServiceSpy.getFriendRequests).toHaveBeenCalledWith(
        FriendRequestDirection.OUTGOING,
      );
      expect(component.heading).toBe('Requests Sent');
    });

    it('should reflect a tab change in the URL', async () => {
      await setup();
      fixture.detectChanges();

      component.selectTab('incoming');

      expect(routerSpy.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { tab: 'incoming' } }),
      );
    });

    it('should clear the tab parameter when returning to friends', async () => {
      await setup({ tab: 'blocked' });
      fixture.detectChanges();

      component.selectTab('friends');

      expect(routerSpy.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: {} }),
      );
    });

    it('should reload when the URL changes under it', async () => {
      await setup();
      fixture.detectChanges();

      queryParams.next(convertToParamMap({ tab: 'blocked' }));
      fixture.detectChanges();

      expect(component.tab).toBe('blocked');
      expect(communityServiceSpy.getBlockedMembers).toHaveBeenCalled();
    });
  });

  describe('friend list', () => {
    it('should render each friend with the date they were added', async () => {
      await setup();
      fixture.detectChanges();

      expect(component.friends).toHaveLength(1);
      expect(fixture.nativeElement.textContent).toContain('captain.picard');
      expect(fixture.nativeElement.textContent).toContain('Friends since');
    });

    it('should treat a missing page as empty', async () => {
      await setup();
      communityServiceSpy.getFriends.mockReturnValue(of(undefined));
      queryParams.next(convertToParamMap({}));
      fixture.detectChanges();

      expect(component.friends).toEqual([]);
      expect(component.total).toBe(0);
    });

    it('should link a friend who is still publicly visible', async () => {
      await setup();
      fixture.detectChanges();

      const link = fixture.nativeElement.querySelector('.member-row a');
      expect(link).toBeTruthy();
      expect(component.profileLink(buildMember())).toEqual([
        '/community/registry/profiles',
        'captain.picard',
      ]);
    });

    it('should not link a friend who has gone private', async () => {
      await setup();
      communityServiceSpy.getFriends.mockReturnValue(
        of(
          buildFriendPage({
            items: [
              buildFriend({ member: buildMember({ publiclyVisible: false }) }),
            ],
          }),
        ),
      );
      queryParams.next(convertToParamMap({}));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.member-row a')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('captain.picard');
    });

    it('should hide the friends-since line when the date is missing', async () => {
      await setup();
      communityServiceSpy.getFriends.mockReturnValue(
        of(buildFriendPage({ items: [buildFriend({ friendsSince: null })] })),
      );
      queryParams.next(convertToParamMap({}));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Friends since');
    });

    it('should show the empty state when the viewer has no friends', async () => {
      await setup();
      communityServiceSpy.getFriends.mockReturnValue(
        of(buildFriendPage({ items: [], total: 0 })),
      );
      queryParams.next(convertToParamMap({}));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'You have not added any friends yet.',
      );
    });

    it('should page through the friend list', async () => {
      await setup();
      communityServiceSpy.getFriends.mockReturnValue(
        of(buildFriendPage({ total: 30 })),
      );
      queryParams.next(convertToParamMap({}));
      fixture.detectChanges();

      expect(component.totalPages).toBe(3);

      component.loadPage(2);

      expect(communityServiceSpy.getFriends).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });

  describe('search', () => {
    it('should seed the search box from the URL and send the term', async () => {
      await setup({ q: 'picard' });
      fixture.detectChanges();

      expect(component.searchTerm).toBe('picard');
      expect(communityServiceSpy.getFriends).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'picard' }),
      );
    });

    it('should omit an empty search term', async () => {
      await setup();
      fixture.detectChanges();

      expect(communityServiceSpy.getFriends).toHaveBeenCalledWith(
        expect.objectContaining({ search: undefined }),
      );
    });

    it('should reflect the search term in the URL', async () => {
      await setup();
      fixture.detectChanges();
      component.searchTerm = '  picard  ';

      component.search();

      expect(routerSpy.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { q: 'picard' } }),
      );
    });

    it('should clear the search term from the URL', async () => {
      await setup({ q: 'picard' });
      fixture.detectChanges();

      component.clearSearch();

      expect(component.searchTerm).toBe('');
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: {} }),
      );
    });
  });

  describe('requests', () => {
    it('should treat a missing response as empty', async () => {
      await setup({ tab: 'incoming' });
      communityServiceSpy.getFriendRequests.mockReturnValue(of(undefined));
      queryParams.next(convertToParamMap({ tab: 'incoming' }));
      fixture.detectChanges();

      expect(component.requests).toEqual([]);
    });

    it('should not link a requester who has gone private', async () => {
      await setup({ tab: 'incoming' });
      communityServiceSpy.getFriendRequests.mockReturnValue(
        of([buildRequest({ member: buildMember({ publiclyVisible: false }) })]),
      );
      queryParams.next(convertToParamMap({ tab: 'incoming' }));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.member-row a')).toBeNull();
    });

    it('should accept a request without asking for confirmation', async () => {
      await setup({ tab: 'incoming' });
      fixture.detectChanges();

      component.acceptRequest(buildRequest());

      expect(dialogSpy.open).not.toHaveBeenCalled();
      expect(communityServiceSpy.acceptFriendRequest).toHaveBeenCalledWith(
        'friendship-1',
      );
      expect(component.successMessage).toContain('are now friends');
    });

    it('should confirm before declining a request', async () => {
      await setup({ tab: 'incoming' });
      fixture.detectChanges();

      component.declineRequest(buildRequest());

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(communityServiceSpy.declineFriendRequest).toHaveBeenCalledWith(
        'friendship-1',
      );
    });

    it('should confirm before withdrawing a request', async () => {
      await setup({ tab: 'outgoing' });
      fixture.detectChanges();

      component.cancelRequest(
        buildRequest({ direction: FriendRequestDirection.OUTGOING }),
      );

      expect(communityServiceSpy.cancelFriendRequest).toHaveBeenCalledWith(
        'friendship-1',
      );
    });

    it('should do nothing when the confirmation is dismissed', async () => {
      await setup({ tab: 'incoming' });
      dialogSpy.open.mockReturnValue({ afterClosed: () => of(false) });
      fixture.detectChanges();

      component.declineRequest(buildRequest());

      expect(communityServiceSpy.declineFriendRequest).not.toHaveBeenCalled();
    });
  });

  describe('blocked list', () => {
    it('should treat a missing response as empty', async () => {
      await setup({ tab: 'blocked' });
      communityServiceSpy.getBlockedMembers.mockReturnValue(of(undefined));
      queryParams.next(convertToParamMap({ tab: 'blocked' }));
      fixture.detectChanges();

      expect(component.blocked).toEqual([]);
    });

    it('should show the private note when one was left', async () => {
      await setup({ tab: 'blocked' });
      communityServiceSpy.getBlockedMembers.mockReturnValue(
        of([buildBlocked({ reason: 'Harassment' })]),
      );
      queryParams.next(convertToParamMap({ tab: 'blocked' }));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Note: Harassment');
    });

    it('should never link a blocked member profile', async () => {
      await setup({ tab: 'blocked' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.member-row a')).toBeNull();
    });

    it('should confirm before unblocking', async () => {
      await setup({ tab: 'blocked' });
      fixture.detectChanges();

      component.unblockMember(buildBlocked());

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(communityServiceSpy.unblockMember).toHaveBeenCalledWith('block-1');
    });
  });

  describe('removing a friend', () => {
    it('should confirm, then remove and reload', async () => {
      await setup();
      fixture.detectChanges();
      communityServiceSpy.getFriends.mockClear();

      component.removeFriend(buildFriend());

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(communityServiceSpy.removeFriend).toHaveBeenCalledWith(
        'friendship-1',
      );
      expect(communityServiceSpy.getFriends).toHaveBeenCalled();
      expect(communityServiceSpy.getSummary).toHaveBeenCalled();
    });
  });

  describe('failure handling', () => {
    it('should show a transport error when the server is unreachable', async () => {
      await setup();
      communityServiceSpy.getFriends.mockReturnValue(
        throwError(() => ({ status: 0 })),
      );
      queryParams.next(convertToParamMap({}));
      fixture.detectChanges();

      expect(component.errorMessage).toBe(
        'Unable to reach the server. Please try again later.',
      );
    });

    it('should show list-specific copy for other failures', async () => {
      await setup();
      communityServiceSpy.getFriends.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );
      queryParams.next(convertToParamMap({}));
      fixture.detectChanges();

      expect(component.errorMessage).toBe(
        'Something went wrong loading your friends.',
      );
    });

    it('should report a failed request load', async () => {
      await setup({ tab: 'incoming' });
      communityServiceSpy.getFriendRequests.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );
      queryParams.next(convertToParamMap({ tab: 'incoming' }));
      fixture.detectChanges();

      expect(component.errorMessage).toBe(
        'Something went wrong loading your friend requests.',
      );
    });

    it('should report a failed blocked-list load', async () => {
      await setup({ tab: 'blocked' });
      communityServiceSpy.getBlockedMembers.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );
      queryParams.next(convertToParamMap({ tab: 'blocked' }));
      fixture.detectChanges();

      expect(component.errorMessage).toBe(
        'Something went wrong loading your blocked members.',
      );
    });

    it('should report a failed action without clearing the list', async () => {
      await setup();
      fixture.detectChanges();
      communityServiceSpy.removeFriend.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );

      component.removeFriend(buildFriend());

      expect(component.errorMessage).toBe(
        'Something went wrong removing that friend.',
      );
      expect(component.friends).toHaveLength(1);
    });

    it('should keep the last known counts when the summary fails', async () => {
      await setup();
      communityServiceSpy.getSummary.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );
      fixture.detectChanges();

      expect(component.summary.friendCount).toBe(0);
      expect(component.errorMessage).toBe('');
    });
  });

  describe('tab badges', () => {
    it('should show the counts from the summary', async () => {
      await setup();
      fixture.detectChanges();

      expect(component.summary).toEqual(summary);
      const badges = fixture.nativeElement.querySelectorAll(
        '#friends-side-column .header-count-badge',
      );
      expect(badges).toHaveLength(4);
    });

    it('should omit a badge for a zero count', async () => {
      await setup();
      communityServiceSpy.getSummary.mockReturnValue(
        of({
          friendCount: 0,
          incomingRequestCount: 0,
          outgoingRequestCount: 0,
          blockedCount: 0,
        }),
      );
      fixture.detectChanges();

      const badges = fixture.nativeElement.querySelectorAll(
        '#friends-side-column .header-count-badge',
      );
      expect(badges).toHaveLength(0);
    });
  });

  it('should delegate route links to the routing service', async () => {
    await setup();
    fixture.detectChanges();

    expect(component.getRouteLink('community')).toBe('/community');
  });
});
