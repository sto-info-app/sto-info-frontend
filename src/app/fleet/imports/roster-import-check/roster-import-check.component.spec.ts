import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';

import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';

import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterDateResolution,
  RosterFilenameRejection,
  RosterImportPreview,
  RosterProfession,
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
import { deviceTimezone } from 'src/app/shared/utils/timezone.utils';

import {
  ROSTER_CHECK_FAILED,
  RosterImportCheckComponent,
} from './roster-import-check.component';

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

/** Somebody who may look and nothing else, which is most readers. */
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
 * Builds a date as the server reports one.
 *
 * @param local - The local time the file wrote, or null when absent.
 * @param candidates - The instants it could name.
 * @returns The date.
 */
function date(local: string | null, ...candidates: string[]) {
  const resolution =
    local === null
      ? RosterDateResolution.ABSENT
      : candidates.length > 1
        ? RosterDateResolution.AMBIGUOUS
        : RosterDateResolution.EXACT;

  return { resolution, local, candidates };
}

/**
 * Builds a preview as the server would send one.
 *
 * @param overrides - Fields to override.
 * @returns The preview.
 */
function preview(
  overrides: Partial<RosterImportPreview> = {},
): RosterImportPreview {
  return {
    canImport: true,
    timezone: 'Europe/London',
    filename: {
      rejection: null,
      fleetLabel: 'Ninth Fleet',
      localStamp: '2024-01-01T12:00:00',
      exportedAt: '2024-01-01T12:00:00.000Z',
      exportedAtCandidates: ['2024-01-01T12:00:00.000Z'],
      matchedAlias: null,
    },
    source: {
      headerShape: RosterSourceHeaderShape.NORMAL,
      rowCount: 2,
      officerTailRowCount: 0,
      parserVersion: 1,
      sourceSha256: 'a'.repeat(64),
      sourceByteSize: 512,
    },
    readableRowCount: 2,
    unknownClassCount: 0,
    ambiguousDateCount: 0,
    problems: [],
    sample: [
      {
        line: 2,
        characterName: 'Vex Loran',
        accountHandle: '@vexloran',
        level: 65,
        className: 'Starfleet Tactical Officer',
        profession: RosterProfession.TACTICAL,
        guildRank: 'Member',
        contributionTotal: 5000,
        joinedAt: date('2023-04-01T12:00:00', '2023-04-01T11:00:00.000Z'),
        rankChangedAt: date(null),
        lastActiveAt: date('2024-01-05T13:00:00', '2024-01-05T13:00:00.000Z'),
      },
    ],
    ...overrides,
  };
}

/** An export, named the way the game names one. */
const FILE = new File(['bytes'], 'Ninth Fleet_20240101-120000.Csv');

describe('RosterImportCheckComponent', () => {
  let fixture: ComponentFixture<RosterImportCheckComponent>;
  let component: RosterImportCheckComponent;
  let params$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let imports: { preview: jest.Mock };

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(
      convertToParamMap({
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        slug: 'ninth-fleet',
      }),
    );
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    imports = { preview: jest.fn(() => of(preview())) };

    await TestBed.configureTestingModule({
      imports: [RosterImportCheckComponent],
      providers: [
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: RosterImportService, useValue: imports },
        { provide: ActivatedRoute, useValue: { paramMap: params$ } },
      ],
    }).compileComponents();
  });

  /** Renders the page. */
  function render(): void {
    fixture = TestBed.createComponent(RosterImportCheckComponent);
    component = fixture.componentInstance;
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

  /** What the page currently says. */
  const text = (): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  /**
   * Chooses a file and redraws.
   *
   * Through the component's own handler rather than a real file input: no
   * browser lets a script put a file into one, and what is being tested is
   * what the page does with the choice.
   *
   * @param file - The export, or null for a cleared control.
   */
  function choose(file: File | null): void {
    component.onFileChosen({
      target: { files: file === null ? null : [file] },
    } as unknown as Event);
    fixture.detectChanges();
  }

  /** Presses the check button. */
  function check(): void {
    (find('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  describe('reading the Fleet', () => {
    it('says it is loading before the server has answered', () => {
      scopes.resolveFleet.mockReturnValue(NEVER);
      render();

      expect(find('app-loading-bar')).not.toBeNull();
    });

    it('treats an address nothing answers to as news rather than a fault', () => {
      scopes.resolveFleet.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );
      render();

      expect(find('app-lcars-information-message')).not.toBeNull();
      expect(text()).toContain('No Fleet here answers to that address');
    });

    it('reports an outage as one', () => {
      scopes.resolveFleet.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();

      expect(find('app-lcars-error-message')).not.toBeNull();
      expect(text()).toContain('This Fleet could not be read');
    });

    // The address always carries all three, and asking for nothing is how
    // the page behaves if it ever does not: the server answers that nothing
    // is there, which is the truth.
    it('asks for nothing where the address carries no segments', () => {
      params$.next(convertToParamMap({}));
      render();

      expect(scopes.resolveFleet).toHaveBeenCalledWith('', '', '');
    });

    it('names the Fleet and links back to it', () => {
      render();

      const link = find('.roster-check__fleet a');

      expect(link?.textContent).toContain('Ninth Fleet');
      expect(link?.getAttribute('href')).toBe(
        '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet',
      );
    });
  });

  describe('a Fleet that cannot take one', () => {
    it('says so where no Community has registered the Fleet', () => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved({ fleet: fleet({ communityId: null }) })),
      );
      render();

      expect(text()).toContain('Nothing to import into');
      expect(find('form')).toBeNull();
    });

    // The reader may well be the Fleet leader who has spent ten minutes
    // looking for a menu that is not there.
    it('names the platform the game writes no export on', () => {
      scopes.resolveFleet.mockReturnValue(
        of(
          resolved({
            fleet: fleet({
              platformProvidesRosterExport: false,
              platformName: 'PlayStation',
            }),
          }),
        ),
      );
      render();

      expect(text()).toContain(
        'The game provides no fleet roster export on PlayStation',
      );
      expect(find('form')).toBeNull();
    });

    it('tells a reader who may not import, rather than offering a control', () => {
      scopes.resolveFleet.mockReturnValue(of(resolved({ viewer: READER })));
      render();

      expect(text()).toContain('Not yours to import');
      expect(find('form')).toBeNull();
    });

    it('offers a way back rather than a dead end', () => {
      scopes.resolveFleet.mockReturnValue(of(resolved({ viewer: READER })));
      render();

      expect(fixture.nativeElement.querySelectorAll('nav a')).toHaveLength(2);
    });
  });

  describe('the form', () => {
    it('starts on the clock this device is set to', () => {
      render();

      expect(component.form.controls.timezone.value).toBe(deviceTimezone());
    });

    it('offers every zone the browser can convert with', () => {
      render();

      expect(component.timezones).toContain('UTC');
      expect(component.timezones.length).toBeGreaterThan(1);
    });

    it('labels a zone with the offset it is on', () => {
      render();

      expect(component.label('UTC')).toContain('UTC');
    });

    it('will not check before a file has been chosen', () => {
      render();

      expect(
        (find('button[type="submit"]') as HTMLButtonElement).disabled,
      ).toBe(true);
    });

    it('takes the file the reader chose', () => {
      render();
      choose(FILE);

      expect(component.selectedFile).toBe(FILE);
      expect(
        (find('button[type="submit"]') as HTMLButtonElement).disabled,
      ).toBe(false);
    });

    it('takes no file from a cleared control', () => {
      render();
      choose(null);

      expect(component.selectedFile).toBeNull();
    });

    // An answer drawn beside a different file than the one it describes is
    // worse than no answer.
    it('forgets the last answer when a new file is chosen', () => {
      render();
      choose(FILE);
      check();

      expect(component.preview).not.toBeNull();

      choose(FILE);

      expect(component.preview).toBeNull();
    });

    it('sends the file and the chosen zone', () => {
      render();
      component.form.controls.timezone.setValue('America/New_York');
      choose(FILE);
      check();

      expect(imports.preview).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        FILE,
        'America/New_York',
      );
    });

    it('checks nothing when nothing has been chosen', () => {
      render();
      component.onSubmit({ kind: 'LOADING' });

      expect(imports.preview).not.toHaveBeenCalled();
    });

    it('checks nothing without a zone to read the dates through', () => {
      render();
      choose(FILE);
      component.form.controls.timezone.setValue('');
      check();

      expect(imports.preview).not.toHaveBeenCalled();
    });
  });

  describe('what the server made of it', () => {
    it('says an export is ready, and that nothing was kept', () => {
      render();
      choose(FILE);
      check();

      expect(find('app-lcars-success-message')).not.toBeNull();
      expect(text()).toContain('reads as 2 members');
      expect(text()).toContain('Nothing has');
    });

    it('draws each date as the file wrote it and as it was read', () => {
      render();
      choose(FILE);
      check();

      expect(text()).toContain('2023-04-01T12:00:00');
      expect(text()).toContain('2023-04-01T11:00:00.000Z');
    });

    it('says plainly where a date column was empty', () => {
      render();
      choose(FILE);
      check();

      expect(text()).toContain('Not recorded');
    });

    it('draws both readings of a date the clock went back over', () => {
      imports.preview.mockReturnValue(
        of(
          preview({
            ambiguousDateCount: 1,
            sample: [
              {
                ...preview().sample[0],
                joinedAt: date(
                  '2026-10-25T01:30:00',
                  '2026-10-25T00:30:00.000Z',
                  '2026-10-25T01:30:00.000Z',
                ),
              },
            ],
          }),
        ),
      );
      render();
      choose(FILE);
      check();

      expect(text()).toContain(
        '2026-10-25T00:30:00.000Z or 2026-10-25T01:30:00.000Z',
      );
      expect(text()).toContain('Rows with an ambiguous date');
    });

    // Nobody's mistake. The file is fine and the question is still open.
    it('asks which moment an ambiguous export stamp names', () => {
      imports.preview.mockReturnValue(
        of(
          preview({
            canImport: false,
            filename: {
              ...preview().filename,
              exportedAt: null,
              exportedAtCandidates: [
                '2026-10-25T00:30:00.000Z',
                '2026-10-25T01:30:00.000Z',
              ],
            },
          }),
        ),
      );
      render();
      choose(FILE);
      check();

      expect(find('app-lcars-warning-message')).not.toBeNull();
      expect(text()).toContain('Two moments');
      expect(text()).toContain('The clocks went back over that hour');
    });

    it('says why a filename is evidence of nothing', () => {
      imports.preview.mockReturnValue(
        of(
          preview({
            canImport: false,
            filename: {
              ...preview().filename,
              rejection: RosterFilenameRejection.SHAPE_UNRECOGNISED,
            },
          }),
        ),
      );
      render();
      choose(FILE);
      check();

      expect(text()).toContain('This is not the name the game gave the file');
    });

    it('names a former name the filename matched', () => {
      imports.preview.mockReturnValue(
        of(
          preview({
            filename: { ...preview().filename, matchedAlias: 'The SCC' },
          }),
        ),
      );
      render();
      choose(FILE);
      check();

      expect(text()).toContain('Former name matched');
      expect(text()).toContain('The SCC');
    });

    it('lists every row that could not be read', () => {
      imports.preview.mockReturnValue(
        of(
          preview({
            canImport: false,
            problems: [
              {
                code: RosterRowRejection.DATE_MALFORMED,
                line: 4,
                column: 'Join Date',
              },
              {
                code: RosterRowRejection.DUPLICATE_IDENTITY,
                line: 7,
                column: null,
              },
            ],
          }),
        ),
      );
      render();
      choose(FILE);
      check();

      expect(text()).toContain('Line 4');
      expect(text()).toContain('Join Date');
      expect(text()).toContain('Line 7');
      expect(text()).toContain('Another row carries the same Character');
    });

    // ADR-0001 requires the product to say plainly that officer columns are
    // discarded. A number is the least deniable way of saying it.
    it('says how many officer notes were discarded', () => {
      imports.preview.mockReturnValue(
        of(
          preview({
            source: {
              ...preview().source,
              headerShape: RosterSourceHeaderShape.OFFICER,
              officerTailRowCount: 7,
            },
          }),
        ),
      );
      render();
      choose(FILE);
      check();

      expect(text()).toContain('Officer notes discarded');
      expect(text()).toContain('discarded before anything else reads the file');
    });

    it('reports a Class it could read no profession from', () => {
      imports.preview.mockReturnValue(of(preview({ unknownClassCount: 1 })));
      render();
      choose(FILE);
      check();

      expect(text()).toContain('Classes not recognised');
    });

    it('draws no sample where no row could be read', () => {
      imports.preview.mockReturnValue(
        of(preview({ canImport: false, readableRowCount: 0, sample: [] })),
      );
      render();
      choose(FILE);
      check();

      expect(find('.roster-check__sample')).toBeNull();
    });
  });

  describe('when the check itself fails', () => {
    /**
     * Makes the server refuse the file.
     *
     * @param body - What it answers with.
     * @param status - The status it answers with.
     */
    function refuse(body: unknown, status = 400): void {
      imports.preview.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status, error: body })),
      );
    }

    it('says what a structural refusal means', () => {
      refuse({ code: 'HEADER_UNRECOGNISED', line: 1 });
      render();
      choose(FILE);
      check();

      expect(text()).toContain(
        'not the heading an STO roster export starts with',
      );
      expect(text()).toContain('(Line 1.)');
    });

    it('names no line where the refusal belongs to no line', () => {
      refuse({ code: 'FILE_EMPTY', line: null });
      render();
      choose(FILE);
      check();

      expect(text()).toContain('That file has nothing in it.');
      expect(text()).not.toContain('(Line');
    });

    it('falls back where the code is one it does not know', () => {
      refuse({ code: 'SOMETHING_NEW' });
      render();
      choose(FILE);
      check();

      expect(text()).toContain('could not be read as an STO roster export');
    });

    it('falls back where there is no code at all', () => {
      refuse(null);
      render();
      choose(FILE);
      check();

      expect(text()).toContain('could not be read as an STO roster export');
    });

    it('reports an outage as one rather than as a bad file', () => {
      refuse({ code: 'HEADER_UNRECOGNISED' }, 503);
      render();
      choose(FILE);
      check();

      expect(text()).toContain(ROSTER_CHECK_FAILED);
    });
  });
});
