import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import {
  cellsOf,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import { FleetAudience } from 'src/app/models/fleet.models';
import {
  FleetReport,
  FleetReportAudiences,
} from 'src/app/models/fleet-report.models';

import {
  REPORT_AUDIENCE_SAVE_FAILED,
  REPORT_AUDIENCES_ERROR,
  ReportAudiencesComponent,
} from './report-audiences.component';

/** Growth shown to anyone since November; the rest private. */
const AUDIENCES: FleetReportAudiences = {
  reports: [
    {
      report: FleetReport.GROWTH,
      audience: FleetAudience.PUBLIC,
      updatedAt: '2024-11-15T12:00:00.000Z',
    },
    {
      report: FleetReport.TENURE,
      audience: FleetAudience.PRIVATE,
      updatedAt: null,
    },
  ],
  changes: [
    {
      id: 'change-2',
      report: FleetReport.GROWTH,
      audienceBefore: FleetAudience.COMMUNITY,
      audienceAfter: FleetAudience.PUBLIC,
      actorName: 'steve',
      changedAt: '2024-11-15T12:00:00.000Z',
    },
    {
      id: 'change-1',
      report: FleetReport.GROWTH,
      audienceBefore: FleetAudience.PRIVATE,
      audienceAfter: FleetAudience.COMMUNITY,
      actorName: null,
      changedAt: '2024-11-01T12:00:00.000Z',
    },
  ],
};

/** Tenure shown to the Fleet's members as well. */
const AFTER: FleetReportAudiences = {
  reports: [
    AUDIENCES.reports[0],
    {
      report: FleetReport.TENURE,
      audience: FleetAudience.FLEET_MEMBERS,
      updatedAt: '2024-12-01T12:00:00.000Z',
    },
  ],
  changes: [
    {
      id: 'change-3',
      report: FleetReport.TENURE,
      audienceBefore: FleetAudience.PRIVATE,
      audienceAfter: FleetAudience.FLEET_MEMBERS,
      actorName: 'steve',
      changedAt: '2024-12-01T12:00:00.000Z',
    },
    ...AUDIENCES.changes,
  ],
};

describe('ReportAudiencesComponent', () => {
  let fixture: ComponentFixture<ReportAudiencesComponent>;
  let reports: { audiences: jest.Mock; setAudience: jest.Mock };

  beforeEach(async () => {
    reports = {
      audiences: jest.fn(() => of(AUDIENCES)),
      setAudience: jest.fn(() => of(AFTER)),
    };

    await TestBed.configureTestingModule({
      imports: [ReportAudiencesComponent],
      providers: [
        { provide: FleetReportService, useValue: reports },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'Europe/London' },
        },
      ],
    }).compileComponents();
  });

  /**
   * Draws the panel.
   *
   * @param canEdit - Whether the reader is the Owner.
   */
  function render(canEdit = false): void {
    fixture = TestBed.createComponent(ReportAudiencesComponent);
    fixture.componentRef.setInput('communityId', 'community-1');
    fixture.componentRef.setInput('fleetId', 'fleet-1');
    fixture.componentRef.setInput('canEdit', canEdit);
    fixture.detectChanges();
  }

  /** What the panel says. */
  const text = (): string => textOf(fixture.nativeElement as HTMLElement);

  /**
   * Finds one element in the panel.
   *
   * @param selector - Its selector.
   * @returns It, or null.
   */
  const find = <E extends Element = HTMLElement>(selector: string): E | null =>
    (fixture.nativeElement as HTMLElement).querySelector<E>(selector);

  /**
   * A report's Save button.
   *
   * @param row - The report's row, from 0.
   * @returns The button.
   */
  const save = (row: number): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelectorAll('tbody button')[
      row
    ] as HTMLButtonElement;

  /**
   * Picks an audience for Tenure.
   *
   * @param audience - The audience.
   */
  function pickForTenure(audience: FleetAudience): void {
    const select = find<HTMLSelectElement>(
      '#audience-TENURE',
    ) as HTMLSelectElement;

    select.value = audience;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('reads the Fleet’s audiences, saying so meanwhile', () => {
    const audiences$ = new Subject<FleetReportAudiences>();

    reports.audiences.mockReturnValue(audiences$);
    render();

    expect(reports.audiences).toHaveBeenCalledWith('community-1', 'fleet-1');
    expect(text()).toContain('Reading who sees each report');

    audiences$.next(AUDIENCES);
    fixture.detectChanges();

    expect(text()).not.toContain('Reading who sees each report');
  });

  it('shows an Admin who sees each report, without letting them change it', () => {
    render();

    expect(cellsOf(find('table') as HTMLTableElement)).toEqual([
      ['Growth', 'Anyone, counts only', 'Nov 15, 2024, 12:00:00 PM'],
      ['Tenure', 'The Owner and Admins', 'Never'],
    ]);
    expect(find('select')).toBeNull();
  });

  it('lists the reports in the order the page offers them', () => {
    reports.audiences.mockReturnValue(
      of({
        reports: [
          AUDIENCES.reports[1],
          {
            report: FleetReport.ACTIVITY,
            audience: FleetAudience.PRIVATE,
            updatedAt: null,
          },
          AUDIENCES.reports[0],
        ],
        changes: [],
      }),
    );
    render();

    expect(
      cellsOf(find('table') as HTMLTableElement).map(([report]) => report),
    ).toEqual(['Growth', 'Activity', 'Tenure']);
  });

  it('keeps every change, newest first, naming who made it', () => {
    render();

    const changes = find('details') as HTMLDetailsElement;

    expect(textOf(changes.querySelector('summary') as Element)).toBe(
      'Changes (2)',
    );
    expect(
      Array.from(changes.querySelectorAll('li')).map(item =>
        textOf(item).trim(),
      ),
    ).toEqual([
      'Nov 15, 2024, 12:00:00 PM: steve showed Growth to Anyone, counts only, not The Community’s followers, counts only',
      'Nov 1, 2024, 12:00:00 PM: An account since closed showed Growth to The Community’s followers, counts only, not The Owner and Admins',
    ]);
  });

  it('says when no report has been shown beyond the Owner and Admins', () => {
    reports.audiences.mockReturnValue(
      of({ reports: AUDIENCES.reports, changes: [] }),
    );
    render();

    expect(text()).toContain('Changes (0)');
    expect(text()).toContain('No report has been shown to anybody but');
  });

  it('says when the audiences could not be read, and reads them again when asked', () => {
    reports.audiences.mockReturnValueOnce(throwError(() => new Error('down')));
    render();

    expect(text()).toContain(REPORT_AUDIENCES_ERROR);
    expect(find('table')).toBeNull();

    (find('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(reports.audiences).toHaveBeenCalledTimes(2);
    expect(find('table')).not.toBeNull();
  });

  describe('for the Owner', () => {
    it('offers every audience, showing the one each report has', () => {
      render(true);

      const select = find<HTMLSelectElement>(
        '#audience-GROWTH',
      ) as HTMLSelectElement;

      expect(
        Array.from(select.options).map(option => [
          option.value,
          textOf(option).trim(),
          option.selected,
        ]),
      ).toEqual([
        [FleetAudience.PRIVATE, 'The Owner and Admins', false],
        [FleetAudience.FLEET_MEMBERS, 'The Fleet’s members, in full', false],
        [
          FleetAudience.COMMUNITY,
          'The Community’s followers, counts only',
          false,
        ],
        [FleetAudience.PUBLIC, 'Anyone, counts only', true],
      ]);
      expect(save(0).disabled).toBe(true);
      expect(save(1).disabled).toBe(true);
    });

    it('changes nothing until Save is pressed, nor for picking what it has', () => {
      render(true);
      pickForTenure(FleetAudience.PRIVATE);

      expect(save(1).disabled).toBe(true);

      pickForTenure(FleetAudience.FLEET_MEMBERS);

      expect(save(1).disabled).toBe(false);
      expect(reports.setAudience).not.toHaveBeenCalled();
    });

    it('saves the audience picked, and shows the audiences as they now are', () => {
      render(true);
      pickForTenure(FleetAudience.FLEET_MEMBERS);
      save(1).click();
      fixture.detectChanges();

      expect(reports.setAudience).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        FleetReport.TENURE,
        FleetAudience.FLEET_MEMBERS,
      );
      expect(fixture.componentInstance.drafts()).toEqual({});
      expect(find<HTMLSelectElement>('#audience-TENURE')?.value).toBe(
        FleetAudience.FLEET_MEMBERS,
      );
      expect(save(1).disabled).toBe(true);
      expect(text()).toContain('Changes (3)');
    });

    it('holds every control while a save is under way', () => {
      const saved$ = new Subject<FleetReportAudiences>();

      reports.setAudience.mockReturnValue(saved$);
      render(true);
      pickForTenure(FleetAudience.FLEET_MEMBERS);
      save(1).click();
      fixture.detectChanges();

      expect(textOf(save(1)).trim()).toBe('Saving');
      expect(save(1).disabled).toBe(true);
      expect(find<HTMLSelectElement>('#audience-GROWTH')?.disabled).toBe(true);

      saved$.next(AFTER);
      fixture.detectChanges();

      expect(textOf(save(1)).trim()).toBe('Save');
      expect(find<HTMLSelectElement>('#audience-GROWTH')?.disabled).toBe(false);
    });

    it('keeps the choice and says so when the save fails', () => {
      reports.setAudience.mockReturnValue(throwError(() => new Error('down')));
      render(true);
      pickForTenure(FleetAudience.PUBLIC);
      save(1).click();
      fixture.detectChanges();

      expect(find('[role="alert"]')?.textContent?.trim()).toBe(
        REPORT_AUDIENCE_SAVE_FAILED,
      );
      expect(find<HTMLSelectElement>('#audience-TENURE')?.value).toBe(
        FleetAudience.PUBLIC,
      );
      expect(save(1).disabled).toBe(false);

      reports.setAudience.mockReturnValue(of(AFTER));
      save(1).click();
      fixture.detectChanges();

      expect(find('[role="alert"]')).toBeNull();
    });
  });
});
