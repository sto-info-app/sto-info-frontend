import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';
import { By } from '@angular/platform-browser';

import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import {
  ROSTER_IMPORT_POLL_INTERVAL_MS,
  ROSTER_IMPORT_POLL_WINDOW_MS,
} from 'src/app/fleet/imports/roster-import.constants';
import {
  ROSTER_IMPORT_STATUS_DESCRIPTIONS,
  ROSTER_IMPORT_STATUS_REASONS,
  ROSTER_ROW_REJECTIONS,
} from 'src/app/fleet/imports/roster-import.messages';
import { RosterImportCorrectionsComponent } from 'src/app/fleet/imports/roster-import-corrections/roster-import-corrections.component';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterImportDetail,
  RosterImportStatus,
  RosterRowRejection,
  RosterSourceHeaderShape,
} from 'src/app/models/fleet-import.models';
import {
  FleetAudience,
  FleetRecruitmentState,
  FleetScopeRelationship,
  FleetScopeStatus,
  FleetScopeViewer,
  ResolvedStoFleet,
  StoFleet,
} from 'src/app/models/fleet.models';

import {
  ROSTER_IMPORT_STATUS_ERROR,
  ROSTER_IMPORT_STATUS_MISSING,
  ROSTER_IMPORT_STATUS_NOT_PERMITTED,
  ROSTER_IMPORT_STATUS_REPEATED,
  ROSTER_IMPORT_UPLOADER_GONE,
  RosterImportStatusComponent,
} from './roster-import-status.component';

/**
 * Builds a Fleet as the server would send it.
 *
 * @param overrides - Fields to override.
 * @returns The Fleet.
 */
function fleet(overrides: Partial<StoFleet> = {}): StoFleet {
  return {
    id: 'fleet-1',
    communityId: 'community-1',
    platformId: 'platform-1',
    platformName: 'PC',
    platformSegment: 'pc',
    platformProvidesRosterExport: true,
    exactGameName: 'Ninth Fleet',
    allegianceFactionId: null,
    slug: 'ninth-fleet',
    recruitmentState: FleetRecruitmentState.OPEN,
    visibility: FleetAudience.PUBLIC,
    lastEffectiveImportAt: null,
    status: FleetScopeStatus.ACTIVE,
    closedAt: null,
    bannerImageId: null,
    bannerImageAlt: null,
    emblemImageId: null,
    emblemImageAlt: null,
    revision: 1,
    createdAt: '2026-01-02T03:04:05.000Z',
    updatedAt: '2026-01-02T03:04:05.000Z',
    ...overrides,
  };
}

/** Somebody who may look and nothing else. */
const READER: FleetScopeViewer = {
  capabilities: [],
  mayManageBanner: false,
  mayManageEmblem: false,
  relationship: FleetScopeRelationship.NONE,
  isFollowingCommunity: false,
  followerCount: 0,
};

/** Somebody who may put a roster into the Fleet. */
const IMPORTER: FleetScopeViewer = {
  ...READER,
  capabilities: ['roster.import'],
};

/** Somebody who may look into the Fleet's imports, and not make one. */
const INVESTIGATOR: FleetScopeViewer = {
  ...READER,
  capabilities: ['roster.investigate'],
};

/**
 * Builds the server's answer for a Fleet address.
 *
 * @param overrides - Fields to override.
 * @returns The resolved Fleet.
 */
function resolved(overrides: Partial<ResolvedStoFleet> = {}): ResolvedStoFleet {
  return {
    fleet: fleet(),
    communitySlug: 'united-federation-alliance',
    communityName: 'United Federation Alliance',
    platformSegment: 'pc',
    redirected: false,
    viewer: IMPORTER,
    ...overrides,
  };
}

/**
 * Builds an import as the server reports one.
 *
 * @param overrides - Fields to override.
 * @returns The import.
 */
function detail(
  overrides: Partial<RosterImportDetail> = {},
): RosterImportDetail {
  return {
    id: 'import-1',
    assetId: 'asset-1',
    fleetId: 'fleet-1',
    originalFilename: 'Ninth Fleet_20240101-120000.Csv',
    sourceSha256: 'a'.repeat(64),
    sanitisedSha256: 'b'.repeat(64),
    sourceByteSize: 1200,
    sanitisedByteSize: 1100,
    sourceHeaderShape: RosterSourceHeaderShape.NORMAL,
    exportTimezone: 'Europe/London',
    exportLocalStamp: '2024-01-01T12:00:00',
    exportedAt: '2024-01-01T12:00:00.000Z',
    exportedAtAmbiguous: false,
    rowCount: 212,
    officerTailRowCount: 0,
    parserVersion: 1,
    state: 'AVAILABLE',
    retainUntil: null,
    conflictGroupId: null,
    status: RosterImportStatus.IMPORTED,
    statusReason: null,
    problemCount: 0,
    uploadedByName: 'jellico',
    uploadedAt: '2024-01-01T12:05:00.000Z',
    excluded: false,
    partial: false,
    problems: null,
    conflictMembers: null,
    selectedImportId: null,
    excludedLines: null,
    actions: null,
    ...overrides,
  };
}

describe('RosterImportStatusComponent', () => {
  let fixture: ComponentFixture<RosterImportStatusComponent>;
  let component: RosterImportStatusComponent;
  let params$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let imports: { detail: jest.Mock };

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(
      convertToParamMap({
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        slug: 'ninth-fleet',
        importId: 'import-1',
      }),
    );
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    imports = { detail: jest.fn(() => of(detail())) };

    await TestBed.configureTestingModule({
      imports: [RosterImportStatusComponent],
      providers: [
        { provide: FleetReportService, useValue: { visible: () => of([]) } },
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: RosterImportService, useValue: imports },
        { provide: ActivatedRoute, useValue: { paramMap: params$ } },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: signal('UTC') },
        },
      ],
    }).compileComponents();
  });

  /**
   * Renders the page, and lets the first read of the import land.
   *
   * Only inside `fakeAsync`: the first read is on a timer, even at zero.
   */
  function render(): void {
    fixture = TestBed.createComponent(RosterImportStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();
  }

  /**
   * Lets time pass and redraws.
   *
   * @param ms - How long.
   */
  function wait(ms: number): void {
    tick(ms);
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

  /**
   * Finds every matching element.
   *
   * @param selector - The CSS selector.
   * @returns The elements.
   */
  const findAll = (selector: string): HTMLElement[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(selector),
    );

  /** What the page currently says. */
  const text = (): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  /** Finds the button that asks again, if there is one. */
  const checkAgainButton = (): HTMLButtonElement | undefined =>
    findAll('button').find(button =>
      button.textContent?.includes('Check again'),
    ) as HTMLButtonElement | undefined;

  describe('reading the Fleet and the import', () => {
    it('says it is loading before the server has answered', fakeAsync(() => {
      scopes.resolveFleet.mockReturnValue(NEVER);
      render();

      expect(find('app-loading-bar')).not.toBeNull();
      fixture.destroy();
    }));

    it.each([
      [404, 'app-lcars-information-message', ROSTER_IMPORT_STATUS_MISSING],
      [500, 'app-lcars-error-message', ROSTER_IMPORT_STATUS_ERROR],
    ])(
      'answers a %i for the Fleet with %s',
      (status: number, selector: string, message: string) =>
        fakeAsync(() => {
          scopes.resolveFleet.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status })),
          );
          render();

          expect(find(selector)).not.toBeNull();
          expect(text()).toContain(message);
          expect(imports.detail).not.toHaveBeenCalled();
        })(),
    );

    it.each([
      [404, 'app-lcars-information-message', ROSTER_IMPORT_STATUS_MISSING],
      [500, 'app-lcars-error-message', ROSTER_IMPORT_STATUS_ERROR],
    ])(
      'answers a %i for the import with %s',
      (status: number, selector: string, message: string) =>
        fakeAsync(() => {
          imports.detail.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status })),
          );
          render();

          expect(find(selector)).not.toBeNull();
          expect(text()).toContain(message);
        })(),
    );

    it('asks about the Fleet and the import the address names', fakeAsync(() => {
      render();

      expect(scopes.resolveFleet).toHaveBeenCalledWith(
        'united-federation-alliance',
        'pc',
        'ninth-fleet',
      );
      expect(imports.detail).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'import-1',
      );
    }));

    it('asks for nothing where the address carries no segments', fakeAsync(() => {
      params$.next(convertToParamMap({}));
      render();

      expect(scopes.resolveFleet).toHaveBeenCalledWith('', '', '');
      expect(imports.detail).toHaveBeenCalledWith('community-1', 'fleet-1', '');
    }));

    // A Fleet nobody has registered has no Community, and so no imports.
    it('reports a Fleet no Community holds as having no such import', fakeAsync(() => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved({ fleet: fleet({ communityId: null }) })),
      );
      render();

      expect(text()).toContain(ROSTER_IMPORT_STATUS_MISSING);
      expect(imports.detail).not.toHaveBeenCalled();
    }));

    it('tells somebody who may not read imports so, without asking', fakeAsync(() => {
      scopes.resolveFleet.mockReturnValue(of(resolved({ viewer: READER })));
      render();

      expect(text()).toContain(ROSTER_IMPORT_STATUS_NOT_PERMITTED);
      expect(imports.detail).not.toHaveBeenCalled();
      expect(find('nav:not(.lcars-tabs) a')?.getAttribute('href')).toBe(
        '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet',
      );
    }));

    it('lets somebody who investigates, and does not import, read it', fakeAsync(() => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved({ viewer: INVESTIGATOR })),
      );
      render();

      expect(imports.detail).toHaveBeenCalled();
      expect(text()).toContain('Ninth Fleet_20240101-120000.Csv');
    }));
  });

  describe('the import', () => {
    it('names the Fleet and links back to it and to its imports', fakeAsync(() => {
      render();

      const fleetLink = find('.roster-status__fleet a');
      const links = findAll('nav:not(.lcars-tabs) a').map(link =>
        link.getAttribute('href'),
      );

      expect(fleetLink?.textContent).toContain('Ninth Fleet');
      expect(links).toEqual([
        '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/investigate/imports',
        '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet',
      ]);
    }));

    it('says what the export was and who sent it', fakeAsync(() => {
      render();

      expect(text()).toContain('Ninth Fleet_20240101-120000.Csv');
      expect(text()).toContain('jellico');
      expect(text()).toContain('2024-01-01T12:00:00');
      expect(text()).toContain('Europe/London');
      expect(text()).toContain('212');
      expect(text()).not.toContain('Officer notes discarded');
      expect(text()).not.toContain('chosen from the two moments');
    }));

    it('says so when the uploader’s account is gone', fakeAsync(() => {
      imports.detail.mockReturnValue(of(detail({ uploadedByName: null })));
      render();

      expect(text()).toContain(ROSTER_IMPORT_UPLOADER_GONE);
    }));

    it('leaves out a reading an old import never recorded', fakeAsync(() => {
      imports.detail.mockReturnValue(
        of(
          detail({
            exportLocalStamp: null,
            exportTimezone: null,
            exportedAt: null,
          }),
        ),
      );
      render();

      expect(text()).not.toContain('Taken at, on that clock');
      expect(text()).not.toContain('Which is');
    }));

    it('says when the moment was chosen from two', fakeAsync(() => {
      imports.detail.mockReturnValue(of(detail({ exportedAtAmbiguous: true })));
      render();

      expect(text()).toContain('chosen from the two moments the stamp names');
    }));

    it('counts the officer notes that were discarded and the problems', fakeAsync(() => {
      imports.detail.mockReturnValue(
        of(detail({ officerTailRowCount: 4, problemCount: 3 })),
      );
      render();

      expect(text()).toContain('Officer notes discarded');
      expect(text()).toContain('Rows that could not be read');
    }));

    it.each([
      [RosterImportStatus.IMPORTED, 'app-lcars-success-message'],
      [RosterImportStatus.HELD, 'app-lcars-warning-message'],
      [RosterImportStatus.REFUSED, 'app-lcars-error-message'],
      [RosterImportStatus.ABANDONED, 'app-lcars-information-message'],
    ])('draws %s in %s', (status: RosterImportStatus, selector: string) =>
      fakeAsync(() => {
        imports.detail.mockReturnValue(of(detail({ status })));
        render();

        expect(find(selector)).not.toBeNull();
        expect(text()).toContain(ROSTER_IMPORT_STATUS_DESCRIPTIONS[status]);
      })(),
    );

    it('says why an import is held', fakeAsync(() => {
      imports.detail.mockReturnValue(
        of(
          detail({
            status: RosterImportStatus.HELD,
            statusReason: 'EXPORT_INSTANT_IN_CONFLICT',
            conflictGroupId: 'group-1',
          }),
        ),
      );
      render();

      expect(text()).toContain(
        ROSTER_IMPORT_STATUS_REASONS['EXPORT_INSTANT_IN_CONFLICT'],
      );
    }));

    it('says a scan refused it, and nothing more', fakeAsync(() => {
      imports.detail.mockReturnValue(
        of(
          detail({
            status: RosterImportStatus.REFUSED,
            statusReason: 'SCAN_REFUSED',
          }),
        ),
      );
      render();

      expect(text()).toContain(ROSTER_IMPORT_STATUS_REASONS['SCAN_REFUSED']);
    }));
  });

  describe('what only an investigator sees', () => {
    it('lists the rows at fault', fakeAsync(() => {
      imports.detail.mockReturnValue(
        of(
          detail({
            status: RosterImportStatus.REFUSED,
            statusReason: 'ROWS_UNREADABLE',
            problemCount: 2,
            problems: [
              {
                code: RosterRowRejection.LEVEL_MALFORMED,
                line: 4,
                column: 'Level',
              },
              {
                code: RosterRowRejection.DUPLICATE_IDENTITY,
                line: 9,
                column: null,
              },
            ],
          }),
        ),
      );
      render();

      const rows = findAll('.roster-status__problems li');

      expect(rows).toHaveLength(2);
      expect(rows[0].textContent).toContain('Line 4');
      expect(rows[0].textContent).toContain('Level');
      expect(rows[0].textContent).toContain(
        ROSTER_ROW_REJECTIONS[RosterRowRejection.LEVEL_MALFORMED],
      );
      expect(rows[1].querySelector('.roster-status__column')).toBeNull();
    }));

    it('lists nothing where the server sent nothing to list', fakeAsync(() => {
      imports.detail.mockReturnValue(
        of(detail({ problemCount: 2, problems: null, conflictMembers: null })),
      );
      render();

      expect(find('.roster-status__problems')).toBeNull();
      expect(find('.roster-status__members')).toBeNull();
    }));

    it('links to the other exports of the same moment', fakeAsync(() => {
      imports.detail.mockReturnValue(
        of(
          detail({
            status: RosterImportStatus.HELD,
            conflictGroupId: 'group-1',
            conflictMembers: [
              detail({
                id: 'import-0',
                originalFilename: 'Ninth Fleet_20240101-120000 (1).Csv',
                uploadedByName: null,
              }),
            ],
          }),
        ),
      );
      render();

      const member = find('.roster-status__members li');

      expect(member?.querySelector('a')?.getAttribute('href')).toBe(
        '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/investigate/imports/import-0',
      );
      expect(member?.textContent).toContain('Imported');
      expect(member?.textContent).toContain(ROSTER_IMPORT_UPLOADER_GONE);
    }));
  });

  describe('watching it', () => {
    it('asks once about an import that has already settled', fakeAsync(() => {
      render();
      wait(ROSTER_IMPORT_POLL_INTERVAL_MS * 3);

      expect(imports.detail).toHaveBeenCalledTimes(1);
      expect(find('app-loading-bar')).toBeNull();
      expect(checkAgainButton()).toBeUndefined();
    }));

    it('asks again until the import settles, and then stops', fakeAsync(() => {
      imports.detail
        .mockReturnValueOnce(
          of(detail({ status: RosterImportStatus.SCANNING })),
        )
        .mockReturnValueOnce(
          of(detail({ status: RosterImportStatus.PUBLISHING })),
        )
        .mockReturnValue(of(detail({ status: RosterImportStatus.IMPORTED })));
      render();

      expect(text()).toContain('Scanning');
      expect(find('app-loading-bar')).not.toBeNull();

      wait(ROSTER_IMPORT_POLL_INTERVAL_MS);
      expect(text()).toContain('Reading');

      wait(ROSTER_IMPORT_POLL_INTERVAL_MS);
      expect(text()).toContain('Imported');
      expect(find('app-loading-bar')).toBeNull();

      wait(ROSTER_IMPORT_POLL_INTERVAL_MS * 3);
      expect(imports.detail).toHaveBeenCalledTimes(3);
    }));

    it('stops by itself after a while, and offers to ask again', fakeAsync(() => {
      imports.detail.mockReturnValue(
        of(detail({ status: RosterImportStatus.SCANNING })),
      );
      render();
      wait(ROSTER_IMPORT_POLL_WINDOW_MS);

      const calls = imports.detail.mock.calls.length;

      expect(find('app-loading-bar')).toBeNull();
      expect(checkAgainButton()).toBeDefined();
      expect(text()).toContain('stopped checking by itself');

      wait(ROSTER_IMPORT_POLL_INTERVAL_MS * 3);
      expect(imports.detail).toHaveBeenCalledTimes(calls);

      imports.detail.mockReturnValue(
        of(detail({ status: RosterImportStatus.IMPORTED })),
      );
      checkAgainButton()?.click();
      wait(0);

      expect(imports.detail).toHaveBeenCalledTimes(calls + 1);
      expect(text()).toContain('Imported');
      expect(checkAgainButton()).toBeUndefined();
    }));

    it('says nothing further when the window closes on nothing read', fakeAsync(() => {
      imports.detail.mockReturnValue(NEVER);
      render();
      wait(ROSTER_IMPORT_POLL_WINDOW_MS);

      expect(find('app-loading-bar')).not.toBeNull();
      expect(checkAgainButton()).toBeUndefined();
      fixture.destroy();
    }));
  });

  describe('corrections', () => {
    /**
     * The corrections panel, if drawn.
     *
     * @returns It, or null.
     */
    const panel = (): RosterImportCorrectionsComponent | null =>
      fixture.debugElement.query(By.directive(RosterImportCorrectionsComponent))
        ?.componentInstance ?? null;

    it('offers none to a reader not shown the corrections', fakeAsync(() => {
      render();

      expect(panel()).toBeNull();
    }));

    it('offers an investigator the corrections for this import', fakeAsync(() => {
      const shown = detail({ actions: [] });

      imports.detail.mockReturnValue(of(shown));
      render();

      expect(panel()?.communityId()).toBe(resolved().fleet.communityId);
      expect(panel()?.fleetId()).toBe(resolved().fleet.id);
      expect(panel()?.detail()).toEqual(shown);
      expect(panel()?.conflictsLink().join('/')).toMatch(
        /\/investigate\/conflicts$/,
      );
    }));

    it('reads the import again once it is corrected', fakeAsync(() => {
      imports.detail.mockReturnValue(of(detail({ actions: [] })));
      render();

      const calls = imports.detail.mock.calls.length;

      panel()?.corrected.emit(detail({ actions: [], excluded: true }));
      wait(0);

      expect(imports.detail).toHaveBeenCalledTimes(calls + 1);
    }));
  });

  describe('arriving from an upload', () => {
    it('says so when the file had already been imported', fakeAsync(() => {
      TestBed.inject(Location).replaceState('', '', {
        rosterImportRepeated: true,
      });
      render();

      expect(component.repeated).toBe(true);
      expect(text()).toContain(ROSTER_IMPORT_STATUS_REPEATED);
    }));

    it('says nothing of the kind otherwise', fakeAsync(() => {
      TestBed.inject(Location).replaceState('', '', { navigationId: 1 });
      render();

      expect(component.repeated).toBe(false);
      expect(text()).not.toContain(ROSTER_IMPORT_STATUS_REPEATED);
    }));
  });
});
