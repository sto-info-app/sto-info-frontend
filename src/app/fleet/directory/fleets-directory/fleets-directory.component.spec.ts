import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  Router,
} from '@angular/router';

import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';

import {
  FleetDirectoryPage,
  FleetDirectorySort,
  FleetDirectoryStatusFilter,
  FleetRecruitmentState,
  FleetScopeStatus,
  StoFleetCard,
} from 'src/app/models/fleet.models';
import { AuthService } from 'src/app/core/auth/auth.service';
import { CharacterLookupService } from 'src/app/dashboard/services/character-lookup.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
import { FleetRosterFilter } from 'src/app/fleet/directory/fleet-directory-filters.constants';
import { FLEET_DIRECTORY_ERROR } from 'src/app/fleet/directory/fleet-directory-page.directive';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { FleetsDirectoryComponent } from './fleets-directory.component';

/**
 * Builds a Fleet card as the server would send it.
 *
 * @param overrides - Fields to override.
 * @returns The card.
 */
function fleetCard(overrides: Partial<StoFleetCard> = {}): StoFleetCard {
  return {
    id: 'fleet-1',
    slug: 'starfleet-command',
    status: FleetScopeStatus.ACTIVE,
    createdAt: '2026-01-02T03:04:05.000Z',
    emblemImageId: null,
    emblemImageAlt: null,
    exactGameName: 'Starfleet Command',
    communityId: 'community-1',
    communityName: 'United Federation Alliance',
    communitySlug: 'united-federation-alliance',
    platformId: 'platform-1',
    platformName: 'PC',
    platformSegment: 'pc',
    duplicateCount: 0,
    recruitmentState: FleetRecruitmentState.OPEN,
    allegianceFactionId: null,
    lastEffectiveImportAt: null,
    ...overrides,
  };
}

/**
 * Builds a page of Fleets.
 *
 * @param items - The records on the page.
 * @param overrides - Paging fields to override.
 * @returns The page.
 */
function page(
  items: StoFleetCard[] = [fleetCard()],
  overrides: Partial<FleetDirectoryPage<StoFleetCard>> = {},
): FleetDirectoryPage<StoFleetCard> {
  return { items, total: items.length, page: 1, pageSize: 12, ...overrides };
}

describe('FleetsDirectoryComponent', () => {
  let fixture: ComponentFixture<FleetsDirectoryComponent>;
  let params$: BehaviorSubject<ParamMap>;
  let directory: { listFleets: jest.Mock };
  let router: { navigate: jest.Mock };
  let route: { queryParamMap: Observable<ParamMap>; snapshot: unknown };
  let formatted: string | null;
  let isLoggedIn: boolean;
  let accounts: { getPlatforms: jest.Mock };
  let lookup: { getGeneralFactions: jest.Mock };

  /**
   * Puts a question in the URL.
   *
   * @param query - The query string, as key and value.
   */
  function setParams(query: Record<string, string>): void {
    const map = convertToParamMap(query);

    route.snapshot = { queryParamMap: map };
    params$.next(map);
  }

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    formatted = '4 March 2015';
    isLoggedIn = true;
    directory = { listFleets: jest.fn(() => of(page())) };
    accounts = {
      getPlatforms: jest.fn(() => of([{ id: 'platform-1', name: 'PC' }])),
    };
    lookup = {
      getGeneralFactions: jest.fn(() =>
        of([{ id: 'faction-1', name: 'Federation' }]),
      ),
    };
    router = { navigate: jest.fn() };
    route = {
      queryParamMap: params$,
      snapshot: { queryParamMap: convertToParamMap({}) },
    };

    await TestBed.configureTestingModule({
      imports: [FleetsDirectoryComponent],
      providers: [
        { provide: FleetDirectoryService, useValue: directory },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        {
          provide: AuthService,
          useValue: { isLoggedIn: (): boolean => isLoggedIn },
        },
        { provide: StoAccountService, useValue: accounts },
        { provide: CharacterLookupService, useValue: lookup },
      ],
    })
      .overrideComponent(FleetsDirectoryComponent, {
        set: {
          providers: [
            {
              provide: AppDatePipe,
              useValue: { transform: (): string | null => formatted },
            },
          ],
        },
      })
      .compileComponents();
  });

  /**
   * Renders the listing.
   */
  function render(): void {
    fixture = TestBed.createComponent(FleetsDirectoryComponent);
    fixture.detectChanges();
  }

  /** The question the service was last asked. */
  const lastQuery = (): Record<string, unknown> =>
    directory.listFleets.mock.calls.at(-1)?.[0] as Record<string, unknown>;

  /** The query parameters the last navigation asked for. */
  const lastNavigation = (): Record<string, unknown> =>
    (
      router.navigate.mock.calls.at(-1)?.[1] as {
        queryParams: Record<string, unknown>;
      }
    ).queryParams;

  /**
   * The labels a select is offering.
   *
   * @param selector - The select's CSS selector.
   * @returns What the reader can pick.
   */
  const optionsOf = (selector: string): string[] =>
    Array.from(
      (fixture.nativeElement.querySelector(selector) as HTMLSelectElement)
        .options,
    ).map(option => option.textContent?.trim() ?? '');

  it('asks for the first page, operating records, ordered by name', () => {
    render();

    expect(lastQuery()).toEqual({
      search: undefined,
      status: FleetDirectoryStatusFilter.ACTIVE,
      sort: FleetDirectorySort.NAME,
      page: 1,
      pageSize: 12,
    });
  });

  it('asks the question the URL is holding', () => {
    setParams({
      search: 'command',
      status: FleetDirectoryStatusFilter.ANY,
      sort: FleetDirectorySort.FRESHNESS,
      page: '3',
    });

    render();

    expect(lastQuery()).toEqual({
      search: 'command',
      status: FleetDirectoryStatusFilter.ANY,
      sort: FleetDirectorySort.FRESHNESS,
      page: 3,
      pageSize: 12,
    });
  });

  it('reloads when the question in the URL changes', () => {
    render();

    setParams({ search: 'command' });

    expect(directory.listFleets).toHaveBeenCalledTimes(2);
    expect(lastQuery()['search']).toBe('command');
  });

  // The server refuses a value it does not recognise, and turning the
  // listing into an error page over a query string the reader can see is
  // wrong helps nobody.
  it.each([
    ['status', 'BANANAS'],
    ['sort', 'BANANAS'],
  ])('falls back to the default when %s is not one it offers', key => {
    setParams({ [key]: 'BANANAS' });

    render();

    expect(lastQuery()[key]).toBe(
      key === 'status'
        ? FleetDirectoryStatusFilter.ACTIVE
        : FleetDirectorySort.NAME,
    );
  });

  it.each([['nonsense'], ['0'], ['-2'], ['1.5']])(
    'reads a page of %s as the first page',
    value => {
      setParams({ page: value });

      render();

      expect(lastQuery()['page']).toBe(1);
    },
  );

  it('sends no search when the box is empty', () => {
    setParams({ search: '' });

    render();

    expect(lastQuery()['search']).toBeUndefined();
  });

  describe('what it shows', () => {
    /**
     * Reads the current state.
     *
     * @returns The state the listing is in.
     */
    const state = (): { kind: string } => {
      let current: { kind: string } | undefined;
      fixture.componentInstance.state$.subscribe(value => (current = value));

      return current as { kind: string };
    };

    it('says it is loading before the server has answered', () => {
      directory.listFleets.mockReturnValue(new Subject());

      render();

      expect(state().kind).toBe('LOADING');
    });

    it('reports a failure rather than an empty list', () => {
      directory.listFleets.mockReturnValue(throwError(() => new Error('nope')));

      render();

      expect(state()).toEqual({
        kind: 'ERROR',
        message: FLEET_DIRECTORY_ERROR,
      });
    });

    it('turns each record into a card', () => {
      render();

      expect(state()).toEqual({
        kind: 'READY',
        results: expect.objectContaining({
          total: 1,
          page: 1,
          pageSize: 12,
        }),
      });
      expect(
        fixture.nativeElement.querySelectorAll('app-fleet-scope-card'),
      ).toHaveLength(1);
    });

    it('writes a roster import out in the reader’s own timezone', () => {
      directory.listFleets.mockReturnValue(
        of(
          page([fleetCard({ lastEffectiveImportAt: '2015-03-04T00:00:00Z' })]),
        ),
      );

      render();

      expect(fixture.nativeElement.textContent).toContain(
        'Roster last imported 4 March 2015',
      );
    });

    // The pipe answers null for a value it cannot read. Showing the instant
    // as the server wrote it is ugly and true; showing nothing would hide
    // the one fact the freshness ordering is sorted on.
    it('falls back to the raw instant when it cannot be written out', () => {
      formatted = null;
      directory.listFleets.mockReturnValue(
        of(
          page([fleetCard({ lastEffectiveImportAt: '2015-03-04T00:00:00Z' })]),
        ),
      );

      render();

      expect(fixture.nativeElement.textContent).toContain(
        'Roster last imported 2015-03-04T00:00:00Z',
      );
    });

    it('says how many other records answer to a name', () => {
      directory.listFleets.mockReturnValue(
        of(page([fleetCard({ duplicateCount: 2 })])),
      );

      render();

      expect(fixture.nativeElement.textContent).toContain(
        '2 other records answer to this name on PC',
      );
    });
  });

  describe('changing the question', () => {
    it('searches by putting the search in the URL', () => {
      render();

      fixture.componentInstance.onSearch('command');

      expect(lastNavigation()).toEqual({ search: 'command', page: null });
    });

    it('drops the search from the URL rather than sending an empty one', () => {
      render();

      fixture.componentInstance.onSearch('');

      expect(lastNavigation()).toEqual({ search: null, page: null });
    });

    // A reader on page four who narrows the list would otherwise land on page
    // four of a list that now has one.
    it.each([
      [
        'a lifecycle filter',
        (component: FleetsDirectoryComponent): void =>
          component.onStatus(FleetDirectoryStatusFilter.CLOSED),
        { status: FleetDirectoryStatusFilter.CLOSED, page: null },
      ],
      [
        'an ordering',
        (component: FleetsDirectoryComponent): void =>
          component.onSort(FleetDirectorySort.NEWEST),
        { sort: FleetDirectorySort.NEWEST, page: null },
      ],
    ])('returns to the first page when %s changes', (_name, act, expected) => {
      render();

      act(fixture.componentInstance);

      expect(lastNavigation()).toEqual(expected);
    });

    it('keeps every filter when the page is turned', () => {
      render();

      fixture.componentInstance.onPage(4);

      expect(lastNavigation()).toEqual({ page: 4 });
      expect(
        (router.navigate.mock.calls.at(-1)?.[1] as Record<string, unknown>)[
          'queryParamsHandling'
        ],
      ).toBe('merge');
    });
  });

  describe('what the filter bar is told', () => {
    it('reports the question in the URL back to the controls', () => {
      setParams({
        search: 'command',
        status: FleetDirectoryStatusFilter.CLOSED,
        sort: FleetDirectorySort.NEWEST,
      });

      render();

      expect(fixture.componentInstance.search).toBe('command');
      expect(fixture.componentInstance.status).toBe(
        FleetDirectoryStatusFilter.CLOSED,
      );
      expect(fixture.componentInstance.sort).toBe(FleetDirectorySort.NEWEST);
    });

    it('reports an empty search when the URL holds none', () => {
      render();

      expect(fixture.componentInstance.search).toBe('');
    });

    // Freshness is offered here and on neither of the other two.
    it('offers freshness as an ordering', () => {
      render();

      expect(
        fixture.componentInstance.sortOptions.map(option => option.value),
      ).toContain(FleetDirectorySort.FRESHNESS);
    });
  });
  describe('its own filters', () => {
    it('narrows by platform, posture and allegiance when the URL says so', () => {
      setParams({
        platformId: 'platform-1',
        recruitmentState: FleetRecruitmentState.APPLICATION,
        allegianceFactionId: 'faction-1',
      });

      render();

      expect(lastQuery()).toEqual(
        expect.objectContaining({
          platformId: 'platform-1',
          recruitmentState: FleetRecruitmentState.APPLICATION,
          allegianceFactionId: 'faction-1',
        }),
      );
    });

    it('narrows by nothing when the URL asks for nothing', () => {
      render();

      expect(lastQuery()).toEqual(
        expect.objectContaining({
          platformId: undefined,
          recruitmentState: undefined,
          allegianceFactionId: undefined,
        }),
      );
      expect(lastQuery()).not.toHaveProperty('withRoster');
      expect(lastQuery()).not.toHaveProperty('freshWithinDays');
    });

    // A posture nobody offered is somebody's typing. Sending it on would turn
    // the listing into an error page over a query string the reader can see
    // is wrong.
    it('ignores a recruitment posture it does not offer', () => {
      setParams({ recruitmentState: 'BANANAS' });

      render();

      expect(lastQuery()['recruitmentState']).toBeUndefined();
    });

    /*
     * One question in the URL becomes the two the server takes. Asking for
     * "never imported" and "imported this month" at once is a contradiction
     * the server refuses, and this is what makes it unwritable.
     */
    it.each([
      [FleetRosterFilter.NEVER, { withRoster: false }],
      [FleetRosterFilter.EVER, { withRoster: true }],
      [FleetRosterFilter.DAYS_30, { freshWithinDays: 30 }],
      [FleetRosterFilter.DAYS_90, { freshWithinDays: 90 }],
      [FleetRosterFilter.DAYS_365, { freshWithinDays: 365 }],
    ])(
      'turns a roster filter of %s into what the server takes',
      (roster, expected) => {
        setParams({ roster });

        render();

        expect(lastQuery()).toEqual(expect.objectContaining(expected));
      },
    );

    // A window already implies a roster exists, and saying it twice only has
    // a wrong version.
    it('sends no roster flag alongside a freshness window', () => {
      setParams({ roster: FleetRosterFilter.DAYS_30 });

      render();

      expect(lastQuery()).not.toHaveProperty('withRoster');
    });

    it('ignores a roster filter it does not offer', () => {
      setParams({ roster: 'BANANAS' });

      render();

      expect(lastQuery()).not.toHaveProperty('withRoster');
      expect(lastQuery()).not.toHaveProperty('freshWithinDays');
    });

    it('reports each filter back to its control', () => {
      setParams({ platformId: 'platform-1' });

      render();

      expect(fixture.componentInstance.filterValue('platformId')).toBe(
        'platform-1',
      );
      expect(fixture.componentInstance.filterValue('roster')).toBe('');
    });

    it('narrows by putting the filter in the URL', () => {
      render();

      fixture.componentInstance.onFilter('platformId', 'platform-2');

      expect(lastNavigation()).toEqual({
        platformId: 'platform-2',
        page: null,
      });
    });

    // `?platformId=` is a search for a platform whose id is the empty string,
    // which the server would rightly refuse.
    it('drops a filter rather than sending it empty', () => {
      render();

      fixture.componentInstance.onFilter('platformId', '');

      expect(lastNavigation()).toEqual({ platformId: null, page: null });
    });

    it('offers the platforms and the allegiances to pick from', () => {
      render();

      expect(optionsOf('#fleets-directory-platform')).toContain('PC');
      expect(optionsOf('#fleets-directory-allegiance')).toContain('Federation');
    });

    /*
     * The filter is one question about the Fleets; the Fleets themselves are
     * the page, and they arrived.
     */
    it('still lists the Fleets when a catalogue could not be read', () => {
      accounts.getPlatforms.mockReturnValue(throwError(() => new Error('no')));

      render();

      expect(
        fixture.nativeElement.querySelectorAll('app-fleet-scope-card'),
      ).toHaveLength(1);
      expect(optionsOf('#fleets-directory-platform')).toEqual(['Any platform']);
    });

    it('still lists the Fleets when the allegiances could not be read', () => {
      lookup.getGeneralFactions.mockReturnValue(
        throwError(() => new Error('no')),
      );

      render();

      expect(
        fixture.nativeElement.querySelectorAll('app-fleet-scope-card'),
      ).toHaveLength(1);
      expect(optionsOf('#fleets-directory-allegiance')).toEqual([
        'Any allegiance',
      ]);
    });

    /*
     * The server never guesses an allegiance, so narrowing by one silently
     * drops every Fleet nobody has stated a faction for.
     */
    it('says that Fleets with no allegiance stated are left out', () => {
      render();

      expect(fixture.nativeElement.textContent).toContain(
        'A Fleet whose allegiance nobody has stated is not shown',
      );
    });
  });

  describe('starting again', () => {
    it('offers nothing to clear until something narrows the listing', () => {
      render();

      expect(fixture.componentInstance.anyFilterApplied).toBe(false);
    });

    // Somebody on page three has not filtered anything, and offering to undo
    // it would be offering to undo something they did not do.
    it('does not count the page as a narrowing', () => {
      setParams({ page: '3' });

      render();

      expect(fixture.componentInstance.anyFilterApplied).toBe(false);
    });

    it.each([
      ['a search', { search: 'command' }],
      ['a lifecycle filter', { status: FleetDirectoryStatusFilter.ANY }],
      ['an ordering', { sort: FleetDirectorySort.NEWEST }],
      ['one of its own filters', { platformId: 'platform-1' }],
    ])('counts %s as something to clear', (_name, params) => {
      setParams(params as Record<string, string>);

      render();

      expect(fixture.componentInstance.anyFilterApplied).toBe(true);
    });

    it('treats a parameter left empty as asking for nothing', () => {
      setParams({ search: '' });

      render();

      expect(fixture.componentInstance.anyFilterApplied).toBe(false);
    });

    /*
     * Replaces the query string rather than merging into it, so a filter
     * added later is dropped without this having to be told about it.
     */
    it('puts the listing back to the question it starts on', () => {
      setParams({ search: 'command', platformId: 'platform-1', page: '3' });

      render();

      fixture.componentInstance.onClearAll();

      expect(lastNavigation()).toEqual({});
      expect(
        (router.navigate.mock.calls.at(-1)?.[1] as Record<string, unknown>)[
          'queryParamsHandling'
        ],
      ).toBeUndefined();
    });
  });

  describe('confirming a Fleet nobody here runs', () => {
    /**
     * The link offering it.
     *
     * @returns The link, or null.
     */
    const confirmLink = (): HTMLElement | null =>
      fixture.nativeElement.querySelector(
        '.fleets-directory__confirm a',
      ) as HTMLElement | null;

    it('offers it to somebody signed in', () => {
      render();

      expect(confirmLink()).not.toBeNull();
      expect(fixture.componentInstance.confirmStandaloneLink).toBe(
        '/fleets/register-standalone',
      );
    });

    // The record has no owner and no capability held at it, so having an
    // account is the whole of the gate the server applies too.
    it('offers nothing to a signed-out visitor', () => {
      isLoggedIn = false;

      render();

      expect(confirmLink()).toBeNull();
    });
  });
});
