import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';

import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';

import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterDateResolution,
  RosterFilenameRejection,
  RosterImportPreview,
  RosterImportStatus,
  RosterImportSummary,
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
import {
  describeTimezone,
  deviceTimezone,
} from 'src/app/shared/utils/timezone.utils';

import {
  ROSTER_CHECK_FAILED,
  ROSTER_IMPORT_FAILED,
  RosterImportComponent,
} from './roster-import.component';

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

describe('RosterImportComponent', () => {
  let fixture: ComponentFixture<RosterImportComponent>;
  let component: RosterImportComponent;
  let params$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let imports: { preview: jest.Mock; upload: jest.Mock };

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(
      convertToParamMap({
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        slug: 'ninth-fleet',
      }),
    );
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    imports = {
      preview: jest.fn(() => of(preview())),
      upload: jest.fn(() =>
        of({
          summary: {
            id: 'import-9',
            status: RosterImportStatus.SCANNING,
          } as RosterImportSummary,
          repeated: false,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [RosterImportComponent],
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
    fixture = TestBed.createComponent(RosterImportComponent);
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

      const link = find('.roster-import__fleet a');

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

      expect(find('app-lcars-success-message')).not.toBeNull();
      expect(text()).toContain('Two moments');
      expect(text()).toContain('The clocks went back over that hour');
      expect(findAll('input[name="roster-moment"]')).toHaveLength(2);
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

      expect(find('.roster-import__sample')).toBeNull();
    });
  });

  describe('importing it', () => {
    /** An export whose stamp the clock went back over. */
    const AMBIGUOUS = preview({
      canImport: false,
      filename: {
        ...preview().filename,
        localStamp: '2026-10-25T01:30:00',
        exportedAt: null,
        exportedAtCandidates: [
          '2026-10-25T00:30:00.000Z',
          '2026-10-25T01:30:00.000Z',
        ],
      },
    });

    let navigate: jest.SpyInstance;

    beforeEach(() => {
      navigate = jest
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);
    });

    /** Finds the button that imports, if there is one. */
    const importButton = (): HTMLButtonElement | undefined =>
      findAll('button').find(button =>
        button.textContent?.includes('Import this export'),
      ) as HTMLButtonElement | undefined;

    /** Checks the chosen file and presses the import button. */
    function checkAndImport(): void {
      render();
      choose(FILE);
      check();
      importButton()?.click();
      fixture.detectChanges();
    }

    /**
     * Makes the server refuse the upload.
     *
     * @param body - What it answers with.
     * @param status - The status it answers with.
     */
    function refuseUpload(body: unknown, status: number): void {
      imports.upload.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status, error: body })),
      );
    }

    it('says what the page is for', () => {
      render();

      expect(text()).toContain('Import a roster export');
      expect(text()).toContain('Nothing is kept until you import it');
    });

    it('offers nothing to import before an export has been checked', () => {
      render();
      choose(FILE);

      expect(importButton()).toBeUndefined();
    });

    it('offers nothing to import where the check found a fault', () => {
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
            ],
          }),
        ),
      );
      render();
      choose(FILE);
      check();

      expect(importButton()).toBeUndefined();
      expect(find('app-lcars-warning-message')).not.toBeNull();
    });

    // Two moments on a stamp the filename cannot vouch for is a fault, not a
    // question: the name is evidence of nothing.
    it('offers nothing to import where the filename is evidence of nothing', () => {
      imports.preview.mockReturnValue(
        of(
          preview({
            ...AMBIGUOUS,
            filename: {
              ...AMBIGUOUS.filename,
              rejection: RosterFilenameRejection.FLEET_NAME_MISMATCH,
            },
          }),
        ),
      );
      render();
      choose(FILE);
      check();

      expect(importButton()).toBeUndefined();
    });

    it('sends the checked file through the zone it was checked in', () => {
      render();
      component.form.controls.timezone.setValue('America/New_York');
      imports.preview.mockReturnValue(
        of(preview({ timezone: 'America/New_York' })),
      );
      choose(FILE);
      check();
      importButton()?.click();

      expect(imports.upload).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        FILE,
        'America/New_York',
        null,
      );
    });

    it.each([false, true])(
      'goes to the import it made, saying whether it was a repeat (%s)',
      (repeated: boolean) => {
        imports.upload.mockReturnValue(
          of({ summary: { id: 'import-9' } as RosterImportSummary, repeated }),
        );
        checkAndImport();

        expect(navigate).toHaveBeenCalledWith(
          [
            '/fleets',
            'communities',
            'united-federation-alliance',
            'fleets',
            'pc',
            'ninth-fleet',
            'investigate',
            'imports',
            'import-9',
          ],
          { state: { rosterImportRepeated: repeated } },
        );
      },
    );

    it('says it is sending, and will not send twice at once', () => {
      imports.upload.mockReturnValue(NEVER);
      checkAndImport();

      expect(text()).toContain('Sending the export');
      expect(importButton()?.disabled).toBe(true);
      expect(
        (find('button[type="submit"]') as HTMLButtonElement).disabled,
      ).toBe(true);
    });

    // A check read through one zone says nothing about another.
    it('forgets the check when the zone changes', () => {
      render();
      choose(FILE);
      check();

      expect(importButton()).toBeDefined();

      component.form.controls.timezone.setValue('Asia/Tokyo');
      fixture.detectChanges();

      expect(component.preview).toBeNull();
      expect(importButton()).toBeUndefined();
    });

    describe('a stamp the clock went back over', () => {
      beforeEach(() => {
        imports.preview.mockReturnValue(of(AMBIGUOUS));
      });

      it('will not import until a moment has been chosen', () => {
        render();
        choose(FILE);
        check();

        expect(importButton()?.disabled).toBe(true);

        component.onImport({ kind: 'LOADING' });
        component.onImport({
          kind: 'READY',
          fleet: fleet(),
          communityId: 'community-1',
          communitySlug: 'united-federation-alliance',
          platformSegment: 'pc',
          fleetLink: [],
          block: null,
        });

        expect(imports.upload).not.toHaveBeenCalled();
      });

      it('labels each moment with the offset it was on', () => {
        render();
        choose(FILE);
        check();

        expect(
          component.momentLabel(AMBIGUOUS, '2026-10-25T00:30:00.000Z'),
        ).toBe(
          '2026-10-25T01:30:00 ' +
            describeTimezone(
              'Europe/London',
              new Date('2026-10-25T00:30:00.000Z'),
            ) +
            ', which is 2026-10-25T00:30:00.000Z',
        );
        expect(
          findAll('.roster-import__moment').map(label => label.textContent),
        ).toHaveLength(2);
      });

      it('sends the moment chosen', () => {
        render();
        choose(FILE);
        check();

        const second = findAll('input[name="roster-moment"]')[1];

        second.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(component.chosenExportedAt).toBe('2026-10-25T01:30:00.000Z');
        expect(importButton()?.disabled).toBe(false);

        importButton()?.click();

        expect(imports.upload).toHaveBeenCalledWith(
          'community-1',
          'fleet-1',
          FILE,
          'Europe/London',
          '2026-10-25T01:30:00.000Z',
        );
      });

      it('forgets the moment chosen with the file', () => {
        render();
        choose(FILE);
        check();
        component.onChooseMoment('2026-10-25T00:30:00.000Z');
        choose(FILE);

        expect(component.chosenExportedAt).toBeNull();
      });
    });

    describe('when the import is refused', () => {
      it('points to the earlier import a repeat read differently', () => {
        refuseUpload(
          {
            code: 'ALREADY_IMPORTED_DIFFERENTLY',
            importId: 'import-1',
            exportTimezone: 'Europe/Paris',
            exportLocalStamp: '2024-01-01T12:00:00',
            exportedAt: '2024-01-01T11:00:00.000Z',
          },
          409,
        );
        checkAndImport();

        expect(text()).toContain('Already imported');
        expect(text()).toContain('read as 2024-01-01T12:00:00 Europe/Paris');
        expect(find('.roster-import__earlier a')?.getAttribute('href')).toBe(
          '/fleets/communities/united-federation-alliance/fleets/pc/' +
            'ninth-fleet/investigate/imports/import-1',
        );
        expect(navigate).not.toHaveBeenCalled();
        expect(importButton()?.disabled).toBe(false);
      });

      it('leaves out a reading the earlier import never recorded', () => {
        refuseUpload(
          {
            code: 'ALREADY_IMPORTED_DIFFERENTLY',
            importId: 'import-1',
            exportTimezone: null,
            exportLocalStamp: null,
            exportedAt: null,
          },
          409,
        );
        checkAndImport();

        expect(text()).toContain(
          'This export has already been imported into this Fleet. That',
        );
      });

      it.each([
        [{ code: 'SOMETHING_ELSE', importId: 'import-1' }],
        [{ code: 'ALREADY_IMPORTED_DIFFERENTLY' }],
        [null],
      ])('treats any other conflict as a failure (%j)', body => {
        refuseUpload(body, 409);
        checkAndImport();

        expect(text()).toContain(ROSTER_IMPORT_FAILED);
        expect(find('.roster-import__earlier')).toBeNull();
      });

      it('says what a structural refusal means', () => {
        refuseUpload({ code: 'STAMP_CHOICE_REQUIRED', line: null }, 400);
        checkAndImport();

        expect(text()).toContain('Not imported');
        expect(text()).toContain('Choose which one before importing');
      });

      it('falls back where a refusal carries nothing', () => {
        refuseUpload(null, 400);
        checkAndImport();

        expect(text()).toContain('could not be read as an STO roster export');
      });

      it('reports an outage as one', () => {
        refuseUpload({ code: 'HEADER_UNRECOGNISED' }, 503);
        checkAndImport();

        expect(text()).toContain(ROSTER_IMPORT_FAILED);
      });

      it('forgets the failure when the export is checked again', () => {
        refuseUpload(null, 503);
        checkAndImport();
        check();

        expect(component.importError).toBeNull();
      });
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
