import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import { FleetInvestigation } from 'src/app/models/fleet-governance.models';

import { FleetInvestigationLogComponent } from './fleet-investigation-log.component';

/**
 * A look into a Fleet.
 *
 * @param overrides - What differs.
 * @returns The look.
 */
const lookOf = (
  overrides: Partial<FleetInvestigation> = {},
): FleetInvestigation => ({
  id: 'look-1',
  communityId: 'community-1',
  communityName: 'Fixture Community',
  communitySlug: 'fixture',
  fleetId: 'fleet-1',
  fleetName: 'Fixture Fleet',
  fleetSlug: 'fixture-fleet',
  platformName: 'Windows',
  platformSegment: 'windows',
  admin: { userId: 'admin-1', username: 'Quark' },
  purpose: 'Checking an import',
  createdAt: '2026-09-29T10:00:00.000Z',
  expiresAt: '2026-09-30T10:00:00.000Z',
  active: true,
  ...overrides,
});

describe('FleetInvestigationLogComponent', () => {
  let fixture: ComponentFixture<FleetInvestigationLogComponent>;
  let governance: { investigations: jest.Mock };

  beforeEach(() => {
    governance = {
      investigations: jest.fn(() =>
        of({
          items: [
            lookOf(),
            lookOf({
              id: 'look-2',
              active: false,
              admin: null,
              communityName: null,
              communitySlug: null,
            }),
            lookOf({
              id: 'look-3',
              admin: { userId: 'admin-2', username: null },
              communitySlug: null,
            }),
          ],
          total: 45,
          page: 1,
          pageSize: 20,
        }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [FleetInvestigationLogComponent],
      providers: [
        provideRouter([]),
        { provide: FleetGovernanceService, useValue: governance },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'UTC' },
        },
      ],
    });
  });

  /** Shows the page. */
  const show = async () => {
    fixture = TestBed.createComponent(FleetInvestigationLogComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  };
  const text = () =>
    (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ??
    '';
  const button = (label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      each => each.textContent?.trim() === label,
    ) as HTMLButtonElement;

  it('lists every look, linking to the Fleet while one is open', async () => {
    await show();

    const links = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody a'),
    ];

    expect(text()).toContain('Quark');
    expect(text()).toContain('An account since closed');
    expect(text()).toContain('An account with no username');
    expect(text()).toContain('a Community since gone');
    expect(text()).toContain('ended');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe(
      '/fleets/communities/fixture/fleets/windows/fixture-fleet/investigate',
    );
  });

  it('pages through the log', async () => {
    await show();

    expect(text()).toContain('Page 1 of 3');
    expect(button('Newer').disabled).toBe(true);

    button('Older').click();
    await fixture.whenStable();
    expect(governance.investigations).toHaveBeenLastCalledWith(2);

    button('Newer').click();
    expect(governance.investigations).toHaveBeenLastCalledWith(1);
  });

  it('says when nobody has looked, or the log cannot be read', async () => {
    governance.investigations.mockReturnValue(
      of({ items: [], total: 0, page: 1, pageSize: 20 }),
    );
    await show();
    expect(text()).toContain('Nobody has looked into a Fleet yet.');

    governance.investigations.mockReturnValue(
      throwError(() => new Error('down')),
    );
    await show();
    expect(text()).toContain('The log could not be read.');
  });
});
