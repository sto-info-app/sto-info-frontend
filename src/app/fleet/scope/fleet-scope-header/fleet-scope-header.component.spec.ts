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

  it('says what kind of record it is, and on which platform', () => {
    render(header());

    expect(find('app-fleet-scope-badge')?.textContent).toContain('Fleet');
    expect(find('app-fleet-scope-badge')?.textContent).toContain('PC');
  });

  it('links to the Community holding the record', () => {
    render(header());

    const link = find('.fleet-scope-header__community a') as HTMLAnchorElement;

    expect(link.textContent?.trim()).toBe('United Federation Alliance');
    expect(link.getAttribute('href')).toBe(
      '/fleets/communities/united-federation-alliance',
    );
  });

  it('names an unopenable Community without linking to it', () => {
    render(header({ communityLink: null }));

    expect(find('.fleet-scope-header__community a')).toBeNull();
    expect(find('.fleet-scope-header__community')?.textContent).toContain(
      'United Federation Alliance',
    );
  });

  it('names no Community on a Community’s own page', () => {
    render(header({ communityName: null, communityLink: null }));

    expect(find('.fleet-scope-header__community')).toBeNull();
  });

  it('shows the state pill in its own colour', () => {
    render(header());

    const pill = find('.fleet-scope-header__status');

    expect(pill?.textContent?.trim()).toBe('Recruiting');
    expect(pill?.className).toContain('fleet-scope-header__status--recruiting');
  });

  it('shows no pill when there is nothing to say about state', () => {
    render(header({ status: null }));

    expect(find('.fleet-scope-header__status')).toBeNull();
  });

  it('lists each fact against its label', () => {
    render(
      header({
        facts: [
          { label: 'Roster last imported', value: '4 March 2015' },
          { label: 'Platform', value: 'PC' },
        ],
      }),
    );

    const labels = Array.from(fixture.nativeElement.querySelectorAll('dt')).map(
      node => (node as HTMLElement).textContent,
    );
    const values = Array.from(fixture.nativeElement.querySelectorAll('dd')).map(
      node => (node as HTMLElement).textContent,
    );

    expect(labels).toEqual(['Roster last imported', 'Platform']);
    expect(values).toEqual(['4 March 2015', 'PC']);
  });

  it('draws no fact list when there is nothing to list', () => {
    render(header({ facts: [] }));

    expect(find('.fleet-scope-header__facts')).toBeNull();
  });

  describe('the pictures', () => {
    const banner = { url: 'https://images.test/banner', alt: 'A fleet yard' };
    const emblem = { url: 'https://images.test/emblem', alt: 'A badge' };

    it('draws the banner and the emblem it was given', () => {
      render(header({ banner, emblem }));

      expect(find('.fleet-scope-header__banner')?.getAttribute('src')).toBe(
        banner.url,
      );
      expect(find('.fleet-scope-header__emblem')?.getAttribute('alt')).toBe(
        emblem.alt,
      );
    });

    it('draws nothing where the scope has no artwork', () => {
      render(header());

      expect(find('.fleet-scope-header__banner')).toBeNull();
      expect(find('.fleet-scope-header__emblem')).toBeNull();
    });

    it.each([
      ['banner', '.fleet-scope-header__banner'],
      ['emblem', '.fleet-scope-header__emblem'],
    ])('drops the %s rather than showing a broken image', (_name, selector) => {
      render(header({ banner, emblem }));

      find(selector)?.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(find(selector)).toBeNull();
    });

    // A page whose address was replaced resolves a different record into the
    // same component, and a failure remembered from the last one would hide
    // a picture that is perfectly fine.
    it('tries again when a different record is resolved into it', () => {
      render(header({ banner, emblem }));

      find('.fleet-scope-header__banner')?.dispatchEvent(new Event('error'));
      find('.fleet-scope-header__emblem')?.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      fixture.componentRef.setInput('vm', header({ banner, emblem }));
      fixture.detectChanges();

      expect(find('.fleet-scope-header__banner')).not.toBeNull();
      expect(find('.fleet-scope-header__emblem')).not.toBeNull();
    });
  });
});
