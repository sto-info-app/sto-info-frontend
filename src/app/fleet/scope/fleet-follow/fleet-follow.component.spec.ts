import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of, Subject, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { CommunitySubscriptionService } from 'src/app/fleet/community-subscription.service';
import { FleetFollowVm } from 'src/app/fleet/scope/fleet-scope-page.models';
import {
  CommunityFollowState,
  FleetScopeRelationship,
} from 'src/app/models/fleet.models';

import { FleetFollowComponent } from './fleet-follow.component';

/**
 * Builds what the page hands the control.
 *
 * @param overrides - Fields to override.
 * @returns The view model.
 */
function vm(overrides: Partial<FleetFollowVm> = {}): FleetFollowVm {
  return {
    communityId: 'community-1',
    scopeNoun: 'Community',
    relationship: FleetScopeRelationship.NONE,
    isFollowing: false,
    followerCount: 4,
    ...overrides,
  };
}

describe('FleetFollowComponent', () => {
  let fixture: ComponentFixture<FleetFollowComponent>;
  let component: FleetFollowComponent;
  let subscriptions: { follow: jest.Mock; unfollow: jest.Mock };
  let authService: { isLoggedIn: jest.Mock };

  /** Everything the control currently says. */
  const text = (): string => fixture.nativeElement.textContent as string;

  /** The follow control, or null when there is none. */
  const button = (): HTMLButtonElement | null =>
    fixture.nativeElement.querySelector('button');

  /**
   * Renders the control with whatever the mocks are set to.
   *
   * @param value - What the page is handing it.
   */
  const render = (value: FleetFollowVm = vm()): void => {
    fixture = TestBed.createComponent(FleetFollowComponent);
    component = fixture.componentInstance;
    component.vm = value;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    subscriptions = {
      follow: jest.fn(() => of({ isFollowing: true, followerCount: 5 })),
      unfollow: jest.fn(() => of({ isFollowing: false, followerCount: 3 })),
    };
    authService = { isLoggedIn: jest.fn(() => true) };

    await TestBed.configureTestingModule({
      imports: [FleetFollowComponent],
      providers: [
        { provide: CommunitySubscriptionService, useValue: subscriptions },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('is defined', () => {
    render();

    expect(component).toBeDefined();
  });

  describe('when there is a Community to follow', () => {
    it('offers the control and says how many follow', () => {
      render();

      expect(button()?.textContent).toContain('Follow this Community');
      expect(text()).toContain('4 followers');
    });

    /**
     * One is not "1 followers". The count is the only thing anybody is told
     * about followers, so it is worth reading properly.
     */
    it('counts one follower in the singular', () => {
      render(vm({ followerCount: 1 }));

      expect(text()).toContain('1 follower');
      expect(text()).not.toContain('1 followers');
    });

    it('says none when nobody follows', () => {
      render(vm({ followerCount: 0 }));

      expect(text()).toContain('0 followers');
    });

    /**
     * Said beside the control rather than after it is pressed: somebody
     * deciding whether to follow is deciding what it costs them.
     */
    it('says what following does and does not do', () => {
      render();

      expect(text()).toContain('not a membership');
      expect(text()).toContain('opens no roster');
    });

    /**
     * A count and a Community are separate facts. A scope the server could
     * not resolve arrives with no count while the page still knows which
     * Community holds it, and a missing number is left out rather than
     * guessed at as nought.
     */
    it('leaves the count out when the server gave none', () => {
      render(vm({ followerCount: null }));

      expect(
        fixture.nativeElement.querySelector('.fleet-follow__count'),
      ).toBeNull();
      expect(button()).not.toBeNull();
    });

    it('offers to stop when the reader already follows', () => {
      render(vm({ isFollowing: true }));

      expect(button()?.textContent).toContain('Stop following');
    });
  });

  describe('following and stopping', () => {
    it('follows and takes the new count from the answer', () => {
      render();

      button()?.click();
      fixture.detectChanges();

      expect(subscriptions.follow).toHaveBeenCalledWith('community-1');
      expect(text()).toContain('5 followers');
      expect(button()?.textContent).toContain('Stop following');
    });

    it('stops following and takes the new count from the answer', () => {
      render(vm({ isFollowing: true }));

      button()?.click();
      fixture.detectChanges();

      expect(subscriptions.unfollow).toHaveBeenCalledWith('community-1');
      expect(text()).toContain('3 followers');
      expect(button()?.textContent).toContain('Follow this Community');
    });

    /**
     * A failure says what is still true, because the reader's next move
     * depends on it: "still following" and "not following yet" call for
     * opposite things.
     */
    it('says they are still following when stopping fails', () => {
      subscriptions.unfollow.mockReturnValue(throwError(() => new Error('no')));
      render(vm({ isFollowing: true }));

      button()?.click();
      fixture.detectChanges();

      expect(text()).toContain('still following');
      expect(button()?.textContent).toContain('Stop following');
    });

    it('says they are not following yet when following fails', () => {
      subscriptions.follow.mockReturnValue(throwError(() => new Error('no')));
      render();

      button()?.click();
      fixture.detectChanges();

      expect(text()).toContain('not following yet');
    });

    it('clears an earlier failure when the next one works', () => {
      subscriptions.follow.mockReturnValueOnce(
        throwError(() => new Error('no')),
      );
      render();

      button()?.click();
      fixture.detectChanges();

      expect(text()).toContain('not following yet');

      button()?.click();
      fixture.detectChanges();

      expect(text()).not.toContain('not following yet');
      expect(text()).toContain('5 followers');
    });

    /**
     * A second press while the first is in flight would send a second
     * request and then take the count from whichever answered last.
     */
    it('ignores a second press while one is in flight', () => {
      const pending = new Subject<CommunityFollowState>();

      subscriptions.follow.mockReturnValue(pending);
      render();

      button()?.click();
      fixture.detectChanges();
      button()?.click();

      expect(subscriptions.follow).toHaveBeenCalledTimes(1);

      pending.next({ isFollowing: true, followerCount: 5 });
      pending.complete();
    });

    it('disables the control while one is in flight', () => {
      subscriptions.follow.mockReturnValue(new Subject<CommunityFollowState>());
      render();

      button()?.click();
      fixture.detectChanges();

      expect(button()?.disabled).toBe(true);
    });
  });

  describe('what the reader is told about their standing', () => {
    it.each([
      [FleetScopeRelationship.MEMBER, 'approved member of this Community'],
      [FleetScopeRelationship.REQUESTED, 'waiting for an answer'],
      [FleetScopeRelationship.SUSPENDED, 'is suspended'],
    ])('says so for %s', (relationship, expected) => {
      render(vm({ relationship }));

      expect(text()).toContain(expected);
    });

    /**
     * The sentence names what the page is about. "A member of this Fleet"
     * and "a member of this Community" are different claims.
     */
    it('names the scope the page is about', () => {
      render(
        vm({
          relationship: FleetScopeRelationship.MEMBER,
          scopeNoun: 'Fleet',
        }),
      );

      expect(text()).toContain('approved member of this Fleet');
    });

    /**
     * Following says itself through the control, and somebody with no
     * relationship is told nothing rather than told they are nobody.
     */
    it.each([FleetScopeRelationship.NONE, FleetScopeRelationship.FOLLOWER])(
      'says nothing about standing for %s',
      relationship => {
        render(vm({ relationship }));

        expect(text()).not.toContain('member of this');
        expect(text()).not.toContain('suspended');
      },
    );
  });

  describe('when there is nothing to follow', () => {
    /**
     * A Fleet nobody has registered belongs to no Community, so there is no
     * feed to subscribe to — and "no followers" would be the wrong answer to
     * a question nobody can ask yet.
     */
    it('explains a Fleet with no Community instead of offering a control', () => {
      render(vm({ communityId: null, followerCount: null }));

      expect(text()).toContain('Following starts when a Community registers');
      expect(button()).toBeNull();
    });

    it('does nothing when asked to follow one anyway', () => {
      render(vm({ communityId: null, followerCount: null }));

      (component as unknown as { toggle(): void }).toggle();

      expect(subscriptions.follow).not.toHaveBeenCalled();
    });
  });

  describe('when nobody is signed in', () => {
    it('says what signing in is for, and offers no control', () => {
      authService.isLoggedIn.mockReturnValue(false);
      render();

      expect(text()).toContain('Sign in to follow');
      expect(button()).toBeNull();
    });

    it('still says how many follow', () => {
      authService.isLoggedIn.mockReturnValue(false);
      render();

      expect(text()).toContain('4 followers');
    });
  });

  /**
   * A page resolving to a different record replaces all of it, or a count
   * from the last one would be shown against this one.
   */
  it('starts again when the page resolves to another record', () => {
    render();

    button()?.click();
    fixture.detectChanges();

    expect(text()).toContain('5 followers');

    component.vm = vm({ communityId: 'community-2', followerCount: 9 });
    fixture.detectChanges();

    expect(text()).toContain('9 followers');
    expect(button()?.textContent).toContain('Follow this Community');
  });
});
