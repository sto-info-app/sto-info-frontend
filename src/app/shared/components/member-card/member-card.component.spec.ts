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
    online: false,
    siteDetails: [{ label: 'Joined', value: 'January 14, 2026' }],
    gameDetails: [
      { label: 'Accounts', value: '2' },
      { label: 'Captains', value: '11' },
    ],
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
   * Finds one element in the card.
   *
   * @param selector - What to find.
   * @returns The element, or null.
   */
  function find<T extends Element>(selector: string): T | null {
    return (fixture.nativeElement as HTMLElement).querySelector<T>(selector);
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
      expect(find('app-entity-avatar')).toBeTruthy();
    });

    it('should link a member whose record can be opened', () => {
      render(buildVm());

      const link = find<HTMLAnchorElement>('a.member-card__link');

      expect(link?.getAttribute('href')).toBe(
        '/community/registry/profiles/captain.picard',
      );
    });

    it('should carry the username alone on the heading block', () => {
      render(buildVm());

      expect(find('.member-card__heading')?.textContent?.trim()).toBe(
        'captain.picard',
      );
      expect(find('.member-card__heading app-entity-avatar')).toBeNull();
      expect(find('.member-card__body app-entity-avatar')).toBeTruthy();
    });

    it('should not link a member whose record has gone private', () => {
      render(buildVm({ link: null }));

      expect(find('a')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('captain.picard');
    });

    it('should explain why a private record cannot be opened', () => {
      render(buildVm({ link: null }));

      expect(find('.member-card__heading')?.getAttribute('title')).toBe(
        'This officer has made their record private.',
      );
    });

    it('should carry no such explanation on a record that opens', () => {
      render(buildVm());

      expect(find('.member-card__heading')?.getAttribute('title')).toBeNull();
    });
  });

  // The shape of an account card (27 October 2026): the avatar square at the
  // left, the details beside it, and the chevron that opens the record down
  // the right.
  describe('body', () => {
    it('should set the avatar square beside the details', () => {
      render(buildVm());

      expect(find('.member-card__mark .entity-avatar--square')).toBeTruthy();
    });

    it('should render each detail as a label and value, the site’s column first', () => {
      render(buildVm());

      const columns = [
        ...fixture.nativeElement.querySelectorAll('.member-card__details'),
      ].map((column: HTMLElement) =>
        [...column.querySelectorAll('dt, dd')].map(cell =>
          cell.textContent?.trim(),
        ),
      );

      expect(columns).toEqual([
        ['Joined', 'January 14, 2026'],
        ['Accounts', '2', 'Captains', '11'],
      ]);
    });

    it('should draw only the column that has something to say', () => {
      render(buildVm({ siteDetails: [] }));

      expect(
        fixture.nativeElement.querySelectorAll('.member-card__details'),
      ).toHaveLength(1);
    });

    it('should omit the details when there is nothing to say', () => {
      render(buildVm({ siteDetails: [], gameDetails: [] }));

      expect(find('.member-card__columns')).toBeNull();
    });

    it('should open the record from the chevron, named for its reader', () => {
      render(buildVm());

      const view = find<HTMLAnchorElement>('.member-card__view');

      expect(view?.getAttribute('href')).toBe(
        '/community/registry/profiles/captain.picard',
      );
      expect(view?.getAttribute('aria-label')).toBe('View captain.picard');
      expect(view?.getAttribute('title')).toBe('View captain.picard');
      expect(view?.querySelector('i')?.className).toBe(
        'fa-solid fa-chevron-right',
      );
    });

    it('should offer no chevron for a record that cannot be opened', () => {
      render(buildVm({ link: null }));

      expect(find('.member-card__controls')).toBeNull();
    });
  });

  // FC-034: a green dot beside the name while the member is online.
  describe('presence', () => {
    it('should mark a member who is online with a dot beside the name', () => {
      render(buildVm({ online: true }));

      const dot = find('.member-card__identity svg.member-card__online');

      expect(dot?.getAttribute('aria-label')).toBe('Online');
      expect(dot?.querySelector('title')?.textContent).toBe('Online');
    });

    it('should show no dot for a member who is not online to the viewer', () => {
      render(buildVm());

      expect(find('.member-card__online')).toBeNull();
    });
  });

  describe('badge', () => {
    it('should render the badge at the end of the heading block', () => {
      render(buildVm({ badge: { label: 'Friend', modifier: 'friend' } }));

      const badge = find('.member-card__heading .member-card__badge');

      expect(badge?.textContent?.trim()).toBe('Friend');
      expect(badge?.className).toContain('member-card__badge--friend');
    });

    it('should render no badge when there is nothing to say', () => {
      render(buildVm());

      expect(find('.member-card__badge')).toBeNull();
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

    it('should render no actions strip when there is nothing to offer', () => {
      render(buildVm());

      expect(find('.member-card__actions')).toBeNull();
      expect(actionLabels()).toEqual([]);
    });

    it('should render a button per action, in order, in a strip under the body', () => {
      render(buildVm({ actions: [unfriend, block] }));

      expect(actionLabels()).toEqual(['Unfriend', 'Block']);
      expect(find('.member-card__body')?.nextElementSibling?.className).toBe(
        'member-card__actions',
      );
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
