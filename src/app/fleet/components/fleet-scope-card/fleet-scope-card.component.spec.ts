import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  FLEET_SCOPE_COMMUNITY,
  FLEET_SCOPE_FLEET,
} from 'src/app/fleet/constants/fleet-scope.constants';

import { SRC_PHOTO_UNAVAILABLE_300PX } from 'src/app/shared/constants/app-image-assets.constants';

import { FleetScopeCardComponent } from './fleet-scope-card.component';
import { FleetScopeCardVm } from './fleet-scope-card.model';

/**
 * Builds a card presentation model fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A card presentation model.
 */
function buildVm(overrides: Partial<FleetScopeCardVm> = {}): FleetScopeCardVm {
  return {
    id: 'fleet-1',
    scope: FLEET_SCOPE_FLEET,
    emblem: null,
    name: 'Starfleet Command',
    communityName: 'United Federation Alliance',
    platform: 'PC',
    link: ['/fleets', 'united-federation-alliance', 'pc', 'starfleet-command'],
    unlinkedTitle: 'This Fleet is not open to visitors.',
    status: { label: 'Recruiting', modifier: 'recruiting' },
    roster: 'Imported 4 March 2015',
    meta: ['128 members'],
    actions: [],
    ...overrides,
  };
}

describe('FleetScopeCardComponent', () => {
  let fixture: ComponentFixture<FleetScopeCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetScopeCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /**
   * Renders the card.
   *
   * @param vm - The card to draw.
   * @param isActing - Whether an action is in flight.
   */
  function render(vm: FleetScopeCardVm, isActing = false): void {
    fixture = TestBed.createComponent(FleetScopeCardComponent);
    fixture.componentRef.setInput('vm', vm);
    fixture.componentRef.setInput('isActing', isActing);
    fixture.detectChanges();
  }

  /**
   * Finds one element on the card.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  /**
   * The card's whole text.
   *
   * @returns The text content.
   */
  const text = (): string => fixture.nativeElement.textContent as string;

  /**
   * Every action button on the card.
   *
   * @returns The buttons.
   */
  const buttons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button'));

  // What the card is for: two Communities may each register a Fleet called
  // Starfleet Command, and a reader has to be able to pick the right one.
  it('shows everything that tells two registrations of one name apart', () => {
    render(buildVm());

    expect(text()).toContain('Starfleet Command');
    expect(text()).toContain('United Federation Alliance');
    expect(text()).toContain('PC');
    expect(text()).toContain('Imported 4 March 2015');
  });

  // Label over value, as the admin member cards set out a member.
  // The directories list one kind each, so a card does not say which kind it
  // is (13 October 2026).
  it('sets each detail out under its label', () => {
    render(buildVm());

    const details = Array.from(
      fixture.nativeElement.querySelectorAll('.fleet-scope-card__detail'),
      (detail: Element) => [
        detail.querySelector('dt')?.textContent?.trim(),
        detail.querySelector('dd')?.textContent?.trim(),
      ],
    );

    expect(details).toEqual([
      ['Platform', 'PC'],
      ['Status', 'Recruiting'],
      ['Roster', 'Imported 4 March 2015'],
      ['Community', 'United Federation Alliance'],
    ]);
  });

  // The platform and the state each show an icon, and the card carries the
  // account list's art for its platform (13 October 2026).
  it('draws an icon beside the platform and the state', () => {
    render(buildVm());

    const icons = Array.from(
      fixture.nativeElement.querySelectorAll('.fleet-scope-card__detail dd i'),
      (icon: Element) => icon.className,
    );

    expect(icons).toEqual(['fab fa-windows', 'fa-solid fa-user-plus']);
    expect(find('.fleet-scope-card__backdrop')?.getAttribute('src')).toBe(
      '/assets/account-types/account_type_windows_default.jpg',
    );
  });

  it('draws no icon for a platform or a state it has none for', () => {
    render(
      buildVm({
        platform: 'Holodeck',
        status: { label: 'Mothballed', modifier: 'mothballed' },
      }),
    );

    expect(
      fixture.nativeElement.querySelectorAll('.fleet-scope-card__detail dd i'),
    ).toHaveLength(0);
    expect(find('.fleet-scope-card__backdrop')?.getAttribute('src')).toBe(
      '/assets/account-types/account_type_default.jpg',
    );
  });

  // The character listings' picture for a missing portrait, as decoration.
  it('stands the unavailable picture where a missing emblem would be', () => {
    render(buildVm({ emblem: null, status: null }));

    const stand = find(
      '.fleet-scope-card__emblem--unavailable',
    ) as HTMLImageElement | null;

    expect(stand?.getAttribute('src')).toBe(SRC_PHOTO_UNAVAILABLE_300PX);
    expect(stand?.getAttribute('alt')).toBe('');
  });

  // A name is evidence, not a label: two Fleets whose names differ only in
  // their spacing are two Fleets, and a directory that tidies them is a
  // directory in which one cannot be found.
  it('renders the name exactly as recorded, edge spaces marked', () => {
    render(buildVm({ name: '  Starfleet   Command  ' }));

    // The spaces between the words stay in the text, where they are visible
    // as gaps. The four at the ends are drawn as marks instead, because HTML
    // would otherwise collapse them to nothing.
    expect(find('.fleet-exact-name__core')?.textContent).toBe(
      'Starfleet   Command',
    );
    expect(
      fixture.nativeElement.querySelectorAll('.fleet-exact-name__space'),
    ).toHaveLength(4);
  });

  // A Fleet name comes from a CSV somebody uploaded.
  it('renders a name containing markup as text', () => {
    render(buildVm({ name: '<img src="x" onerror="alert(1)">' }));

    expect(find('.fleet-scope-card__name img')).toBeNull();
    expect(text()).toContain('<img');
  });

  it('omits the parent Community on a Community card', () => {
    render(buildVm({ scope: FLEET_SCOPE_COMMUNITY, communityName: null }));

    expect(find('.fleet-scope-card__community')).toBeNull();
  });

  it('links to the record when the viewer may open it', () => {
    render(buildVm());

    expect(find('a.fleet-scope-card__link')).not.toBeNull();
  });

  // The narrow column an account card carries down its right, with the one
  // control that opens the record (13 October 2026).
  it('opens the record from its right-hand column, named by its kind', () => {
    render(buildVm());

    const view = find(
      '.fleet-scope-card__controls a',
    ) as HTMLAnchorElement | null;
    const name = find('.fleet-scope-card__name');

    expect(view?.getAttribute('href')).toBe(
      '/fleets/united-federation-alliance/pc/starfleet-command',
    );
    expect(view?.getAttribute('aria-label')).toBe('View Fleet');
    expect(view?.title).toBe('View Fleet');
    expect(view?.getAttribute('aria-describedby')).toBe(name?.id);
  });

  it('has no column to open a record that cannot be opened', () => {
    render(buildVm({ link: null }));

    expect(find('.fleet-scope-card__controls')).toBeNull();
  });

  it('says why an unopenable record cannot be opened', () => {
    render(buildVm({ link: null }));

    expect(find('a.fleet-scope-card__link')).toBeNull();
    expect(find('.fleet-scope-card__link')?.getAttribute('title')).toBe(
      'This Fleet is not open to visitors.',
    );
  });

  it('shows the state pill', () => {
    render(buildVm());

    const status = find('.fleet-scope-card__status');

    expect(status?.textContent).toContain('Recruiting');
    expect(
      status?.classList.contains('fleet-scope-card__status--recruiting'),
    ).toBe(true);
  });

  it('leaves the pill out when there is nothing to say about state', () => {
    render(buildVm({ status: null }));

    expect(find('.fleet-scope-card__status')).toBeNull();
  });

  it('leaves the observation line out when nothing has been seen', () => {
    render(buildVm({ roster: null }));

    expect(find('.fleet-scope-card__roster')).toBeNull();
  });

  it('lists the secondary lines', () => {
    render(buildVm({ meta: ['128 members', 'Tier 5'] }));

    expect(
      fixture.nativeElement.querySelectorAll('.fleet-scope-card__meta'),
    ).toHaveLength(2);
  });

  describe('actions', () => {
    const vm = (): FleetScopeCardVm =>
      buildVm({
        actions: [
          {
            key: 'apply',
            label: 'Apply',
            colourClass: 'sky',
            ariaLabel: 'Apply to Starfleet Command',
          },
        ],
      });

    // The card says which button was pressed; the page decides what that
    // means, so confirmation and reloading stay in one place.
    it('reports the action rather than performing it', () => {
      render(vm());
      const emitted: string[] = [];
      fixture.componentInstance.action.subscribe(key => emitted.push(key));

      buttons()[0].click();

      expect(emitted).toEqual(['apply']);
    });

    // A directory is a column of buttons all reading "Apply".
    it('names the Fleet each button acts on', () => {
      render(vm());

      expect(buttons()[0].getAttribute('aria-label')).toBe(
        'Apply to Starfleet Command',
      );
    });

    it('uses the shared pill rather than a local button', () => {
      render(vm());

      expect(buttons()[0].classList.contains('lcars-btn')).toBe(true);
      expect(buttons()[0].classList.contains('sky')).toBe(true);
    });

    it('disables every button while an action is in flight', () => {
      render(vm(), true);

      expect(buttons()[0].disabled).toBe(true);
    });

    it('draws no action row for a read-only listing', () => {
      render(buildVm());

      expect(find('.fleet-scope-card__actions')).toBeNull();
    });
  });
  describe('the emblem', () => {
    /**
     * The emblem image, when one is drawn.
     *
     * @returns The image, or null.
     */
    const emblem = (): HTMLImageElement | null =>
      find(
        '.fleet-scope-card__emblem:not(.fleet-scope-card__emblem--unavailable)',
      ) as HTMLImageElement | null;

    it('draws the emblem it was given, with its description', () => {
      render(
        buildVm({
          emblem: {
            url: 'https://images.test/emblem/square100',
            alt: 'A crossed-sabres badge',
          },
        }),
      );

      expect(emblem()?.getAttribute('src')).toBe(
        'https://images.test/emblem/square100',
      );
      expect(emblem()?.getAttribute('alt')).toBe('A crossed-sabres badge');
    });

    it('draws no emblem where a scope has none', () => {
      render(buildVm({ emblem: null }));

      expect(emblem()).toBeNull();
    });

    it('shows the unavailable picture rather than a broken image', () => {
      render(buildVm({ emblem: { url: 'https://images.test/gone', alt: '' } }));

      emblem()?.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(emblem()).toBeNull();
      expect(find('.fleet-scope-card__emblem--unavailable')).not.toBeNull();
    });

    it('tries again when the card is reused for another record', () => {
      render(buildVm({ emblem: { url: 'https://images.test/gone', alt: '' } }));

      emblem()?.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      fixture.componentRef.setInput(
        'vm',
        buildVm({
          id: 'fleet-2',
          emblem: { url: 'https://images.test/other', alt: 'Another badge' },
        }),
      );
      fixture.detectChanges();

      expect(emblem()?.getAttribute('src')).toBe('https://images.test/other');
    });
  });
});
