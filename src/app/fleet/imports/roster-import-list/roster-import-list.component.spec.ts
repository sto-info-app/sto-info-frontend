import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';

import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterImportPage,
  RosterImportStatus,
  RosterImportSummary,
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

import { ROSTER_IMPORT_UPLOADER_GONE } from '../roster-import-status/roster-import-status.component';

import {
  ROSTER_IMPORT_LIST_EMPTY,
  ROSTER_IMPORT_LIST_ERROR,
  ROSTER_IMPORT_LIST_MISSING,
  ROSTER_IMPORT_LIST_NOT_PERMITTED,
  RosterImportListComponent,
} from './roster-import-list.component';

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

/** The Fleet's page, as a link resolves. */
const FLEET_HREF =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet';

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
 * Builds an import as the listing reports one.
 *
 * @param overrides - Fields to override.
 * @returns The import.
 */
function summary(
  overrides: Partial<RosterImportSummary> = {},
): RosterImportSummary {
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
    ...overrides,
  };
}

/**
 * Builds a page of imports.
 *
 * @param overrides - Fields to override.
 * @returns The page.
 */
function page(overrides: Partial<RosterImportPage> = {}): RosterImportPage {
  return {
    items: [summary()],
    total: 1,
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

describe('RosterImportListComponent', () => {
  let fixture: ComponentFixture<RosterImportListComponent>;
  let params$: BehaviorSubject<ParamMap>;
  let query$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let imports: { list: jest.Mock };
  let route: {
    paramMap: BehaviorSubject<ParamMap>;
    queryParamMap: BehaviorSubject<ParamMap>;
  };

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(
      convertToParamMap({
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        slug: 'ninth-fleet',
      }),
    );
    query$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    imports = { list: jest.fn(() => of(page())) };
    route = { paramMap: params$, queryParamMap: query$ };

    await TestBed.configureTestingModule({
      imports: [RosterImportListComponent],
      providers: [
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: RosterImportService, useValue: imports },
        { provide: ActivatedRoute, useValue: route },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: signal('UTC') },
        },
      ],
    }).compileComponents();
  });

  /** Renders the page. */
  function render(): void {
    fixture = TestBed.createComponent(RosterImportListComponent);
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

  /** Every link in the page's closing row, as it resolves. */
  const navLinks = (): (string | null)[] =>
    findAll('nav a').map(link => link.getAttribute('href'));

  /**
   * Finds a pagination button by what it says.
   *
   * @param label - Previous or Next.
   * @returns The button, if drawn.
   */
  const pageButton = (label: string): HTMLButtonElement | undefined =>
    findAll('.lcars-pagination button').find(button =>
      button.textContent?.includes(label),
    ) as HTMLButtonElement | undefined;

  describe('reading the Fleet and its imports', () => {
    it('says it is loading before the server has answered', () => {
      scopes.resolveFleet.mockReturnValue(NEVER);
      render();

      expect(find('app-loading-bar')).not.toBeNull();
    });

    it.each([
      [404, ROSTER_IMPORT_LIST_MISSING],
      [500, ROSTER_IMPORT_LIST_ERROR],
    ])('answers a %i for the Fleet', (status: number, message: string) => {
      scopes.resolveFleet.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status })),
      );
      render();

      expect(text()).toContain(message);
      expect(imports.list).not.toHaveBeenCalled();
    });

    it.each([
      [404, ROSTER_IMPORT_LIST_MISSING],
      [500, ROSTER_IMPORT_LIST_ERROR],
    ])('answers a %i for the imports', (status: number, message: string) => {
      imports.list.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status })),
      );
      render();

      expect(text()).toContain(message);
    });

    it('asks about the Fleet the address names', () => {
      render();

      expect(scopes.resolveFleet).toHaveBeenCalledWith(
        'united-federation-alliance',
        'pc',
        'ninth-fleet',
      );
      expect(imports.list).toHaveBeenCalledWith('community-1', 'fleet-1', 1);
    });

    it('asks for nothing where the address carries no segments', () => {
      params$.next(convertToParamMap({}));
      render();

      expect(scopes.resolveFleet).toHaveBeenCalledWith('', '', '');
    });

    it('reports a Fleet no Community holds as nothing to list', () => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved({ fleet: fleet({ communityId: null }) })),
      );
      render();

      expect(text()).toContain(ROSTER_IMPORT_LIST_MISSING);
      expect(imports.list).not.toHaveBeenCalled();
    });

    it('tells somebody who may not read imports so, without asking', () => {
      scopes.resolveFleet.mockReturnValue(of(resolved({ viewer: READER })));
      render();

      expect(text()).toContain(ROSTER_IMPORT_LIST_NOT_PERMITTED);
      expect(imports.list).not.toHaveBeenCalled();
      expect(navLinks()).toEqual([FLEET_HREF]);
    });

    it.each([
      [{}, 1],
      [{ page: '3' }, 3],
      [{ page: '0' }, 1],
      [{ page: '2.5' }, 1],
      [{ page: 'next' }, 1],
    ])(
      'reads page %j of the address as page %i',
      (query: Record<string, string>, expected: number) => {
        query$.next(convertToParamMap(query));
        render();

        expect(imports.list).toHaveBeenCalledWith(
          'community-1',
          'fleet-1',
          expected,
        );
      },
    );

    it('reads the imports again when the page changes', () => {
      render();
      query$.next(convertToParamMap({ page: '2' }));
      fixture.detectChanges();

      expect(imports.list).toHaveBeenLastCalledWith(
        'community-1',
        'fleet-1',
        2,
      );
    });
  });

  describe('the imports', () => {
    it('counts them and names the Fleet', () => {
      imports.list.mockReturnValue(of(page({ total: 41 })));
      render();

      expect(find('.header-count-badge')?.textContent).toContain('41');
      expect(find('.roster-imports__fleet a')?.getAttribute('href')).toBe(
        FLEET_HREF,
      );
    });

    it('links each import to its own page', () => {
      render();

      const item = find('.roster-imports__item');

      expect(item?.querySelector('a')?.getAttribute('href')).toBe(
        `${FLEET_HREF}/imports/import-1`,
      );
      expect(item?.textContent).toContain('Ninth Fleet_20240101-120000.Csv');
      expect(item?.textContent).toContain('Imported');
      expect(item?.textContent).toContain('jellico');
      expect(item?.textContent).toContain('Taken');
      expect(item?.textContent).toContain('212');
      expect(item?.textContent).not.toContain('Rows that could not be read');
    });

    it('says what it can of an import it knows less about', () => {
      imports.list.mockReturnValue(
        of(
          page({
            items: [
              summary({
                uploadedByName: null,
                exportedAt: null,
                problemCount: 3,
                status: RosterImportStatus.REFUSED,
              }),
            ],
          }),
        ),
      );
      render();

      const item = find('.roster-imports__item');

      expect(item?.textContent).toContain(ROSTER_IMPORT_UPLOADER_GONE);
      expect(item?.textContent).not.toContain('Taken');
      expect(item?.textContent).toContain('Rows that could not be read');
      expect(item?.textContent).toContain('Refused');
    });

    it('says so when nothing has been imported', () => {
      imports.list.mockReturnValue(of(page({ items: [], total: 0 })));
      render();

      expect(text()).toContain(ROSTER_IMPORT_LIST_EMPTY);
      expect(find('.roster-imports__list')).toBeNull();
    });

    it('offers an importer the way to import another', () => {
      render();

      expect(navLinks()).toEqual([`${FLEET_HREF}/import`, FLEET_HREF]);
    });

    it.each([
      ['an investigator', resolved({ viewer: INVESTIGATOR })],
      [
        'an importer on a platform with no export',
        resolved({ fleet: fleet({ platformProvidesRosterExport: false }) }),
      ],
    ])('offers no import to %s', (_: string, answer: ResolvedStoFleet) => {
      scopes.resolveFleet.mockReturnValue(of(answer));
      render();

      expect(imports.list).toHaveBeenCalled();
      expect(navLinks()).toEqual([FLEET_HREF]);
    });
  });

  describe('paging', () => {
    let navigate: jest.SpyInstance;

    beforeEach(() => {
      navigate = jest
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);
    });

    it('draws no pages for a listing that fits on one', () => {
      render();

      expect(find('.lcars-pagination')).toBeNull();
    });

    it('turns to the next page, keeping it in the address', () => {
      imports.list.mockReturnValue(of(page({ total: 45, page: 1 })));
      render();

      expect(text()).toContain('Page 1 of 3');
      expect(pageButton('Previous')?.disabled).toBe(true);

      pageButton('Next')?.click();

      expect(navigate).toHaveBeenCalledWith([], {
        relativeTo: route,
        queryParams: { page: 2 },
        queryParamsHandling: 'merge',
      });
    });

    // The first page has one address, and it is the one without a page.
    it('turns back to the first page by dropping the page', () => {
      imports.list.mockReturnValue(of(page({ total: 45, page: 2 })));
      render();

      pageButton('Previous')?.click();

      expect(navigate).toHaveBeenCalledWith([], {
        relativeTo: route,
        queryParams: { page: null },
        queryParamsHandling: 'merge',
      });
    });

    it('goes no further than the last page', () => {
      imports.list.mockReturnValue(of(page({ total: 45, page: 3 })));
      render();

      expect(pageButton('Next')?.disabled).toBe(true);
    });

    it('counts no pages where the server sent no page size', () => {
      imports.list.mockReturnValue(of(page({ total: 45, pageSize: 0 })));
      render();

      expect(find('.lcars-pagination')).toBeNull();
    });
  });
});
