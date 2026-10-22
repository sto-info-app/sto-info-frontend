import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';

import { FeatureSwitchesAdminService } from '../feature-switches/feature-switches-admin.service';
import { PublicationPauseAdminService } from '../publication-pause/publication-pause-admin.service';
import { SiteSettingsComponent } from './site-settings.component';

describe('SiteSettingsComponent (FC-054)', () => {
  let fixture: ComponentFixture<SiteSettingsComponent>;

  /**
   * The page as rendered.
   *
   * @returns Its element.
   */
  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteSettingsComponent],
      providers: [
        provideRouter([]),
        // The publication pause's own spec covers it (FC-042).
        {
          provide: PublicationPauseAdminService,
          useValue: {
            read: () =>
              of({
                paused: false,
                pausedAt: null,
                pausedByUserId: null,
                pausedByUsername: null,
                queuePaused: false,
                held: 0,
              }),
          },
        },
        // The feature switches' own spec covers them (FC-045).
        {
          provide: FeatureSwitchesAdminService,
          useValue: {
            list: () =>
              of([
                {
                  feature: 'FLEET_COMMUNITIES',
                  label: 'Fleet Communities',
                  isEnabled: true,
                  changedAt: null,
                  changedByUsername: null,
                  subFlags: [],
                },
                {
                  feature: 'STORYTIME',
                  label: 'Storytime',
                  isEnabled: false,
                  changedAt: null,
                  changedByUsername: null,
                  subFlags: [],
                },
              ]),
          },
        },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
        { provide: AuthService, useValue: { getUserId: () => 'admin-1' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteSettingsComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  // Publication first, then one panel a feature, all in the one rotating
  // grid, so each takes a colour of its own.
  it('draws Publication and then each feature as panels of one rotating grid', () => {
    const grid = page().querySelector('.site-settings__panels.lcars-rotate')!;
    const panels = [...grid.querySelectorAll('app-lcars-panel')];

    expect(grid.firstElementChild?.tagName.toLowerCase()).toBe(
      'app-publication-pause',
    );
    expect(
      panels.map(panel => panel.querySelector('h3')?.textContent?.trim()),
    ).toEqual(['Publication', 'Fleet Communities', 'Storytime']);
  });

  it('carries the Help link and the admin side navigation', () => {
    const help = page().querySelector('app-help-link');

    expect(help?.getAttribute('slug')).toBe('site-admin-features');
    expect(help?.getAttribute('label')).toBe('Help with Site Settings');
    expect(page().querySelector('app-admin-side-navigation')).not.toBeNull();
  });
});
