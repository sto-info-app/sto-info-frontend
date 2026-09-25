import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';

import { BehaviorSubject, of } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterService } from 'src/app/fleet/roster/roster.service';
import { RosterProfession } from 'src/app/models/fleet-import.models';
import {
  RosterPage,
  RosterRow,
  RosterSort,
  RosterSortDirection,
} from 'src/app/models/fleet-roster.models';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

import {
  ROSTER_NOT_PERMITTED,
  RosterPageComponent,
  rosterQueryOf,
} from './roster-page.component';

const NOV_15 = '2024-11-15T12:00:00.000Z';
const DEC_1 = '2024-12-01T12:00:00.000Z';

/**
 * Builds the Fleet as the server resolves it, for a reader holding some
 * capabilities.
 *
 * @param capabilities - What they hold.
 * @returns The resolved Fleet.
 */
function resolved(capabilities: string[] = ['roster.view']): ResolvedStoFleet {
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
 * Builds a row.
 *
 * @param overrides - Fields to change.
 * @returns The row.
 */
function row(overrides: Partial<RosterRow> = {}): RosterRow {
  return {
    line: 2,
    identityId: 'identity-1',
    identityRows: 1,
    characterName: 'Tova Reen',
    accountHandle: '@fixture004',
    level: 65,
    className: 'Science Officer',
    profession: RosterProfession.SCIENCE,
    guildRank: 'Member',
    rankTier: null,
    contributionTotal: '4415000',
    joinedAt: '2022-07-07T08:00:00.000Z',
    joinedAtAmbiguous: false,
    rankChangedAt: null,
    rankChangedAtAmbiguous: false,
    lastActiveAt: '2024-11-29T20:00:00.000Z',
    lastActiveAtAmbiguous: false,
    status: 'Offline',
    publicComment: 'Here for the Tholians',
    publicCommentEditedAt: null,
    excluded: false,
    profile: null,
    ...overrides,
  };
}

/**
 * Builds a page of the roster.
 *
 * @param overrides - Fields to change.
 * @returns The page.
 */
function rosterPage(overrides: Partial<RosterPage> = {}): RosterPage {
  return {
    revision: 17,
    publishedAt: '2026-09-25T00:30:00.000Z',
    stale: false,
    coverage: {
      exports: 2,
      first: { importId: 'import-1', exportedAt: NOV_15 },
      latest: { importId: 'import-2', exportedAt: DEC_1 },
    },
    export: {
      importId: 'import-2',
      exportedAt: DEC_1,
      partial: false,
      previous: { importId: 'import-1', exportedAt: NOV_15 },
      next: null,
    },
    ranks: [
      { label: 'Officer', tier: 1, members: 1 },
      { label: 'Member', tier: null, members: 5 },
    ],
    items: [row()],
    total: 1,
    page: 1,
    pageSize: 50,
    ...overrides,
  };
}

describe('RosterPageComponent', () => {
  let fixture: ComponentFixture<RosterPageComponent>;
  let query$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let roster: { roster: jest.Mock };
  let navigate: jest.SpyInstance;

  beforeEach(async () => {
    query$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    roster = { roster: jest.fn(() => of(rosterPage())) };

    await TestBed.configureTestingModule({
      imports: [RosterPageComponent],
      providers: [
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: RosterService, useValue: roster },
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
    fixture = TestBed.createComponent(RosterPageComponent);
    fixture.detectChanges();
  }

  /** The page as drawn. */
  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /** What the page says. */
  const text = (): string => page().textContent ?? '';

  /**
   * Reads one body row's cells.
   *
   * @param index - Which row.
   * @returns Each cell's text, by its column's label.
   */
  function cells(index = 0): Record<string, string> {
    const rowElement = page().querySelectorAll('tbody tr')[index];

    return Object.fromEntries(
      Array.from(rowElement.querySelectorAll('td')).map(cell => [
        cell.getAttribute('data-label'),
        (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
      ]),
    );
  }

  /**
   * Finds a button by what it says.
   *
   * @param label - Its text.
   * @returns The button.
   */
  function button(label: string): HTMLButtonElement {
    return Array.from(page().querySelectorAll('button')).find(
      candidate => candidate.textContent?.trim() === label,
    ) as HTMLButtonElement;
  }

  /**
   * Reads the query the page last navigated with.
   *
   * @returns The query parameters it asked to change.
   */
  function navigatedWith(): Record<string, unknown> {
    const [, extras] = navigate.mock.calls.at(-1) as [
      unknown[],
      { queryParams: Record<string, unknown> },
    ];

    return extras.queryParams;
  }

  describe('asking for the roster', () => {
    it('asks for the latest export, first page, by name, by default', () => {
      render();

      expect(roster.roster).toHaveBeenCalledWith('community-1', 'fleet-1', {
        asOf: undefined,
        page: 1,
        sort: RosterSort.NAME,
        direction: RosterSortDirection.ASC,
        search: undefined,
        rank: undefined,
      });
    });

    it('asks for what the address says', () => {
      query$.next(
        convertToParamMap({
          asOf: NOV_15,
          page: '3',
          sort: 'CONTRIBUTION',
          dir: 'desc',
          q: 'tova',
          rank: 'Member',
        }),
      );
      render();

      expect(roster.roster).toHaveBeenCalledWith('community-1', 'fleet-1', {
        asOf: NOV_15,
        page: 3,
        sort: RosterSort.CONTRIBUTION,
        direction: RosterSortDirection.DESC,
        search: 'tova',
        rank: 'Member',
      });
    });

    it.each([
      ['a page that is not one', { page: 'lots' }, 'page', 1],
      ['a page before the first', { page: '0' }, 'page', 1],
      [
        'an ordering that is not one',
        { sort: 'SHOE_SIZE' },
        'sort',
        RosterSort.NAME,
      ],
      [
        'a direction that is not one',
        { dir: 'up' },
        'direction',
        RosterSortDirection.ASC,
      ],
    ])('reads %s as the default', (_, params, key, value) => {
      expect(
        rosterQueryOf(convertToParamMap(params))[
          key as keyof ReturnType<typeof rosterQueryOf>
        ],
      ).toBe(value);
    });

    it('tells a reader who is not a member so, without asking', () => {
      scopes.resolveFleet.mockReturnValue(of(resolved([])));
      render();

      expect(text()).toContain(ROSTER_NOT_PERMITTED);
      expect(roster.roster).not.toHaveBeenCalled();
    });
  });

  describe('the rows', () => {
    it('draws every column a member may read', () => {
      render();

      expect(cells()).toEqual({
        Character: 'Tova Reen',
        Handle: '@fixture004',
        Rank: 'Member',
        Level: '65',
        Joined: 'Jul 7, 2022',
        Contribution: '4,415,000',
        'Last Active': 'Nov 29, 2024',
        Comment: 'Here for the Tholians',
      });
    });

    it('writes a total larger than a number holds, exactly', () => {
      roster.roster.mockReturnValue(
        of(
          rosterPage({
            items: [row({ contributionTotal: '9007199254740993' })],
          }),
        ),
      );
      render();

      expect(cells()['Contribution']).toBe('9,007,199,254,740,993');
    });

    it('says a rank’s tier, a second row of one member, and an exclusion', () => {
      roster.roster.mockReturnValue(
        of(
          rosterPage({
            items: [
              row({
                rankTier: 1,
                guildRank: 'Officer',
                identityRows: 2,
                excluded: true,
              }),
            ],
          }),
        ),
      );
      render();

      expect(cells()['Rank']).toBe('Officer tier 1');
      expect(cells()['Character']).toBe(
        'Tova Reen one of 2 rows for this member excluded by an investigator',
      );
      expect(
        page()
          .querySelector('tbody tr')
          ?.classList.contains('roster-page__excluded'),
      ).toBe(true);
    });

    it('links a row to its Character’s registry page where the rule allows', () => {
      roster.roster.mockReturnValue(
        of(
          rosterPage({
            items: [
              row({
                profile: {
                  username: 'tova',
                  accountSlug: 'fixture004',
                  characterSlug: 'tova-reen@fixture004',
                },
              }),
            ],
          }),
        ),
      );
      render();

      expect(
        page().querySelector('.roster-page__profile')?.getAttribute('href'),
      ).toBe(
        '/community/registry/profiles/tova/fixture004/tova-reen@fixture004',
      );
    });

    it('links each name to that member’s timeline', () => {
      render();

      expect(
        page().querySelector('a.roster-page__name')?.getAttribute('href'),
      ).toBe(
        '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/history/members/identity-1',
      );
    });

    it('leaves a row with no member found unlinked', () => {
      roster.roster.mockReturnValue(
        of(rosterPage({ items: [row({ identityId: null })] })),
      );
      render();

      expect(page().querySelector('a.roster-page__name')).toBeNull();
      expect(page().querySelector('span.roster-page__name')?.textContent).toBe(
        'Tova Reen',
      );
    });

    it('links nothing where the rule does not allow', () => {
      render();

      expect(page().querySelector('.roster-page__profile')).toBeNull();
    });

    it('says when nobody on the export matches', () => {
      roster.roster.mockReturnValue(of(rosterPage({ items: [], total: 0 })));
      render();

      expect(text()).toContain('Nobody on this export matches that.');
      expect(page().querySelector('table')).toBeNull();
    });

    it('counts the rows that match', () => {
      roster.roster.mockReturnValue(
        of(rosterPage({ items: [row(), row({ line: 3 })], total: 2 })),
      );
      render();

      expect(page().querySelector('caption')?.textContent).toContain('2 rows');
    });

    it('counts one row as a row', () => {
      render();

      expect(page().querySelector('caption')?.textContent?.trim()).toBe(
        '1 row',
      );
    });
  });

  describe('which export', () => {
    it('names the export shown and offers the one before', () => {
      render();

      expect(text()).toContain('As listed on');
      expect(text()).toContain('Dec 1, 2024');
      expect(button('Earlier export').disabled).toBe(false);
      expect(button('Later export').disabled).toBe(true);
      // Already the latest.
      expect(button('Latest').disabled).toBe(true);
    });

    it('says an export was partial', () => {
      roster.roster.mockReturnValue(
        of(
          rosterPage({
            export: { ...rosterPage().export!, partial: true },
          }),
        ),
      );
      render();

      expect(text()).toContain('partial: somebody missing from it may still');
    });

    it('steps to the export before, by its instant', () => {
      render();
      button('Earlier export').click();

      expect(navigatedWith()).toEqual({ asOf: NOV_15, page: null });
    });

    it('steps to the export after, and back to the latest', () => {
      query$.next(convertToParamMap({ asOf: NOV_15 }));
      roster.roster.mockReturnValue(
        of(
          rosterPage({
            export: {
              importId: 'import-1',
              exportedAt: NOV_15,
              partial: false,
              previous: null,
              next: { importId: 'import-2', exportedAt: DEC_1 },
            },
          }),
        ),
      );
      render();

      button('Later export').click();
      expect(navigatedWith()).toEqual({ asOf: DEC_1, page: null });

      button('Latest').click();
      expect(navigatedWith()).toEqual({ asOf: null, page: null });
    });

    it('shows the day picked, bounded by the first and latest exports', () => {
      render();

      const day = page().querySelector<HTMLInputElement>('#roster-day')!;

      expect(day.value).toBe('2024-12-01');
      expect(day.min).toBe('2024-11-15');
      expect(day.max).toBe('2024-12-01');
    });

    it('asks for the end of the day picked, in the reader’s timezone', () => {
      render();

      const day = page().querySelector<HTMLInputElement>('#roster-day')!;

      day.value = '2024-07-15';
      day.dispatchEvent(new Event('change'));

      // The end of 15 July in London, in summer time.
      expect(navigatedWith()).toEqual({
        asOf: '2024-07-15T22:59:59.999Z',
        page: null,
      });
    });

    it('goes back to the latest when the day is cleared', () => {
      render();

      const day = page().querySelector<HTMLInputElement>('#roster-day')!;

      day.value = '';
      day.dispatchEvent(new Event('change'));

      expect(navigatedWith()).toEqual({ asOf: null, page: null });
    });

    it('says no export had been taken by a day before the first', () => {
      roster.roster.mockReturnValue(
        of(rosterPage({ export: null, items: [], total: 0 })),
      );
      render();

      expect(text()).toContain('No export had been taken by then.');
      expect(text()).toContain('Nov 15, 2024');
      expect(page().querySelector<HTMLInputElement>('#roster-day')!.value).toBe(
        '',
      );
      expect(page().querySelector('form')).toBeNull();
    });

    it('says a Fleet has no roster history yet', () => {
      roster.roster.mockReturnValue(
        of(
          rosterPage({
            revision: 0,
            coverage: { exports: 0, first: null, latest: null },
            export: null,
            items: [],
            total: 0,
          }),
        ),
      );
      render();

      expect(text()).toContain(
        'No roster has been read into this Fleet’s history yet.',
      );
      expect(page().querySelector('#roster-day')).toBeNull();
    });

    it('says a newer history is on its way', () => {
      roster.roster.mockReturnValue(of(rosterPage({ stale: true })));
      render();

      expect(text()).toContain('A change is being worked into the history.');
    });
  });

  describe('ordering', () => {
    /**
     * Presses a column's header.
     *
     * @param label - The column.
     */
    function press(label: string): void {
      button(label).click();
    }

    it('says how the roster is ordered', () => {
      render();

      const headers = Array.from(page().querySelectorAll('th[aria-sort]'));

      expect(headers.map(header => header.getAttribute('aria-sort'))).toEqual([
        'ascending',
        'none',
        'none',
        'none',
        'none',
        'none',
        'none',
      ]);
    });

    it('orders by a new column its first way', () => {
      render();
      press('Contribution');

      expect(navigatedWith()).toEqual({
        sort: RosterSort.CONTRIBUTION,
        dir: 'desc',
        page: null,
      });
    });

    it('turns the ordering round on a second press, naming no default', () => {
      render();
      press('Character');

      expect(navigatedWith()).toEqual({ sort: null, dir: 'desc', page: null });
    });

    it('turns a descending ordering round to ascending', () => {
      query$.next(convertToParamMap({ sort: 'LEVEL', dir: 'desc' }));
      render();

      expect(
        page().querySelectorAll('th[aria-sort]')[3].getAttribute('aria-sort'),
      ).toBe('descending');

      press('Level');

      expect(navigatedWith()).toEqual({
        sort: RosterSort.LEVEL,
        dir: 'asc',
        page: null,
      });
    });
  });

  describe('finding', () => {
    it('offers each rank on the export, with its count', () => {
      render();

      const options = Array.from(
        page().querySelectorAll('#roster-rank option'),
      ).map(option => option.textContent?.trim());

      expect(options).toEqual(['Every rank', 'Officer (1)', 'Member (5)']);
    });

    it('searches and filters from the first page', () => {
      render();

      page().querySelector<HTMLInputElement>('#roster-search')!.value =
        '  tova  ';
      page().querySelector<HTMLSelectElement>('#roster-rank')!.value = 'Member';
      page().querySelector('form')!.dispatchEvent(new Event('submit'));

      expect(navigatedWith()).toEqual({
        q: 'tova',
        rank: 'Member',
        page: null,
      });
    });

    it('clears a search and a filter left empty', () => {
      query$.next(convertToParamMap({ q: 'tova', rank: 'Member' }));
      render();

      expect(
        page().querySelector<HTMLInputElement>('#roster-search')!.value,
      ).toBe('tova');

      page().querySelector<HTMLInputElement>('#roster-search')!.value = ' ';
      page().querySelector<HTMLSelectElement>('#roster-rank')!.value = '';
      page().querySelector('form')!.dispatchEvent(new Event('submit'));

      expect(navigatedWith()).toEqual({ q: null, rank: null, page: null });
    });
  });

  describe('paging', () => {
    beforeEach(() => {
      roster.roster.mockReturnValue(
        of(rosterPage({ total: 120, page: 2, pageSize: 50 })),
      );
    });

    it('says where the reader is and turns either way', () => {
      render();

      expect(text()).toContain('Page 2 of 3');

      button('Next').click();
      expect(navigatedWith()).toEqual({ page: 3 });

      button('Previous').click();
      // The first page is the address without one.
      expect(navigatedWith()).toEqual({ page: null });
    });

    it('offers no paging for one page', () => {
      roster.roster.mockReturnValue(of(rosterPage()));
      render();

      expect(page().querySelector('.lcars-pagination')).toBeNull();
    });

    it('offers no paging where the page size is unknown', () => {
      render();

      expect(
        fixture.componentInstance.totalPages(rosterPage({ pageSize: 0 })),
      ).toBe(0);
    });
  });
});
