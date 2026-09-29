import { TestBed } from '@angular/core/testing';

import { AttendanceReportComponent } from 'src/app/fleet/fleet-reports/attendance-report/attendance-report.component';
import {
  cellsOf,
  configureReportView,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import { fleetReportAudienceLabel } from 'src/app/fleet/fleet-reports/fleet-report.text';
import { HoldingsReportComponent } from 'src/app/fleet/fleet-reports/holdings-report/holdings-report.component';
import { RecruitmentReportComponent } from 'src/app/fleet/fleet-reports/recruitment-report/recruitment-report.component';
import {
  FleetAttendanceReport,
  FleetHoldingsReport,
  FleetRecordReportHeader,
  FleetRecruitmentReport,
  FleetReport,
  FleetReportView,
} from 'src/app/models/fleet-report.models';
import { FleetAudience } from 'src/app/models/fleet.models';

/**
 * A header for a report read from the Fleet's own records.
 *
 * @param report - The report.
 * @param view - How much the viewer is shown.
 * @returns The header.
 */
function recordHeader(
  report: FleetReport,
  view = FleetReportView.FULL,
): FleetRecordReportHeader {
  return {
    report,
    view,
    range: {
      from: '2025-09-28T00:00:00.000Z',
      to: '2026-09-28T12:00:00.000Z',
    },
    minimumCohort: 5,
  };
}

/**
 * Draws a report view.
 *
 * @param component - The view.
 * @param report - What it is given.
 * @returns Its element.
 */
async function draw(component: unknown, report: object): Promise<HTMLElement> {
  await configureReportView(component);

  const fixture = TestBed.createComponent(component as never);

  (
    fixture.componentRef as { setInput: (n: string, v: unknown) => void }
  ).setInput('report', report);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
}

describe('reports from the Fleet’s own records (FC-030)', () => {
  describe('attendance', () => {
    const report: FleetAttendanceReport = {
      ...recordHeader(FleetReport.ATTENDANCE),
      occurrences: [
        {
          occurrenceId: 'o1',
          eventId: 'e1',
          title: 'Refit night',
          startsAt: '2026-03-06T20:00:00.000Z',
          going: 6,
          attended: 5,
          absent: 1,
          rate: 0.83,
        },
        {
          occurrenceId: 'o2',
          eventId: 'e1',
          title: 'Refit night',
          startsAt: '2026-03-13T20:00:00.000Z',
          going: null,
          attended: null,
          absent: null,
          rate: null,
        },
      ],
      totals: { occurrences: 2, attended: 7, absent: 1, rate: 0.88 },
      members: [
        { username: 'Kira', attended: 2, absent: 0 },
        { username: null, attended: 0, absent: 1 },
      ],
    };

    it('lists each occurrence, the totals and each person', async () => {
      const element = await draw(AttendanceReportComponent, report);
      const [occurrences, members] = Array.from(
        element.querySelectorAll('table'),
      );

      expect(cellsOf(occurrences)).toEqual([
        ['6', '5', '1', '83%'],
        ['< 5', '< 5', '< 5', '–'],
      ]);
      expect(textOf(occurrences.querySelector('tfoot')!)).toContain(
        'All 2 7 1 88%',
      );
      expect(cellsOf(members)).toEqual([
        ['2', '0'],
        ['0', '1'],
      ]);
      expect(textOf(members)).toContain('Kira');
      expect(textOf(members)).toContain('An account since closed');
    });

    it('shows nobody to a reader shown counts alone', async () => {
      const element = await draw(AttendanceReportComponent, {
        ...report,
        members: null,
      });

      expect(element.querySelectorAll('table')).toHaveLength(1);
    });

    it('says when none of the Fleet’s events took place', async () => {
      const element = await draw(AttendanceReportComponent, {
        ...report,
        occurrences: [],
        members: [],
      });

      expect(textOf(element)).toContain(
        'None of this Fleet’s own events took place in this span.',
      );
      expect(element.querySelector('table')).toBeNull();
    });
  });

  describe('recruitment', () => {
    it('lists each month’s routes, a hidden figure as < 5', async () => {
      const report: FleetRecruitmentReport = {
        ...recordHeader(FleetReport.RECRUITMENT, FleetReportView.AGGREGATE),
        months: [
          {
            month: '2026-03',
            route: 'INVITATION',
            received: 12,
            accepted: 8,
            declined: null,
            withdrawn: null,
            lapsed: 0,
            pending: null,
            medianDaysToDecision: 2.5,
          },
          {
            month: '2026-04',
            route: 'OPEN_JOIN',
            received: null,
            accepted: null,
            declined: null,
            withdrawn: null,
            lapsed: null,
            pending: null,
            medianDaysToDecision: null,
          },
        ],
      };
      const element = await draw(RecruitmentReportComponent, report);

      expect(textOf(element)).toContain('March 2026');
      expect(cellsOf(element.querySelector('table')!)).toEqual([
        ['Invitations', '12', '8', '< 5', '< 5', '0', '< 5', '2.5'],
        ['Open joins', '< 5', '< 5', '< 5', '< 5', '< 5', '< 5', '–'],
      ]);
    });

    it('says when nobody asked', async () => {
      const element = await draw(RecruitmentReportComponent, {
        ...recordHeader(FleetReport.RECRUITMENT),
        months: [],
      });

      expect(textOf(element)).toContain(
        'Nobody applied, joined or was invited in this span.',
      );
    });
  });

  describe('holdings', () => {
    it('lists every tier moved, never who recorded it', async () => {
      const report: FleetHoldingsReport = {
        ...recordHeader(FleetReport.HOLDINGS),
        changes: [
          {
            at: '2026-09-28T01:49:47.000Z',
            holding: 'Fleet Starbase',
            track: 'Military',
            from: 2,
            to: 3,
          },
        ],
      };
      const element = await draw(HoldingsReportComponent, report);

      expect(cellsOf(element.querySelector('table')!)).toEqual([
        ['Fleet Starbase', 'Military', '2', '3'],
      ]);
    });

    it('says when nothing changed', async () => {
      const element = await draw(HoldingsReportComponent, {
        ...recordHeader(FleetReport.HOLDINGS),
        changes: [],
      });

      expect(textOf(element)).toContain('No holding changed in this span.');
    });
  });

  it('words attendance’s member audience as counts only', () => {
    expect(
      fleetReportAudienceLabel(
        FleetReport.ATTENDANCE,
        FleetAudience.FLEET_MEMBERS,
      ),
    ).toBe('The Fleet’s members, counts only');
    expect(
      fleetReportAudienceLabel(FleetReport.GROWTH, FleetAudience.FLEET_MEMBERS),
    ).toBe('The Fleet’s members, in full');
    expect(
      fleetReportAudienceLabel(FleetReport.ATTENDANCE, FleetAudience.PUBLIC),
    ).toBe('Anyone, counts only');
  });
});
