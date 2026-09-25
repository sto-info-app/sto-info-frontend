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
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterService } from 'src/app/fleet/roster/roster.service';
import {
  RosterChangeKind,
  RosterHistoryPage,
  RosterInterval,
  RosterRankMove,
} from 'src/app/models/fleet-roster.models';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';

import {
  ROSTER_HISTORY_NOT_PERMITTED,
  RosterHistoryComponent,
} from './roster-history.component';

const FLEET_HREF =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet';
const NOV_1 = '2024-11-01T12:00:00.000Z';
const NOV_15 = '2024-11-15T12:00:00.000Z';

/**
 * Builds the Fleet as the server resolves it.
 *
 * @param capabilities - What the reader holds.
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
 * Builds an interval.
 *
 * @param overrides - Fields to change.
 * @returns The interval.
 */
function interval(overrides: Partial<RosterInterval> = {}): RosterInterval {
  return {
    from: { importId: 'import-1', exportedAt: NOV_1 },
    to: { importId: 'import-2', exportedAt: NOV_15 },
    partial: false,
    membersAtStart: 6,
    membersAtEnd: 6,
    joined: 1,
    rejoined: 0,
    left: 1,
    unknown: 0,
    renamed: 1,
    rankChanged: 1,
    joinDateChanged: 0,
    acrossGap: 0,
    contributionDelta: '1700',
    contributionKnown: 5,
    contributionReset: 0,
    contributionBaseline: 1,
    contributionUnknown: 1,
    changes: [
      {
        identityId: 'identity-kess',
        kind: RosterChangeKind.LEFT,
        from: { importId: 'import-1', exportedAt: NOV_1 },
        to: { importId: 'import-2', exportedAt: NOV_15 },
        acrossGap: false,
        member: { characterName: 'Kess Varro', accountHandle: '@fixture030' },
        rankMove: null,
      },
      {
        identityId: 'identity-kell',
        kind: RosterChangeKind.RANK_CHANGED,
        from: { importId: 'import-1', exportedAt: NOV_1 },
        to: { importId: 'import-2', exportedAt: NOV_15 },
        acrossGap: false,
        member: { characterName: 'Kell Marr', accountHandle: '@fixture003' },
        rankMove: RosterRankMove.DEMOTED,
        fromRank: 'Officer',
        toRank: 'Member',
      },
      {
        identityId: 'identity-tova',
        kind: RosterChangeKind.JOIN_DATE_CHANGED,
        from: { importId: 'import-1', exportedAt: NOV_1 },
        to: { importId: 'import-2', exportedAt: NOV_15 },
        acrossGap: false,
        member: { characterName: 'Tova Reen', accountHandle: '@fixture004' },
        rankMove: null,
        fromJoinedAt: '2022-07-07T08:00:00.000Z',
        toJoinedAt: '2022-07-08T08:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

/**
 * Builds a page of history.
 *
 * @param overrides - Fields to change.
 * @returns The page.
 */
function historyPage(
  overrides: Partial<RosterHistoryPage> = {},
): RosterHistoryPage {
  return {
    revision: 17,
    publishedAt: '2026-09-25T00:30:00.000Z',
    stale: false,
    items: [interval()],
    total: 1,
    page: 1,
    pageSize: 10,
    ...overrides,
  };
}

describe('RosterHistoryComponent', () => {
  let fixture: ComponentFixture<RosterHistoryComponent>;
  let query$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let roster: { history: jest.Mock };
  let navigate: jest.SpyInstance;

  beforeEach(async () => {
    query$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    roster = { history: jest.fn(() => of(historyPage())) };

    await TestBed.configureTestingModule({
      imports: [RosterHistoryComponent],
      providers: [
        { provide: FleetReportService, useValue: { visible: () => of([]) } },
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
    fixture = TestBed.createComponent(RosterHistoryComponent);
    fixture.detectChanges();
  }

  /** The page as drawn. */
  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /** What the page says, its whitespace folded. */
  const text = (): string => (page().textContent ?? '').replace(/\s+/g, ' ');

  /**
   * Finds a kind's box.
   *
   * @param label - What it says.
   * @returns The box.
   */
  function box(label: string): HTMLInputElement {
    const labelElement = Array.from(
      page().querySelectorAll('.roster-history__kind'),
    ).find(candidate => candidate.textContent?.trim() === label);

    return labelElement?.querySelector('input') as HTMLInputElement;
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

  it('asks for the first page of every kind by default', () => {
    render();

    expect(roster.history).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      1,
      [],
    );
  });

  it('asks for the page and kinds the address names, ignoring others', () => {
    query$.next(convertToParamMap({ page: '2', kinds: 'LEFT,SHOE,JOINED' }));
    render();

    expect(roster.history).toHaveBeenCalledWith('community-1', 'fleet-1', 2, [
      RosterChangeKind.LEFT,
      RosterChangeKind.JOINED,
    ]);
  });

  it('reads a page that is not one as the first', () => {
    query$.next(convertToParamMap({ page: 'last' }));
    render();

    expect(roster.history).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      1,
      [],
    );
  });

  it('heads each interval with the two exports it lies between', () => {
    render();

    expect(
      page().querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('Between Nov 1, 2024, 12:00:00 PM and Nov 15, 2024, 12:00:00 PM');
  });

  it('gives each interval’s totals, contribution as a total only', () => {
    render();

    expect(text()).toContain('6 → 6');
    expect(text()).toContain('1,700');
    expect(text()).toContain('from 5 known; 0 reset, 1 new, 1 unknown');
  });

  it('names each change’s member, linking to their timeline', () => {
    render();

    const items = Array.from(
      page().querySelectorAll('.roster-history__changes li'),
    ).map(item => item.textContent?.replace(/\s+/g, ' ').trim());

    expect(items).toEqual([
      'Kess Varro@fixture030 left',
      'Kell Marr@fixture003 was demoted from Officer to Member',
      'Tova Reen@fixture004 had their Join Date change from Jul 7, 2022 to Jul 8, 2022',
    ]);
    expect(
      page().querySelector('.roster-history__changes a')?.getAttribute('href'),
    ).toBe(`${FLEET_HREF}/history/members/identity-kess`);
  });

  it('says a change was across a gap, from when, and that it is in no total', () => {
    roster.history.mockReturnValue(
      of(
        historyPage({
          items: [
            interval({
              acrossGap: 1,
              changes: [
                {
                  identityId: 'identity-tova',
                  kind: RosterChangeKind.JOINED,
                  from: {
                    importId: 'import-0',
                    exportedAt: '2024-10-27T01:30:00.000Z',
                  },
                  to: { importId: 'import-2', exportedAt: NOV_15 },
                  acrossGap: true,
                  member: null,
                  rankMove: null,
                },
              ],
            }),
          ],
        }),
      ),
    );
    render();

    expect(text()).toContain(
      '1 change revealed here happened across a gap, over a longer span, and is in none of these totals.',
    );
    expect(text()).toContain('A member joined');
    expect(text()).toContain('across a gap: some time after Oct 27, 2024');
  });

  it('counts several changes across a gap in the plural', () => {
    roster.history.mockReturnValue(
      of(historyPage({ items: [interval({ acrossGap: 2 })] })),
    );
    render();

    expect(text()).toContain(
      '2 changes revealed here happened across a gap, over a longer span, and are in none of these totals.',
    );
  });

  it('says a partial export may have missed members', () => {
    roster.history.mockReturnValue(
      of(historyPage({ items: [interval({ partial: true, changes: [] })] })),
    );
    render();

    expect(text()).toContain('The later export was partial');
    expect(page().querySelector('.roster-history__changes')).toBeNull();
  });

  it('says a history of one export has nothing between two', () => {
    roster.history.mockReturnValue(of(historyPage({ items: [], total: 0 })));
    render();

    expect(text()).toContain('The history has only one export so far');
  });

  it('says a Fleet with no history yet has none', () => {
    roster.history.mockReturnValue(
      of(historyPage({ revision: 0, items: [], total: 0 })),
    );
    render();

    expect(text()).toContain(
      'No roster has been read into this Fleet’s history yet.',
    );
    expect(page().querySelector('fieldset')).toBeNull();
  });

  it('says a newer history is on its way', () => {
    roster.history.mockReturnValue(of(historyPage({ stale: true })));
    render();

    expect(text()).toContain('A change is being worked into the history.');
  });

  it('tells a reader who is not a member so, without asking', () => {
    scopes.resolveFleet.mockReturnValue(of(resolved([])));
    render();

    expect(text()).toContain(ROSTER_HISTORY_NOT_PERMITTED);
    expect(roster.history).not.toHaveBeenCalled();
  });

  describe('filtering by kind', () => {
    it('shows every kind ticked by default', () => {
      render();

      expect(box('Left').checked).toBe(true);
      expect(box('Joined').disabled).toBe(false);
    });

    it('hides a kind, from the first page', () => {
      render();
      box('Left').checked = false;
      box('Left').dispatchEvent(new Event('change'));

      expect(navigatedWith()).toEqual({
        kinds: 'JOINED,REJOINED,RENAMED,RANK_CHANGED,JOIN_DATE_CHANGED',
        page: null,
      });
    });

    it('shows a hidden kind again, in the kinds’ own order', () => {
      query$.next(convertToParamMap({ kinds: 'LEFT' }));
      render();

      expect(box('Joined').checked).toBe(false);

      box('Joined').checked = true;
      box('Joined').dispatchEvent(new Event('change'));

      expect(navigatedWith()).toEqual({ kinds: 'JOINED,LEFT', page: null });
    });

    it('names no filter once every kind is shown again', () => {
      query$.next(
        convertToParamMap({
          kinds: 'JOINED,REJOINED,RENAMED,RANK_CHANGED,JOIN_DATE_CHANGED',
        }),
      );
      render();
      box('Left').checked = true;
      box('Left').dispatchEvent(new Event('change'));

      expect(navigatedWith()).toEqual({ kinds: null, page: null });
    });

    // A history showing nothing is not one anybody asked for.
    it('will not clear the only kind shown', () => {
      query$.next(convertToParamMap({ kinds: 'LEFT' }));
      render();

      expect(box('Left').disabled).toBe(true);
      expect(box('Joined').disabled).toBe(false);
    });
  });

  describe('paging', () => {
    it('turns to older and newer intervals', () => {
      roster.history.mockReturnValue(
        of(historyPage({ total: 25, page: 2, pageSize: 10 })),
      );
      render();

      expect(text()).toContain('Page 2 of 3');

      Array.from(page().querySelectorAll('button'))
        .find(button => button.textContent?.trim() === 'Older')!
        .click();
      expect(navigatedWith()).toEqual({ page: 3 });

      Array.from(page().querySelectorAll('button'))
        .find(button => button.textContent?.trim() === 'Newer')!
        .click();
      expect(navigatedWith()).toEqual({ page: null });
    });

    it('offers no paging for one page, or none', () => {
      render();

      expect(page().querySelector('.lcars-pagination')).toBeNull();
      expect(
        fixture.componentInstance.totalPages(historyPage({ pageSize: 0 })),
      ).toBe(0);
    });
  });
});
