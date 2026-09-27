import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import {
  FleetReport,
  FleetReportView,
} from 'src/app/models/fleet-report.models';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

import {
  FleetTabsComponent,
  FleetTabsVm,
  fleetTabsVmOf,
} from './fleet-tabs.component';

const FLEET_HREF =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet';

/**
 * Builds the strip's view model for a reader holding some capabilities.
 *
 * @param capabilities - What they hold.
 * @returns The view model.
 */
function vm(...capabilities: string[]): FleetTabsVm {
  return {
    communityId: 'community-1',
    fleetId: 'fleet-1',
    communitySlug: 'united-federation-alliance',
    platformSegment: 'pc',
    fleetSlug: 'ninth-fleet',
    providesRoster: true,
    capabilities,
    roles: [],
  };
}

/**
 * The same, for a Fleet on a platform the game writes no roster export on.
 *
 * @param capabilities - What they hold.
 * @returns The view model.
 */
function consoleVm(...capabilities: string[]): FleetTabsVm {
  return { ...vm(...capabilities), providesRoster: false };
}

describe('FleetTabsComponent', () => {
  let fixture: ComponentFixture<FleetTabsComponent>;
  let reports: { visible: jest.Mock };

  beforeEach(async () => {
    reports = { visible: jest.fn(() => of([])) };

    await TestBed.configureTestingModule({
      imports: [FleetTabsComponent],
      providers: [
        provideRouter([]),
        { provide: FleetReportService, useValue: reports },
      ],
    }).compileComponents();
  });

  /**
   * Draws the strip.
   *
   * @param model - What it is drawn for.
   * @returns Each tab's label and address.
   */
  function draw(model: FleetTabsVm): [string, string | null][] {
    fixture = TestBed.createComponent(FleetTabsComponent);
    fixture.componentRef.setInput('vm', model);
    fixture.detectChanges();

    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a.lcars-tab'),
    ).map(tab => [tab.textContent?.trim() ?? '', tab.getAttribute('href')]);
  }

  it('draws no strip when the Overview is all there is', () => {
    expect(draw(vm())).toEqual([]);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('nav'),
    ).toBeNull();
  });

  it.each(['roster.import', 'roster.investigate'])(
    'offers Investigate to a reader holding %s',
    capability => {
      expect(draw(vm(capability))).toEqual([
        ['Overview', FLEET_HREF],
        ['Investigate', `${FLEET_HREF}/investigate`],
      ]);
    },
  );

  it('offers the Roster and its History to a member', () => {
    expect(draw(vm('roster.view'))).toEqual([
      ['Overview', FLEET_HREF],
      ['Roster', `${FLEET_HREF}/roster`],
      ['History', `${FLEET_HREF}/history`],
    ]);
  });

  it('draws every tab in strip order for somebody who may open them all', () => {
    expect(
      draw(vm('roster.investigate', 'roster.view')).map(([label]) => label),
    ).toEqual(['Overview', 'Roster', 'History', 'Investigate']);
  });

  describe('the Reports tab', () => {
    // A report can be public, so this is the server's answer, not a guess
    // from the reader's capabilities.
    it('is offered to anybody the server shows a report to', () => {
      reports.visible.mockReturnValue(
        of([{ report: FleetReport.GROWTH, view: FleetReportView.AGGREGATE }]),
      );

      expect(draw(vm())).toEqual([
        ['Overview', FLEET_HREF],
        ['Reports', `${FLEET_HREF}/reports`],
      ]);
      expect(reports.visible).toHaveBeenCalledWith('community-1', 'fleet-1');
    });

    it('is not offered when the server shows no report', () => {
      expect(draw(vm('roster.view')).map(([label]) => label)).toEqual([
        'Overview',
        'Roster',
        'History',
      ]);
    });

    it('is not offered when the answer fails', () => {
      reports.visible.mockReturnValue(throwError(() => new Error('down')));

      expect(draw(vm('roster.view')).map(([label]) => label)).toEqual([
        'Overview',
        'Roster',
        'History',
      ]);
    });

    it('is not asked about on a Fleet with no roster', () => {
      reports.visible.mockReturnValue(
        of([{ report: FleetReport.GROWTH, view: FleetReportView.FULL }]),
      );

      draw(consoleVm('applications.view'));

      expect(reports.visible).not.toHaveBeenCalled();
    });

    it('sits between History and Investigate', () => {
      reports.visible.mockReturnValue(
        of([{ report: FleetReport.GROWTH, view: FleetReportView.FULL }]),
      );

      expect(
        draw(vm('roster.view', 'roster.investigate')).map(([label]) => label),
      ).toEqual(['Overview', 'Roster', 'History', 'Reports', 'Investigate']);
    });
  });

  describe('the Recruitment tab', () => {
    it.each([
      'applications.view',
      'applications.decide',
      'recruitment.manage',
      'members.manage',
    ])('is offered to a reader holding %s', capability => {
      expect(draw(vm(capability))).toEqual([
        ['Overview', FLEET_HREF],
        ['Recruitment', `${FLEET_HREF}/recruitment`],
      ]);
    });

    it('comes last', () => {
      expect(
        draw(vm('roster.view', 'roster.investigate', 'recruitment.manage')).map(
          ([label]) => label,
        ),
      ).toEqual([
        'Overview',
        'Roster',
        'History',
        'Investigate',
        'Recruitment',
      ]);
    });
  });

  // FC-022: who governs the Fleet, for its Owner and Admins.
  describe('the Manage tab', () => {
    it.each([['OWNER'], ['ADMIN']])(
      'is offered to a reader holding %s, last of all',
      (role: string) => {
        expect(
          draw({ ...vm('roster.view', 'recruitment.manage'), roles: [role] }),
        ).toEqual([
          ['Overview', FLEET_HREF],
          ['Roster', `${FLEET_HREF}/roster`],
          ['History', `${FLEET_HREF}/history`],
          ['Recruitment', `${FLEET_HREF}/recruitment`],
          ['Manage', `${FLEET_HREF}/manage`],
        ]);
      },
    );

    it('is not offered to an Officer or a member', () => {
      expect(
        draw({ ...vm('roster.view'), roles: ['OFFICER', 'MEMBER'] }).map(
          ([label]) => label,
        ),
      ).not.toContain('Manage');
    });

    it('is offered on a Fleet with no roster too', () => {
      expect(
        draw({ ...consoleVm(), roles: ['ADMIN'] }).map(([label]) => label),
      ).toEqual(['Overview', 'Manage']);
    });
  });

  describe('on a Fleet with no roster', () => {
    it('offers Recruitment and nothing about a roster', () => {
      expect(
        draw(
          consoleVm(
            'roster.view',
            'roster.import',
            'roster.investigate',
            'applications.view',
          ),
        ),
      ).toEqual([
        ['Overview', FLEET_HREF],
        ['Recruitment', `${FLEET_HREF}/recruitment`],
      ]);
    });

    it('draws no strip for a reader with no recruitment to run', () => {
      expect(draw(consoleVm('roster.view'))).toEqual([]);
    });
  });

  it('names itself for a screen reader moving by landmark', () => {
    draw(vm('roster.view'));

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('nav')
        ?.getAttribute('aria-label'),
    ).toBe('Fleet sections');
  });

  describe('fleetTabsVmOf', () => {
    /**
     * Builds a resolved Fleet.
     *
     * @param fleet - Changes to the Fleet.
     * @returns The resolved Fleet.
     */
    function resolved(
      fleet: Partial<ResolvedStoFleet['fleet']> = {},
    ): ResolvedStoFleet {
      return {
        fleet: {
          slug: 'ninth-fleet',
          id: 'fleet-1',
          communityId: 'community-1',
          platformProvidesRosterExport: true,
          ...fleet,
        },
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        viewer: { capabilities: ['roster.view'], roles: [] },
      } as unknown as ResolvedStoFleet;
    }

    it('draws the strip for a Fleet with a roster', () => {
      expect(fleetTabsVmOf(resolved())).toEqual(vm('roster.view'));
    });

    it('draws none for a Fleet no Community holds', () => {
      expect(fleetTabsVmOf(resolved({ communityId: null }))).toBeNull();
    });

    it('draws one without a roster for a Fleet on a platform with no export', () => {
      expect(
        fleetTabsVmOf(resolved({ platformProvidesRosterExport: false })),
      ).toEqual(consoleVm('roster.view'));
    });
  });
});
