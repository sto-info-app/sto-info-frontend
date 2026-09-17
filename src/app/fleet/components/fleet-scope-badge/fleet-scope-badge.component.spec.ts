import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  FLEET_SCOPE_ARMADA,
  FLEET_SCOPE_COMMUNITY,
  FLEET_SCOPE_FLEET,
  FleetScopeType,
} from 'src/app/fleet/constants/fleet-scope.constants';

import { FleetScopeBadgeComponent } from './fleet-scope-badge.component';

describe('FleetScopeBadgeComponent', () => {
  let fixture: ComponentFixture<FleetScopeBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetScopeBadgeComponent],
    }).compileComponents();
  });

  /**
   * Renders the badge.
   *
   * @param scope - The scope to draw.
   * @param platform - The platform, where there is one.
   */
  function render(scope: FleetScopeType, platform: string | null = null): void {
    fixture = TestBed.createComponent(FleetScopeBadgeComponent);
    fixture.componentRef.setInput('scope', scope);
    fixture.componentRef.setInput('platform', platform);
    fixture.detectChanges();
  }

  /**
   * The badge element.
   *
   * @returns The badge.
   */
  const badge = (): HTMLElement =>
    fixture.nativeElement.querySelector('.fleet-scope-badge') as HTMLElement;

  it.each([
    [FLEET_SCOPE_COMMUNITY, 'Community', 'fa-people-group'],
    [FLEET_SCOPE_FLEET, 'Fleet', 'fa-rocket-launch'],
    [FLEET_SCOPE_ARMADA, 'Armada', 'fa-layer-group'],
  ])('names and draws %s', (scope, label, icon) => {
    render(scope);

    expect(badge().textContent).toContain(label);
    expect(fixture.nativeElement.querySelector(`i.${icon}`)).not.toBeNull();
  });

  // The whole reason the scope is said in words: a reader who cannot separate
  // two mid-tone blues still gets three distinguishable badges.
  it('tells the three scopes apart by their labels, not their colour', () => {
    const labels = [
      FLEET_SCOPE_COMMUNITY,
      FLEET_SCOPE_FLEET,
      FLEET_SCOPE_ARMADA,
    ].map(scope => {
      render(scope);

      return badge().textContent?.trim();
    });

    expect(new Set(labels).size).toBe(3);
  });

  it('shows the platform as part of the badge', () => {
    render(FLEET_SCOPE_FLEET, 'PC');

    expect(
      fixture.nativeElement.querySelector('.fleet-scope-badge__platform')
        ?.textContent,
    ).toContain('PC');
  });

  it('omits the platform half for a Community, which spans all of them', () => {
    render(FLEET_SCOPE_COMMUNITY);

    expect(
      fixture.nativeElement.querySelector('.fleet-scope-badge__platform'),
    ).toBeNull();
  });

  // Without one label over the whole badge, a screen reader announces "Fleet"
  // and "PC" as two unrelated fragments.
  it('reads out as one phrase', () => {
    render(FLEET_SCOPE_FLEET, 'Xbox');

    expect(badge().getAttribute('aria-label')).toBe('Fleet on Xbox');
  });

  it('reads out as the scope alone when there is no platform', () => {
    render(FLEET_SCOPE_ARMADA);

    expect(badge().getAttribute('aria-label')).toBe('Armada');
  });

  // The icon repeats what the label already says, so announcing it would be
  // the badge read twice.
  it('hides the icon from assistive technology', () => {
    render(FLEET_SCOPE_FLEET);

    expect(
      fixture.nativeElement.querySelector('i')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });
});
