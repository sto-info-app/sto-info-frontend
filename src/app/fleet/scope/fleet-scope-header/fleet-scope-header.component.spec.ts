import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FLEET_SCOPE_FLEET } from 'src/app/fleet/constants/fleet-scope.constants';
import { FleetScopeHeaderVm } from 'src/app/fleet/scope/fleet-scope-page.models';

import { FleetScopeHeaderComponent } from './fleet-scope-header.component';

/**
 * Builds a header to draw.
 *
 * @param overrides - Fields to override.
 * @returns The header presentation model.
 */
function header(
  overrides: Partial<FleetScopeHeaderVm> = {},
): FleetScopeHeaderVm {
  return {
    scope: FLEET_SCOPE_FLEET,
    name: 'Starfleet Command',
    platform: 'PC',
    communityName: 'United Federation Alliance',
    communityLink: ['/fleets', 'communities', 'united-federation-alliance'],
    banner: null,
    emblem: null,
    status: { label: 'Recruiting', modifier: 'recruiting' },
    facts: [{ label: 'Platform', value: 'PC' }],
    ...overrides,
  };
}

describe('FleetScopeHeaderComponent', () => {
  let fixture: ComponentFixture<FleetScopeHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetScopeHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /**
   * Renders the header.
   *
   * @param vm - What to draw.
   */
  function render(vm: FleetScopeHeaderVm): void {
    fixture = TestBed.createComponent(FleetScopeHeaderComponent);
    fixture.componentRef.setInput('vm', vm);
    fixture.detectChanges();
  }

  /**
   * Finds one element.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  it('draws the name with the spaces at its edges', () => {
    render(header({ name: ' Starfleet Command ' }));

    expect(find('.fleet-exact-name__core')?.textContent).toBe(
      'Starfleet Command',
    );
    expect(
      fixture.nativeElement.querySelectorAll('.fleet-exact-name__space'),
    ).toHaveLength(2);
  });

  // The head of the page is the directory's card (13 October 2026), with the
  // name as the page's heading and the kind of record on its block.
  it('heads the page with the name, and says what kind of record it is', () => {
    render(header());

    expect(find('h2 .fleet-exact-name__core')?.textContent).toBe(
      'Starfleet Command',
    );
    expect(
      find('.fleet-scope-card__heading app-fleet-scope-badge'),
    ).not.toBeNull();
    expect(
      find('.fleet-scope-card__heading app-fleet-scope-badge')?.textContent,
    ).toContain('Fleet');
  });

  it('links to the Community holding the record', () => {
    render(header());

    const link = find('.fleet-scope-card__community a') as HTMLAnchorElement;

    expect(link.textContent?.trim()).toBe('United Federation Alliance');
    expect(link.getAttribute('href')).toBe(
      '/fleets/communities/united-federation-alliance',
    );
  });

  it('names an unopenable Community without linking to it', () => {
    render(header({ communityLink: null }));

    expect(find('.fleet-scope-card__community a')).toBeNull();
    expect(find('.fleet-scope-card__community')?.textContent).toContain(
      'United Federation Alliance',
    );
  });

  it('names no Community on a Community’s own page', () => {
    render(header({ communityName: null, communityLink: null }));

    expect(find('.fleet-scope-card__community')).toBeNull();
  });

  it('shows the state in its own colour', () => {
    render(header());

    const state = find('.fleet-scope-card__status');

    expect(state?.textContent?.trim()).toBe('Recruiting');
    expect(state?.className).toContain('fleet-scope-card__status--recruiting');
  });

  // The platform is among a Fleet's facts, and the card already sets it out
  // with its icon, so it is said once.
  it('lists each fact against its label, the platform once', () => {
    render(
      header({
        facts: [
          { label: 'Roster last imported', value: '4 March 2015' },
          { label: 'Platform', value: 'PC' },
        ],
      }),
    );

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
      ['Community', 'United Federation Alliance'],
      ['Roster last imported', '4 March 2015'],
    ]);
  });

  describe('the pictures', () => {
    const banner = { url: 'https://images.test/banner', alt: 'A fleet yard' };
    const emblem = { url: 'https://images.test/emblem', alt: 'A badge' };

    it('draws the banner and the emblem it was given', () => {
      render(header({ banner, emblem }));

      expect(find('.fleet-scope-header__banner')?.getAttribute('src')).toBe(
        banner.url,
      );
      expect(find('.fleet-scope-card__emblem')?.getAttribute('alt')).toBe(
        emblem.alt,
      );
    });

    it('draws no banner where the scope has none', () => {
      render(header());

      expect(find('.fleet-scope-header__banner')).toBeNull();
    });

    it('drops the banner rather than showing a broken image', () => {
      render(header({ banner }));

      find('.fleet-scope-header__banner')?.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(find('.fleet-scope-header__banner')).toBeNull();
    });

    // A page whose address was replaced resolves a different record into the
    // same component, and a failure remembered from the last one would hide
    // a picture that is perfectly fine.
    it('tries again when a different record is resolved into it', () => {
      render(header({ banner, emblem }));

      find('.fleet-scope-header__banner')?.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      fixture.componentRef.setInput('vm', header({ banner, emblem }));
      fixture.detectChanges();

      expect(find('.fleet-scope-header__banner')).not.toBeNull();
    });
  });
});
