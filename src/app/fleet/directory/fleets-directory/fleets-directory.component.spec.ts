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
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
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
    directory = { listFleets: jest.fn(() => of(page())) };
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
    /** The query parameters the last navigation asked for. */
    const lastNavigation = (): Record<string, unknown> =>
      (
        router.navigate.mock.calls.at(-1)?.[1] as {
          queryParams: Record<string, unknown>;
        }
      ).queryParams;

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
});
