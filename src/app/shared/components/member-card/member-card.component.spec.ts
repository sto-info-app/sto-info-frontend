import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MemberCardComponent } from './member-card.component';
import { MemberCardVm } from './member-card.model';

/**
 * Builds a card presentation model fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A card presentation model.
 */
function buildVm(overrides: Partial<MemberCardVm> = {}): MemberCardVm {
  return {
    id: 'captain.picard',
    username: 'captain.picard',
    imageUrl: 'https://cdn.example.com/pic/square100',
    link: ['/community/registry/profiles', 'captain.picard'],
    unlinkedTitle: 'This officer has made their record private.',
    badge: null,
    reserveBadgeSlot: false,
    stats: [
      { label: 'Accounts', value: 2 },
      { label: 'Captains', value: 11 },
    ],
    meta: ['Joined January 14, 2026'],
    actions: [],
    ...overrides,
  };
}

describe('MemberCardComponent', () => {
  let fixture: ComponentFixture<MemberCardComponent>;
  let component: MemberCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /**
   * Creates the card with the supplied model and runs change detection.
   *
   * @param vm - The card to render.
   * @param isActing - Whether an action is in flight.
   */
  function render(vm: MemberCardVm, isActing = false): void {
    fixture = TestBed.createComponent(MemberCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vm', vm);
    fixture.componentRef.setInput('isActing', isActing);
    fixture.detectChanges();
  }

  /**
   * The text of every action button on the card.
   *
   * @returns The button labels.
   */
  function actionLabels(): string[] {
    return [
      ...fixture.nativeElement.querySelectorAll('.member-card__actions button'),
    ].map((button: HTMLButtonElement) => button.textContent?.trim() ?? '');
  }

  describe('identity', () => {
    it('should render the username and an avatar', () => {
      render(buildVm());

      expect(fixture.nativeElement.textContent).toContain('captain.picard');
      expect(
        fixture.nativeElement.querySelector('app-entity-avatar'),
      ).toBeTruthy();
    });

    it('should link a member whose record can be opened', () => {
      render(buildVm());

      const link = fixture.nativeElement.querySelector(
        'a.member-card__identity',
      );
      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe(
        '/community/registry/profiles/captain.picard',
      );
    });

    it('should not link a member whose record has gone private', () => {
      render(buildVm({ link: null }));

      expect(fixture.nativeElement.querySelector('a')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('captain.picard');
    });

    it('should explain why a private record cannot be opened', () => {
      render(buildVm({ link: null }));

      expect(
        fixture.nativeElement
          .querySelector('.member-card__identity')
          .getAttribute('title'),
      ).toBe('This officer has made their record private.');
    });
  });

  describe('body', () => {
    it('should render each stat as a label and value', () => {
      render(buildVm());

      const labels = [
        ...fixture.nativeElement.querySelectorAll('.member-card__stats dt'),
      ].map((label: HTMLElement) => label.textContent?.trim());
      const values = [
        ...fixture.nativeElement.querySelectorAll('.member-card__stats dd'),
      ].map((value: HTMLElement) => value.textContent?.trim());

      expect(labels).toEqual(['Accounts', 'Captains']);
      expect(values).toEqual(['2', '11']);
    });

    it('should omit the stats row when there is nothing to count', () => {
      render(buildVm({ stats: [] }));

      expect(
        fixture.nativeElement.querySelector('.member-card__stats'),
      ).toBeNull();
    });

    it('should render a line per meta entry', () => {
      render(
        buildVm({
          meta: ['Joined January 14, 2026', 'Last seen August 1, 2026'],
        }),
      );

      const meta = [
        ...fixture.nativeElement.querySelectorAll('.member-card__meta'),
      ].map((line: HTMLElement) => line.textContent?.trim());

      expect(meta).toEqual([
        'Joined January 14, 2026',
        'Last seen August 1, 2026',
      ]);
    });
  });

  describe('badge', () => {
    it('should render the badge it was given', () => {
      render(
        buildVm({
          reserveBadgeSlot: true,
          badge: { label: 'Friend', modifier: 'friend' },
        }),
      );

      const badge = fixture.nativeElement.querySelector('.member-card__badge');
      expect(badge.textContent.trim()).toBe('Friend');
      expect(badge.className).toContain('member-card__badge--friend');
    });

    it('should reserve the row when asked, so cards stay aligned', () => {
      render(buildVm({ reserveBadgeSlot: true }));

      expect(
        fixture.nativeElement.querySelector('.member-card__badge-slot'),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('.member-card__badge'),
      ).toBeNull();
    });

    it('should drop the row entirely when no card can carry a badge', () => {
      render(buildVm());

      expect(
        fixture.nativeElement.querySelector('.member-card__badge-slot'),
      ).toBeNull();
    });
  });

  describe('actions', () => {
    const unfriend = {
      key: 'unfriend',
      label: 'Unfriend',
      colourClass: 'african-violet',
      ariaLabel: 'Unfriend captain.picard',
    };
    const block = {
      key: 'block',
      label: 'Block',
      colourClass: 'cardinal',
      ariaLabel: 'Block captain.picard',
    };

    it('should render no actions row when there is nothing to offer', () => {
      render(buildVm());

      expect(
        fixture.nativeElement.querySelector('.member-card__actions'),
      ).toBeNull();
      expect(actionLabels()).toEqual([]);
    });

    it('should render a button per action, in order', () => {
      render(buildVm({ actions: [unfriend, block] }));

      expect(actionLabels()).toEqual(['Unfriend', 'Block']);
    });

    it('should colour each button as its action asks', () => {
      render(buildVm({ actions: [unfriend, block] }));

      const classes = [
        ...fixture.nativeElement.querySelectorAll(
          '.member-card__actions button',
        ),
      ].map((button: HTMLButtonElement) => button.className);

      expect(classes[0]).toContain('african-violet');
      expect(classes[1]).toContain('cardinal');
    });

    it('should label each button with the member it acts on', () => {
      render(buildVm({ actions: [unfriend, block] }));

      const labels = [
        ...fixture.nativeElement.querySelectorAll(
          '.member-card__actions button',
        ),
      ].map((button: HTMLButtonElement) => button.getAttribute('aria-label'));

      expect(labels).toEqual([
        'Unfriend captain.picard',
        'Block captain.picard',
      ]);
    });

    it('should emit the key of the button that was pressed', () => {
      render(buildVm({ actions: [unfriend, block] }));
      const emitted: string[] = [];
      component.action.subscribe(key => emitted.push(key));

      fixture.nativeElement
        .querySelectorAll('.member-card__actions button')[1]
        .click();

      expect(emitted).toEqual(['block']);
    });

    it('should disable the buttons while an action is in flight', () => {
      render(buildVm({ actions: [unfriend, block] }), true);

      const buttons = [
        ...fixture.nativeElement.querySelectorAll(
          '.member-card__actions button',
        ),
      ];

      expect(
        buttons.every((button: HTMLButtonElement) => button.disabled),
      ).toBe(true);
    });
  });
});
