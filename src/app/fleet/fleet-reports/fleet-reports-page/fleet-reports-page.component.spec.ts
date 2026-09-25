import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';

import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import {
  exportOn,
  reportHeader,
  textOf,
} from 'src/app/fleet/fleet-reports/fleet-report.testing';
import { ReportAudiencesComponent } from 'src/app/fleet/fleet-reports/report-audiences/report-audiences.component';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { FLEET_SECTION_MISSING } from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  FleetReport,
  FleetReportAccess,
  FleetReportHeader,
  FleetReportView,
} from 'src/app/models/fleet-report.models';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';
import { saveFile } from 'src/app/shared/utils/save-file.utils';
import { localDayOf } from 'src/app/shared/utils/zoned-day.utils';

import {
  chooseReport,
  FLEET_REPORTS_CSV_FAILED,
  FLEET_REPORTS_NONE,
  FleetReportsPageComponent,
  reportQueryOf,
} from './fleet-reports-page.component';

jest.mock('src/app/shared/utils/save-file.utils', () => ({
  saveFile: jest.fn(),
}));

/**
 * Builds the Fleet as the server resolves it.
 *
 * @param capabilities - What the reader holds.
 * @returns The resolved Fleet.
 */
function resolved(capabilities: string[] = []): ResolvedStoFleet {
  return {
    fleet: {
      id: 'fleet-1',
      slug: 'ninth-fleet',
      exactGameName: 'Ninth Fleet',
      communityId: 'community-1',
      platformProvidesRosterExport: true,
    },
    communitySlug: 'united-federation-alliance',
    communityName: 'United Federation Alliance',
    platformSegment: 'pc',
    redirected: false,
    viewer: { capabilities },
  } as unknown as ResolvedStoFleet;
}

/**
 * Access to some reports, each in one view.
 *
 * @param reports - The reports.
 * @param view - How much of each.
 * @returns The access list.
 */
function access(
  reports: FleetReport[],
  view = FleetReportView.AGGREGATE,
): FleetReportAccess[] {
  return reports.map(report => ({ report, view }));
}

/**
 * The simplest report of each kind: nothing in it but its header.
 *
 * @param report - The kind.
 * @param overrides - Changes to the header.
 * @returns The report.
 */
function empty(
  report: FleetReport,
  overrides: Partial<FleetReportHeader> = {},
): unknown {
  return {
    ...reportHeader(report),
    intervals: [],
    exports: [],
    at: null,
    members: null,
    ...overrides,
  };
}

describe('FleetReportsPageComponent', () => {
  let fixture: ComponentFixture<FleetReportsPageComponent>;
  let query$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let reports: {
    visible: jest.Mock;
    report: jest.Mock;
    csv: jest.Mock;
    audiences: jest.Mock;
  };
  let navigate: jest.SpyInstance;

  beforeEach(async () => {
    query$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    reports = {
      visible: jest.fn(() =>
        of(access([FleetReport.RANKS, FleetReport.GROWTH])),
      ),
      report: jest.fn((_c: string, _f: string, kind: FleetReport) =>
        of(empty(kind)),
      ),
      csv: jest.fn(() => of(new Blob(['# Growth']))),
      audiences: jest.fn(() => of({ reports: [], changes: [] })),
    };
    (saveFile as jest.Mock).mockReset();

    await TestBed.configureTestingModule({
      imports: [FleetReportsPageComponent],
      providers: [
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: FleetReportService, useValue: reports },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: () => 'Europe/London' },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(
              convertToParamMap({
                communitySlug: 'united-federation-alliance',
                platformSegment: 'pc',
                slug: 'ninth-fleet',
              }),
            ),
            queryParamMap: query$,
          },
        },
      ],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
  });

  /** Draws the page. */
  function render(): void {
    fixture = TestBed.createComponent(FleetReportsPageComponent);
    fixture.detectChanges();
  }

  /** What the page says. */
  const text = (): string => textOf(fixture.nativeElement as HTMLElement);

  /**
   * Finds one element on the page.
   *
   * @param selector - Its selector.
   * @returns It, or null.
   */
  const find = <E extends Element = HTMLElement>(selector: string): E | null =>
    (fixture.nativeElement as HTMLElement).querySelector<E>(selector);

  /**
   * Finds a button by its label.
   *
   * @param label - What it says.
   * @returns It.
   */
  function button(label: string): HTMLButtonElement {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find(
      candidate => textOf(candidate).trim() === label,
    ) as HTMLButtonElement;
  }

  it('asks which reports the reader sees, of the Fleet the address names', () => {
    render();

    expect(scopes.resolveFleet).toHaveBeenCalledWith(
      'united-federation-alliance',
      'pc',
      'ninth-fleet',
    );
    expect(reports.visible).toHaveBeenCalledWith('community-1', 'fleet-1');
  });

  it('reads the first report the reader sees when the address names none', () => {
    render();

    expect(reports.report).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      FleetReport.GROWTH,
      {},
    );
    expect(find('app-growth-report')).not.toBeNull();
  });

  it('offers the reports the reader sees, in order, lighting the one read', () => {
    query$.next(convertToParamMap({ report: 'ranks', at: 'import-15' }));
    render();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.fleet-reports__choice a',
      ),
    );

    expect(
      links.map(link => [
        textOf(link).trim(),
        // The page's own address, whatever it is: only the query changes.
        link.getAttribute('href')?.split('?')[1],
        link.getAttribute('aria-current'),
        link.classList.contains('gold'),
      ]),
    ).toEqual([
      // The detail export is the other report's, so it goes.
      ['Growth', 'report=growth', null, false],
      ['Ranks', 'report=ranks', 'page', true],
    ]);
  });

  it('reads the report, span and detail the address names', () => {
    query$.next(
      convertToParamMap({
        report: 'RANKS',
        from: '2024-10-01T00:00:00.000Z',
        to: '2024-11-30T23:59:59.999Z',
        at: '',
      }),
    );
    render();

    expect(reports.report).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      FleetReport.RANKS,
      { from: '2024-10-01T00:00:00.000Z', to: '2024-11-30T23:59:59.999Z' },
    );
    expect(find('app-ranks-report')).not.toBeNull();
    expect(find<HTMLInputElement>('#report-from')?.value).toBe('2024-10-01');
    expect(find<HTMLInputElement>('#report-to')?.value).toBe('2024-11-30');
  });

  it.each([
    [FleetReport.GROWTH, 'app-growth-report'],
    [FleetReport.ACTIVITY, 'app-activity-report'],
    [FleetReport.TENURE, 'app-tenure-report'],
    [FleetReport.RANKS, 'app-ranks-report'],
    [FleetReport.CONTRIBUTION, 'app-contribution-report'],
  ])('draws %s with its own view', (report, selector) => {
    reports.visible.mockReturnValue(of(access([report])));
    render();

    expect(find(selector)).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'app-growth-report, app-activity-report, app-tenure-report, app-ranks-report, app-contribution-report',
      ).length,
    ).toBe(1);
  });

  it('says what the report covers, and that it counts only for an aggregate audience', () => {
    render();

    expect(text()).toContain(
      'From revision 17 of the history, published Sep 25, 2026, 3:09:15 AM. 2 exports, Nov 1, 2024, 12:00:00 PM to Nov 15, 2024, 12:00:00 PM.',
    );
    expect(text()).not.toContain('You are shown counts and totals only');
    expect(text()).not.toContain('A change is being worked into the history');

    reports.report.mockReturnValue(
      of(
        empty(FleetReport.GROWTH, {
          view: FleetReportView.AGGREGATE,
          stale: true,
          coverage: { exports: 1, first: exportOn(1), latest: exportOn(1) },
        }),
      ),
    );
    render();

    expect(text()).toContain(
      '1 export, Nov 1, 2024, 12:00:00 PM to Nov 1, 2024, 12:00:00 PM.',
    );
    expect(text()).toContain(
      'You are shown counts and totals only. A figure counting from 1 to 4 members is shown as < 5',
    );
    expect(text()).toContain('A change is being worked into the history');
  });

  it('says so when no export was taken in the span', () => {
    reports.report.mockReturnValue(
      of(
        empty(FleetReport.GROWTH, {
          coverage: { exports: 0, first: null, latest: null },
        }),
      ),
    );
    render();

    expect(text()).toContain('No export was taken in this span.');
  });

  it('says so when no roster has been read yet', () => {
    reports.report.mockReturnValue(
      of(empty(FleetReport.GROWTH, { revision: 0, publishedAt: null })),
    );
    render();

    expect(text()).toContain(
      'No roster has been read into this Fleet’s history',
    );
    expect(find('app-growth-report')).toBeNull();
  });

  it('tells a reader shown none of the reports so, without asking for one', () => {
    reports.visible.mockReturnValue(of([]));
    render();

    expect(text()).toContain(FLEET_REPORTS_NONE);
    expect(reports.report).not.toHaveBeenCalled();
    expect(find('.fleet-reports__choice')).toBeNull();
  });

  it('says a report hidden from the reader is missing', () => {
    reports.report.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    render();

    expect(text()).toContain(FLEET_SECTION_MISSING);
  });

  describe('who sees each report', () => {
    /**
     * The audience panel, if drawn.
     *
     * @returns It, or null.
     */
    const panel = (): ReportAudiencesComponent | null =>
      fixture.debugElement.query(By.directive(ReportAudiencesComponent))
        ?.componentInstance ?? null;

    it('is not drawn for a reader without reports.view', () => {
      scopes.resolveFleet.mockReturnValue(of(resolved(['roster.view'])));
      render();

      expect(panel()).toBeNull();
      expect(reports.audiences).not.toHaveBeenCalled();
    });

    it('is drawn for an Admin, who may not change it', () => {
      scopes.resolveFleet.mockReturnValue(of(resolved(['reports.view'])));
      render();

      expect(panel()?.communityId()).toBe('community-1');
      expect(panel()?.fleetId()).toBe('fleet-1');
      expect(panel()?.canEdit()).toBe(false);
    });

    it('is changeable by the Owner', () => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved(['reports.view', 'scope.settings.manage'])),
      );
      render();

      expect(panel()?.canEdit()).toBe(true);
    });
  });

  describe('the span', () => {
    it('covers whole days in the reader’s timezone, and drops the detail', () => {
      render();

      (find('#report-from') as HTMLInputElement).value = '2024-10-01';
      (find('#report-to') as HTMLInputElement).value = '2024-11-30';
      find('form')?.dispatchEvent(new Event('submit'));

      expect(navigate).toHaveBeenCalledWith([], {
        relativeTo: TestBed.inject(ActivatedRoute),
        // London was on summer time on 1 October.
        queryParams: {
          from: '2024-09-30T23:00:00.000Z',
          to: '2024-11-30T23:59:59.999Z',
          at: null,
        },
        queryParamsHandling: 'merge',
      });
    });

    it('leaves an end unbounded when its day is empty', () => {
      render();
      find('form')?.dispatchEvent(new Event('submit'));

      expect(navigate.mock.calls[0][1].queryParams).toEqual({
        from: null,
        to: null,
        at: null,
      });
    });

    it('goes back to every export', () => {
      render();

      expect(button('Every export').disabled).toBe(true);

      query$.next(convertToParamMap({ to: '2024-11-30T23:59:59.999Z' }));
      fixture.detectChanges();
      button('Every export').click();

      expect(navigate.mock.calls[0][1].queryParams).toEqual({
        from: null,
        to: null,
        at: null,
      });
    });
  });

  it('draws the detail at the export a view asks for', () => {
    reports.visible.mockReturnValue(of(access([FleetReport.TENURE])));
    render();

    fixture.componentInstance.onAt('import-01');

    expect(navigate.mock.calls[0][1].queryParams).toEqual({ at: 'import-01' });
  });

  describe('the CSV', () => {
    it('downloads the report as shown, named by the Fleet, the report and the day', () => {
      query$.next(convertToParamMap({ from: '2024-10-01T00:00:00.000Z' }));
      render();

      const day = localDayOf(new Date().toISOString(), 'Europe/London');

      button('Download CSV').click();

      expect(reports.csv).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        FleetReport.GROWTH,
        { from: '2024-10-01T00:00:00.000Z' },
      );
      expect(saveFile).toHaveBeenCalledWith(
        expect.any(Blob),
        `ninth-fleet-growth-${day}.csv`,
      );
      expect(fixture.componentInstance.csvState()).toBe('IDLE');
    });

    it('says it is being made, and refuses a second press meanwhile', () => {
      const file$ = new Subject<Blob>();

      reports.csv.mockReturnValue(file$);
      render();
      button('Download CSV').click();
      fixture.detectChanges();

      expect(button('Making the CSV').disabled).toBe(true);

      file$.next(new Blob([]));
      fixture.detectChanges();

      expect(button('Download CSV').disabled).toBe(false);
    });

    it('says so when it could not be made, until the reader moves on', () => {
      reports.csv.mockReturnValue(throwError(() => new Error('down')));
      render();
      button('Download CSV').click();
      fixture.detectChanges();

      expect(find('[role="alert"]')?.textContent?.trim()).toBe(
        FLEET_REPORTS_CSV_FAILED,
      );
      expect(saveFile).not.toHaveBeenCalled();

      fixture.componentInstance.onEverySpan();
      fixture.detectChanges();

      expect(find('[role="alert"]')).toBeNull();
    });
  });
});

describe('reportQueryOf', () => {
  it('reads the span and detail, leaving out whatever the address does not name', () => {
    expect(reportQueryOf(convertToParamMap({}))).toEqual({});
    expect(
      reportQueryOf(
        convertToParamMap({ from: 'a', to: '', at: 'import-1', report: 'x' }),
      ),
    ).toEqual({ from: 'a', at: 'import-1' });
  });
});

describe('chooseReport', () => {
  const visible = access([FleetReport.CONTRIBUTION, FleetReport.TENURE]);

  it('reads the report named, in any case, when the reader sees it', () => {
    expect(chooseReport(visible, 'contribution')).toBe(
      FleetReport.CONTRIBUTION,
    );
  });

  it('reads the first the reader sees, in the order offered, otherwise', () => {
    expect(chooseReport(visible, null)).toBe(FleetReport.TENURE);
    expect(chooseReport(visible, 'growth')).toBe(FleetReport.TENURE);
  });

  it('reads none when the reader sees none', () => {
    expect(chooseReport([], 'growth')).toBeNull();
  });
});
