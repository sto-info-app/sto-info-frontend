import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { RelationshipStatus } from '../../models/community.models';
import { RegistryProfileSummary } from '../../models/registry.models';
import { buildProfileSummary } from '../registry-test-fixtures';
import { RegistryProfileCardComponent } from './registry-profile-card.component';

/**
 * Builds a member summary carrying a given relationship.
 *
 * @param status - The relationship the API reported.
 * @param friendshipId - The friendship row backing it, if any.
 * @returns A member summary.
 */
function withRelationship(
  status: RelationshipStatus,
  friendshipId: string | null = 'friendship-1',
): RegistryProfileSummary {
  return buildProfileSummary({
    relationship: { status, friendshipId, blockId: null },
  });
}

describe('RegistryProfileCardComponent', () => {
  let fixture: ComponentFixture<RegistryProfileCardComponent>;
  let component: RegistryProfileCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistryProfileCardComponent],
      providers: [
        provideRouter([]),
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
      ],
    }).compileComponents();
  });

  /**
   * Creates the card with the supplied member and runs change detection.
   *
   * @param profile - The member to render.
   */
  function render(profile: RegistryProfileSummary, canAct = false): void {
    fixture = TestBed.createComponent(RegistryProfileCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profile', profile);
    fixture.componentRef.setInput('canAct', canAct);
    fixture.detectChanges();
  }

  /**
   * The text of every action button on the card.
   *
   * @returns The button labels.
   */
  function actionLabels(): string[] {
    return [
      ...fixture.nativeElement.querySelectorAll(
        '.registry-profile-card__actions button',
      ),
    ].map((button: HTMLButtonElement) => button.textContent?.trim() ?? '');
  }

  it('should render the username and public counts', () => {
    render(buildProfileSummary());
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('captain.picard');
    expect(text).toContain('2');
    expect(text).toContain('11');
  });

  it('should render the joined date', () => {
    render(buildProfileSummary());

    expect(fixture.nativeElement.textContent).toContain('Joined');
  });

  it('should render the last seen date when present', () => {
    render(buildProfileSummary());

    expect(fixture.nativeElement.textContent).toContain('Last seen');
  });

  it('should omit the last seen date when the member never signed in', () => {
    render(buildProfileSummary({ lastActiveAt: null }));

    expect(fixture.nativeElement.textContent).not.toContain('Last seen');
  });

  it('should link to the public profile', () => {
    render(buildProfileSummary());

    expect(component.profileLink).toEqual([
      '/community/registry/profiles',
      'captain.picard',
    ]);
  });

  it('should leave the username raw for routerLink to encode', () => {
    render(buildProfileSummary({ username: 'a b/c' }));

    expect(component.profileLink).toEqual([
      '/community/registry/profiles',
      'a b/c',
    ]);
  });

  it('should render an avatar', () => {
    render(buildProfileSummary());

    expect(
      fixture.nativeElement.querySelector('app-entity-avatar'),
    ).toBeTruthy();
  });

  describe('relationship indicator', () => {
    it('should show no badge for an anonymous visitor', () => {
      render(buildProfileSummary());

      expect(component.relationship).toBeNull();
      expect(component.badge).toBeNull();
      expect(
        fixture.nativeElement.querySelector('.registry-profile-card__badge'),
      ).toBeNull();
    });

    it('should not reserve the badge row for an anonymous visitor', () => {
      render(buildProfileSummary());

      expect(component.showBadgeSlot).toBe(false);
      expect(
        fixture.nativeElement.querySelector(
          '.registry-profile-card__badge-slot',
        ),
      ).toBeNull();
    });

    it('should show no badge when there is no relationship', () => {
      render(withRelationship(RelationshipStatus.NONE), true);

      expect(component.badge).toBeNull();
    });

    it('should still reserve the badge row so signed-in cards stay aligned', () => {
      render(withRelationship(RelationshipStatus.NONE), true);

      expect(component.showBadgeSlot).toBe(true);
      expect(
        fixture.nativeElement.querySelector(
          '.registry-profile-card__badge-slot',
        ),
      ).toBeTruthy();
    });

    it('should flag a friend', () => {
      render(withRelationship(RelationshipStatus.FRIENDS), true);

      const badge = fixture.nativeElement.querySelector(
        '.registry-profile-card__badge',
      );
      expect(badge.textContent.trim()).toBe('Friend');
      expect(badge.className).toContain('registry-profile-card__badge--friend');
    });

    it('should flag the viewer own card', () => {
      render(withRelationship(RelationshipStatus.SELF, null), true);

      expect(
        fixture.nativeElement
          .querySelector('.registry-profile-card__badge')
          .textContent.trim(),
      ).toBe('You');
    });

    it('should flag a request the viewer sent', () => {
      render(withRelationship(RelationshipStatus.REQUEST_SENT), true);

      const badge = fixture.nativeElement.querySelector(
        '.registry-profile-card__badge',
      );
      expect(badge.textContent.trim()).toBe('Request sent');
      expect(badge.className).toContain(
        'registry-profile-card__badge--pending',
      );
    });

    it('should flag a request the viewer received', () => {
      render(withRelationship(RelationshipStatus.REQUEST_RECEIVED), true);

      expect(
        fixture.nativeElement
          .querySelector('.registry-profile-card__badge')
          .textContent.trim(),
      ).toBe('Wants to be friends');
    });

    it('should show a badge even when the viewer cannot act', () => {
      render(withRelationship(RelationshipStatus.FRIENDS), false);

      expect(component.badge?.label).toBe('Friend');
    });
  });

  describe('call to action', () => {
    it('should offer nothing to an anonymous visitor', () => {
      render(withRelationship(RelationshipStatus.NONE), false);

      expect(component.showActions).toBe(false);
      expect(actionLabels()).toEqual([]);
    });

    it('should offer Add Friend and Block for an unrelated member', () => {
      render(withRelationship(RelationshipStatus.NONE), true);

      expect(actionLabels()).toEqual(['Add Friend', 'Block']);
    });

    it('should offer Accept and Block for a received request', () => {
      render(withRelationship(RelationshipStatus.REQUEST_RECEIVED), true);

      expect(actionLabels()).toEqual(['Accept', 'Block']);
    });

    it('should offer nothing on the viewer own card', () => {
      render(withRelationship(RelationshipStatus.SELF, null), true);

      expect(actionLabels()).toEqual([]);
    });

    it('should offer Unfriend and Block for an existing friend', () => {
      render(withRelationship(RelationshipStatus.FRIENDS), true);

      expect(actionLabels()).toEqual(['Unfriend', 'Block']);
    });

    it('should emit the member when Unfriend is pressed', () => {
      const profile = withRelationship(RelationshipStatus.FRIENDS);
      render(profile, true);
      const emitted: RegistryProfileSummary[] = [];
      component.unfriend.subscribe(value => emitted.push(value));

      fixture.nativeElement
        .querySelectorAll('.registry-profile-card__actions button')[0]
        .click();

      expect(emitted).toEqual([profile]);
    });

    it('should not colour Unfriend and Block the same', () => {
      render(withRelationship(RelationshipStatus.FRIENDS), true);

      const classes = [
        ...fixture.nativeElement.querySelectorAll(
          '.registry-profile-card__actions button',
        ),
      ].map((button: HTMLButtonElement) => button.className);

      expect(classes[0]).toContain('african-violet');
      expect(classes[1]).toContain('cardinal');
    });

    it('should offer nothing while a request is pending', () => {
      render(withRelationship(RelationshipStatus.REQUEST_SENT), true);

      expect(actionLabels()).toEqual([]);
    });

    it('should emit the member when Add Friend is pressed', () => {
      const profile = withRelationship(RelationshipStatus.NONE);
      render(profile, true);
      const emitted: RegistryProfileSummary[] = [];
      component.addFriend.subscribe(value => emitted.push(value));

      fixture.nativeElement
        .querySelectorAll('.registry-profile-card__actions button')[0]
        .click();

      expect(emitted).toEqual([profile]);
    });

    it('should emit the member when Accept is pressed', () => {
      const profile = withRelationship(RelationshipStatus.REQUEST_RECEIVED);
      render(profile, true);
      const emitted: RegistryProfileSummary[] = [];
      component.acceptRequest.subscribe(value => emitted.push(value));

      fixture.nativeElement
        .querySelectorAll('.registry-profile-card__actions button')[0]
        .click();

      expect(emitted).toEqual([profile]);
    });

    it('should emit the member when Block is pressed', () => {
      const profile = withRelationship(RelationshipStatus.NONE);
      render(profile, true);
      const emitted: RegistryProfileSummary[] = [];
      component.blockMember.subscribe(value => emitted.push(value));

      fixture.nativeElement
        .querySelectorAll('.registry-profile-card__actions button')[1]
        .click();

      expect(emitted).toEqual([profile]);
    });

    it('should label each button with the member it acts on', () => {
      render(withRelationship(RelationshipStatus.NONE), true);

      const labels = [
        ...fixture.nativeElement.querySelectorAll(
          '.registry-profile-card__actions button',
        ),
      ].map((button: HTMLButtonElement) => button.getAttribute('aria-label'));

      expect(labels).toEqual([
        'Add captain.picard as a friend',
        'Block captain.picard',
      ]);
    });

    it('should disable the buttons while an action is in flight', () => {
      fixture = TestBed.createComponent(RegistryProfileCardComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput(
        'profile',
        withRelationship(RelationshipStatus.NONE),
      );
      fixture.componentRef.setInput('canAct', true);
      fixture.componentRef.setInput('isActing', true);
      fixture.detectChanges();

      const buttons = [
        ...fixture.nativeElement.querySelectorAll(
          '.registry-profile-card__actions button',
        ),
      ];
      expect(
        buttons.every((button: HTMLButtonElement) => button.disabled),
      ).toBe(true);
    });
  });
});
