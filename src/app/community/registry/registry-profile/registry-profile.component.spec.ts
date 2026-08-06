import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { CommunityService } from '../../community.service';
import {
  Relationship,
  RelationshipStatus,
} from '../../models/community.models';
import { buildAccountSummary, buildProfile } from '../registry-test-fixtures';
import { RegistryService } from '../registry.service';
import { RegistryProfileComponent } from './registry-profile.component';

/**
 * Builds a relationship fixture.
 *
 * @param status - The relationship status.
 * @param overrides - Row IDs to override on the fixture.
 * @returns A relationship.
 */
function buildRelationship(
  status: RelationshipStatus,
  overrides: Partial<Relationship> = {},
): Relationship {
  return {
    status,
    friendshipId: 'friendship-1',
    blockId: 'block-1',
    ...overrides,
  };
}

describe('RegistryProfileComponent', () => {
  let fixture: ComponentFixture<RegistryProfileComponent>;
  let component: RegistryProfileComponent;
  let registryServiceSpy: { getProfile: jest.Mock };
  let communityServiceSpy: {
    sendFriendRequest: jest.Mock;
    acceptFriendRequest: jest.Mock;
    declineFriendRequest: jest.Mock;
    cancelFriendRequest: jest.Mock;
    removeFriend: jest.Mock;
    blockMember: jest.Mock;
    unblockMember: jest.Mock;
  };
  let authServiceSpy: { isLoggedIn: jest.Mock };
  let dialogSpy: { open: jest.Mock };
  let seoSpy: { setPageMeta: jest.Mock };
  let pageTitleSpy: { setTitle: jest.Mock };

  /**
   * Configures the testing module and creates the component.
   *
   * @param username - The username route parameter.
   */
  async function setup(username: string | null = 'captain.picard') {
    registryServiceSpy = { getProfile: jest.fn(() => of(buildProfile())) };
    communityServiceSpy = {
      sendFriendRequest: jest.fn(() => of({})),
      acceptFriendRequest: jest.fn(() => of({})),
      declineFriendRequest: jest.fn(() => of(undefined)),
      cancelFriendRequest: jest.fn(() => of(undefined)),
      removeFriend: jest.fn(() => of(undefined)),
      blockMember: jest.fn(() => of({})),
      unblockMember: jest.fn(() => of(undefined)),
    };
    authServiceSpy = { isLoggedIn: jest.fn(() => false) };
    dialogSpy = { open: jest.fn(() => ({ afterClosed: () => of(true) })) };
    seoSpy = { setPageMeta: jest.fn() };
    pageTitleSpy = { setTitle: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RegistryProfileComponent],
      providers: [
        provideRouter([]),
        { provide: RegistryService, useValue: registryServiceSpy },
        { provide: CommunityService, useValue: communityServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SeoService, useValue: seoSpy },
        { provide: PageTitleService, useValue: pageTitleSpy },
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => username } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistryProfileComponent);
    component = fixture.componentInstance;
  }

  /**
   * Signs the viewer in and loads the profile with a given relationship.
   *
   * @param status - The relationship the API reports.
   * @param overrides - Row IDs to override on the relationship.
   */
  function signedInWith(
    status: RelationshipStatus,
    overrides: Partial<Relationship> = {},
  ): void {
    authServiceSpy.isLoggedIn.mockReturnValue(true);
    registryServiceSpy.getProfile.mockReturnValue(
      of(buildProfile({ relationship: buildRelationship(status, overrides) })),
    );
    fixture.detectChanges();
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('should request the member named in the route', async () => {
    await setup();
    fixture.detectChanges();

    expect(registryServiceSpy.getProfile).toHaveBeenCalledWith(
      'captain.picard',
    );
    expect(component.profile).not.toBeNull();
  });

  it('should fall back to an empty username when the route has none', async () => {
    await setup(null);
    fixture.detectChanges();

    expect(component.username).toBe('');
  });

  it('should set the page title and social meta once loaded', async () => {
    await setup();
    fixture.detectChanges();

    expect(pageTitleSpy.setTitle).toHaveBeenCalledWith('captain.picard');
    expect(seoSpy.setPageMeta).toHaveBeenCalledWith(
      'captain.picard',
      expect.stringContaining('2 account(s)'),
      'https://cdn.example.com/pic/square300',
    );
  });

  it('should omit the image when the member has no profile picture', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      of(buildProfile({ profilePicture300: null })),
    );
    fixture.detectChanges();

    expect(seoSpy.setPageMeta).toHaveBeenCalledWith(
      'captain.picard',
      expect.any(String),
      undefined,
    );
  });

  it('should show the not-found state on a 404', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      throwError(() => ({ status: 404 })),
    );
    fixture.detectChanges();

    expect(component.notFound).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Record not found');
  });

  it('should show an error banner on other failures', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );
    fixture.detectChanges();

    expect(component.errorMessage).toBe(
      'Something went wrong loading this profile.',
    );
    expect(
      fixture.nativeElement.querySelector('app-lcars-error-message'),
    ).toBeTruthy();
  });

  it('should render each of the member accounts', async () => {
    await setup();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-account-card');
    expect(cards).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('SteveX#1234');
  });

  it('should build read-only account cards with no actions or endeavour badge', async () => {
    await setup();
    fixture.detectChanges();

    expect(component.accountCards).toHaveLength(1);
    expect(component.accountCards[0].actions).toEqual([]);
    expect(component.accountCards[0].endeavour).toBeNull();
    expect(component.accountCards[0].link).toEqual([
      '/community/registry/profiles',
      'captain.picard',
      'SteveX~1234',
    ]);
  });

  it('should surface visibly labelled, non-personal detail rows', async () => {
    await setup();
    fixture.detectChanges();

    const details = component.accountCards[0].details;
    expect(details.map(detail => detail.label)).toEqual([
      'Platform',
      'Launcher',
      'Playing Since',
      'Lifetime Subscription',
    ]);
    expect(details.every(detail => detail.showLabel)).toBe(true);
  });

  it('should render the empty state when no accounts are public', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      of(buildProfile({ accounts: [] })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'has not made any accounts public',
    );
  });

  it('should hide optional account details when they are unset', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      of(
        buildProfile({
          accounts: [
            buildAccountSummary({
              platformName: null,
              launcherName: null,
              accountCreatedDate: null,
              lifetimeSubscription: false,
            }),
          ],
        }),
      ),
    );
    fixture.detectChanges();

    const labels = component.accountCards[0].details.map(
      detail => detail.label,
    );
    expect(labels).toEqual(['Lifetime Subscription']);
    expect(component.accountCards[0].lifetimeSubscription).toBe(false);
  });

  it('should hide the last-seen line for a member who never signed in', async () => {
    await setup();
    registryServiceSpy.getProfile.mockReturnValue(
      of(buildProfile({ lastActiveAt: null })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Last seen');
  });

  it('should leave account link segments raw for routerLink to encode', async () => {
    await setup('a b');
    registryServiceSpy.getProfile.mockReturnValue(
      of(buildProfile({ accounts: [buildAccountSummary({ slug: 'c/d' })] })),
    );
    fixture.detectChanges();

    expect(component.accountCards[0].link).toEqual([
      '/community/registry/profiles',
      'a b',
      'c/d',
    ]);
  });

  describe('officer actions panel', () => {
    it('should not offer any action to an anonymous visitor', async () => {
      await setup();
      fixture.detectChanges();

      expect(component.isLoggedIn).toBe(false);
      expect(component.relationship).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain(
        'Officer Actions',
      );
    });

    it('should not offer actions on the viewer own record', async () => {
      await setup();
      signedInWith(RelationshipStatus.SELF);

      expect(fixture.nativeElement.textContent).not.toContain(
        'Officer Actions',
      );
    });

    it('should offer Add Friend and Block when there is no relationship', async () => {
      await setup();
      signedInWith(RelationshipStatus.NONE);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Officer Actions');
      expect(text).toContain('Add Friend');
      expect(text).toContain('Block');
    });

    it('should offer to withdraw a request the viewer sent', async () => {
      await setup();
      signedInWith(RelationshipStatus.REQUEST_SENT);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('awaiting a reply');
      expect(text).toContain('Withdraw Request');
      expect(text).not.toContain('Add Friend');
    });

    it('should offer to accept or decline a request the viewer received', async () => {
      await setup();
      signedInWith(RelationshipStatus.REQUEST_RECEIVED);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Accept Request');
      expect(text).toContain('Decline Request');
    });

    it('should offer to remove an existing friend', async () => {
      await setup();
      signedInWith(RelationshipStatus.FRIENDS);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('is on your friends list');
      expect(text).toContain('Unfriend');
    });

    it('should offer only Unblock for a member the viewer blocked', async () => {
      await setup();
      signedInWith(RelationshipStatus.BLOCKED);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('You have blocked');
      expect(text).toContain('Unblock');
      expect(text).not.toContain('Add Friend');
    });
  });

  describe('friend actions', () => {
    it('should send a friend request and reload the profile', async () => {
      await setup();
      signedInWith(RelationshipStatus.NONE);
      registryServiceSpy.getProfile.mockClear();

      component.addFriend();

      expect(communityServiceSpy.sendFriendRequest).toHaveBeenCalledWith({
        username: 'captain.picard',
      });
      expect(component.actionMessage).toContain('Friend request sent');
      expect(registryServiceSpy.getProfile).toHaveBeenCalled();
    });

    it('should withdraw a sent request', async () => {
      await setup();
      signedInWith(RelationshipStatus.REQUEST_SENT);

      component.cancelRequest();

      expect(communityServiceSpy.cancelFriendRequest).toHaveBeenCalledWith(
        'friendship-1',
      );
    });

    it('should accept a received request without confirmation', async () => {
      await setup();
      signedInWith(RelationshipStatus.REQUEST_RECEIVED);

      component.acceptRequest();

      expect(dialogSpy.open).not.toHaveBeenCalled();
      expect(communityServiceSpy.acceptFriendRequest).toHaveBeenCalledWith(
        'friendship-1',
      );
    });

    it('should confirm before declining a received request', async () => {
      await setup();
      signedInWith(RelationshipStatus.REQUEST_RECEIVED);

      component.declineRequest();

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(communityServiceSpy.declineFriendRequest).toHaveBeenCalledWith(
        'friendship-1',
      );
    });

    it('should confirm before removing a friend', async () => {
      await setup();
      signedInWith(RelationshipStatus.FRIENDS);

      component.removeFriend();

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(communityServiceSpy.removeFriend).toHaveBeenCalledWith(
        'friendship-1',
      );
    });

    it('should do nothing when the confirmation is dismissed', async () => {
      await setup();
      dialogSpy.open.mockReturnValue({ afterClosed: () => of(false) });
      signedInWith(RelationshipStatus.FRIENDS);

      component.removeFriend();

      expect(communityServiceSpy.removeFriend).not.toHaveBeenCalled();
    });

    it('should ignore a friendship action when the API sent no row ID', async () => {
      await setup();
      signedInWith(RelationshipStatus.FRIENDS, { friendshipId: null });

      component.removeFriend();
      component.acceptRequest();
      component.declineRequest();
      component.cancelRequest();

      expect(communityServiceSpy.removeFriend).not.toHaveBeenCalled();
      expect(communityServiceSpy.acceptFriendRequest).not.toHaveBeenCalled();
      expect(communityServiceSpy.declineFriendRequest).not.toHaveBeenCalled();
      expect(communityServiceSpy.cancelFriendRequest).not.toHaveBeenCalled();
    });
  });

  describe('block actions', () => {
    it('should spell out the consequences before blocking', async () => {
      await setup();
      signedInWith(RelationshipStatus.NONE);

      component.blockMember();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.stringContaining('They are not told'),
          }),
        }),
      );
      expect(communityServiceSpy.blockMember).toHaveBeenCalledWith({
        username: 'captain.picard',
      });
    });

    it('should confirm before unblocking', async () => {
      await setup();
      signedInWith(RelationshipStatus.BLOCKED);

      component.unblockMember();

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(communityServiceSpy.unblockMember).toHaveBeenCalledWith('block-1');
    });

    it('should ignore an unblock when the API sent no block ID', async () => {
      await setup();
      signedInWith(RelationshipStatus.BLOCKED, { blockId: null });

      component.unblockMember();

      expect(communityServiceSpy.unblockMember).not.toHaveBeenCalled();
    });
  });

  describe('action feedback', () => {
    it('should show an error banner when an action fails', async () => {
      await setup();
      signedInWith(RelationshipStatus.NONE);
      communityServiceSpy.sendFriendRequest.mockReturnValue(
        throwError(() => ({ status: 403 })),
      );
      registryServiceSpy.getProfile.mockClear();

      component.addFriend();
      fixture.detectChanges();

      expect(component.actionError).toBe(
        'Something went wrong sending that friend request.',
      );
      expect(component.isActing).toBe(false);
      expect(registryServiceSpy.getProfile).not.toHaveBeenCalled();
    });

    it('should show a success banner when an action succeeds', async () => {
      await setup();
      signedInWith(RelationshipStatus.NONE);

      component.addFriend();
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('app-lcars-success-message'),
      ).toBeTruthy();
    });
  });
});
