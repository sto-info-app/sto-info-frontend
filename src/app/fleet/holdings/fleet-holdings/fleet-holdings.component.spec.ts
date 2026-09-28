import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, Router } from '@angular/router';

import { NEVER, of, throwError } from 'rxjs';

import { FleetHoldingsService } from 'src/app/fleet/holdings/fleet-holdings.service';
import {
  chooseFrom,
  findButton,
  pageText,
  pressButton,
  recruitmentRoute,
  RecruitmentRouteStubs,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetHolding,
  FleetHoldingChange,
  FleetHoldingHistoryPage,
  FleetHoldings,
} from 'src/app/models/fleet-holdings.models';

import {
  FleetHoldingsComponent,
  HOLDING_RECORD_FAILED,
} from './fleet-holdings.component';

/** The Starbase, part way up. */
const STARBASE: FleetHolding = {
  code: 'STARBASE',
  name: 'Fleet Starbase',
  sourceUrl: 'https://stowiki.net/wiki/Fleet_Starbase',
  sourceEditedOn: '2026-07-05',
  tracks: [
    {
      code: 'STARBASE',
      name: 'Starbase',
      isDepartment: false,
      maxTier: 5,
      tier: 2,
      updatedAt: '2026-09-27T20:00:00.000Z',
    },
    {
      code: 'STARBASE_MILITARY',
      name: 'Military',
      isDepartment: true,
      maxTier: 5,
      tier: 0,
      updatedAt: null,
    },
  ],
};

/** The Embassy, never recorded. */
const EMBASSY: FleetHolding = {
  code: 'EMBASSY',
  name: 'Fleet Embassy',
  sourceUrl: 'https://stowiki.net/wiki/Fleet_Embassy',
  sourceEditedOn: '2024-08-29',
  tracks: [
    {
      code: 'EMBASSY',
      name: 'Embassy',
      isDepartment: false,
      maxTier: 3,
      tier: 0,
      updatedAt: null,
    },
  ],
};

/**
 * Builds the holdings as the server answers them.
 *
 * @param mayRecord - Whether the reader may record.
 * @returns The holdings.
 */
function holdings(mayRecord: boolean): FleetHoldings {
  return { catalogueVersion: 1, mayRecord, holdings: [STARBASE, EMBASSY] };
}

/**
 * Builds a change.
 *
 * @param overrides - Fields to override.
 * @returns The change.
 */
function change(
  overrides: Partial<FleetHoldingChange> = {},
): FleetHoldingChange {
  return {
    id: 'change-1',
    holdingCode: 'STARBASE',
    holdingName: 'Fleet Starbase',
    recordedAt: '2026-09-27T20:00:00.000Z',
    recordedBy: 'MidNiteShadow',
    reason: 'Upgraded tonight',
    moves: [
      {
        track: 'STARBASE',
        trackName: 'Starbase',
        isDepartment: false,
        from: 1,
        to: 2,
      },
      {
        track: 'STARBASE_MILITARY',
        trackName: 'Military',
        isDepartment: true,
        from: 3,
        to: 0,
      },
    ],
    ...overrides,
  };
}

/**
 * Builds a page of history.
 *
 * @param overrides - Fields to override.
 * @returns The page.
 */
function historyPage(
  overrides: Partial<FleetHoldingHistoryPage> = {},
): FleetHoldingHistoryPage {
  return {
    items: [],
    recordersShown: false,
    page: 1,
    pageSize: 25,
    total: 0,
    ...overrides,
  };
}

describe('FleetHoldingsComponent', () => {
  let fixture: ComponentFixture<FleetHoldingsComponent>;
  let route: RecruitmentRouteStubs;
  let service: { holdings: jest.Mock; history: jest.Mock; record: jest.Mock };
  let navigate: jest.SpyInstance;

  /**
   * Draws the page.
   *
   * @param query - The address's query.
   */
  async function render(query: Record<string, string> = {}): Promise<void> {
    route = recruitmentRoute([]);
    route.query$.next(convertToParamMap(query));

    await TestBed.configureTestingModule({
      imports: [FleetHoldingsComponent],
      providers: [
        ...route.providers,
        { provide: FleetHoldingsService, useValue: service },
      ],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(FleetHoldingsComponent);
    fixture.detectChanges();
  }

  /** Submits the open form. */
  function submit(): void {
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'form',
      ) as HTMLFormElement
    ).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /**
   * Finds an element.
   *
   * @param selector - The selector.
   * @returns The element, or null.
   */
  function find(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  beforeEach(() => {
    service = {
      holdings: jest.fn(() => of(holdings(false))),
      history: jest.fn(() => of(historyPage())),
      record: jest.fn(() => of(holdings(true))),
    };
  });

  describe('for any reader', () => {
    it('shows every holding with its tracks’ tiers and where they came from', async () => {
      await render();

      const text = pageText(fixture);

      expect(service.holdings).toHaveBeenCalledWith('community-1', 'fleet-1');
      expect(text).toContain('Ninth Fleet');
      expect(text).toContain('version 1 of the holdings catalogue');
      expect(text).toContain('Fleet Starbase');
      expect(text).toContain('Starbase 2 of 5');
      expect(text).toContain('Military 0 of 5 Never');
      expect(text).toContain('Embassy 0 of 3');
      expect(text).toContain('as of 5 July 2026');
      expect(text).toContain('as of 29 August 2024');
      expect(find('.fleet-holding__source a')?.getAttribute('href')).toBe(
        'https://stowiki.net/wiki/Fleet_Starbase',
      );
      expect(find('.fleet-holding__own')?.textContent).toContain('Starbase');
    });

    it('offers no recording to a reader who may not', async () => {
      await render();

      expect(findButton(fixture, 'Record…')).toBeUndefined();
    });

    it('says when nothing has been recorded', async () => {
      await render();

      expect(service.history).toHaveBeenCalledWith('community-1', 'fleet-1', 1);
      expect(pageText(fixture)).toContain('Nothing has been recorded yet.');
    });

    it('never asks for a page the address does not name properly', async () => {
      await render({ page: 'second' });

      expect(service.history).toHaveBeenCalledWith('community-1', 'fleet-1', 1);
    });
  });

  describe('the history', () => {
    it('reads each change, naming the recorder where shown', async () => {
      service.history.mockReturnValue(
        of(
          historyPage({
            items: [
              change(),
              change({ id: 'change-2', recordedBy: null, reason: null }),
            ],
            recordersShown: true,
            total: 2,
          }),
        ),
      );

      await render();

      const text = pageText(fixture);

      expect(text).toContain('Fleet Starbase: Starbase 1 → 2, Military 3 → 0.');
      expect(text).toContain('Recorded by MidNiteShadow.');
      expect(text.match(/Recorded by/g)).toHaveLength(1);
      expect(text.match(/Reason:/g)).toHaveLength(1);
      expect(text).toContain('Reason: Upgraded tonight');
      expect(find('.lcars-pagination')).toBeNull();
    });

    it('names nobody where the recorders are not shown', async () => {
      service.history.mockReturnValue(
        of(historyPage({ items: [change()], total: 1 })),
      );

      await render();

      expect(pageText(fixture)).not.toContain('Recorded by');
    });

    it('pages through older changes by the address', async () => {
      service.history.mockReturnValue(
        of(historyPage({ items: [change()], page: 2, pageSize: 1, total: 3 })),
      );

      await render({ page: '2' });

      expect(service.history).toHaveBeenCalledWith('community-1', 'fleet-1', 2);
      expect(pageText(fixture)).toContain('Page 2 of 3');

      pressButton(fixture, 'Older');

      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({
          queryParams: { page: 3 },
          queryParamsHandling: 'merge',
        }),
      );

      pressButton(fixture, 'Newer');

      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: { page: null } }),
      );
    });

    it('counts no pages when the server sends none', async () => {
      await render();

      expect(
        fixture.componentInstance.totalPages(historyPage({ pageSize: 0 })),
      ).toBe(0);
    });
  });

  describe('recording', () => {
    beforeEach(() => {
      service.holdings.mockReturnValue(of(holdings(true)));
    });

    /** Opens the Starbase's form. */
    async function openStarbase(): Promise<void> {
      await render();
      pressButton(fixture, 'Record…');
    }

    it('opens a holding’s form at the tiers it has now', async () => {
      await openStarbase();

      const selects = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('select'),
      );

      expect(selects.map(select => select.id)).toEqual([
        'tier-STARBASE',
        'tier-STARBASE_MILITARY',
      ]);
      expect(selects.map(select => select.value)).toEqual(['2', '0']);
      expect(selects[0].options).toHaveLength(6);
      expect(findButton(fixture, 'Record')?.disabled).toBe(true);
      // One holding at a time.
      expect(findButton(fixture, 'Record…')).toBeUndefined();
    });

    it('records only the tracks moved, lower as well as higher, with the reason', async () => {
      await openStarbase();
      chooseFrom(fixture, '#tier-STARBASE', '1');
      chooseFrom(fixture, '#tier-STARBASE_MILITARY', '4');
      typeInto(fixture, '#reason-STARBASE', '  Put right  ');
      submit();

      expect(service.record).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'STARBASE',
        {
          tiers: [
            { track: 'STARBASE', tier: 1 },
            { track: 'STARBASE_MILITARY', tier: 4 },
          ],
          reason: 'Put right',
        },
      );
      expect(pageText(fixture)).toContain('Fleet Starbase recorded.');
      expect(find('form')).toBeNull();
      expect(service.holdings).toHaveBeenCalledTimes(2);
    });

    it('sends no reason when none is typed, nor a track left alone', async () => {
      await openStarbase();
      chooseFrom(fixture, '#tier-STARBASE_MILITARY', '1');
      submit();

      expect(service.record).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'STARBASE',
        { tiers: [{ track: 'STARBASE_MILITARY', tier: 1 }] },
      );
    });

    it('sends nothing when nothing has changed', async () => {
      await openStarbase();
      chooseFrom(fixture, '#tier-STARBASE', '2');
      submit();

      expect(service.record).not.toHaveBeenCalled();
    });

    it('sends once while a save is under way', async () => {
      service.record.mockReturnValue(NEVER);

      await openStarbase();
      chooseFrom(fixture, '#tier-STARBASE', '3');
      submit();
      submit();

      expect(service.record).toHaveBeenCalledTimes(1);
      expect(findButton(fixture, 'Cancel')?.disabled).toBe(true);
    });

    it.each([
      [
        'the server’s reason',
        new HttpErrorResponse({
          status: 409,
          error: { message: 'This Fleet is closed.' },
        }),
        'This Fleet is closed.',
      ],
      ['a fallback', new Error('offline'), HOLDING_RECORD_FAILED],
    ])(
      'keeps the form open and says %s when it is refused',
      async (_what, error, message) => {
        service.record.mockReturnValue(throwError(() => error));

        await openStarbase();
        chooseFrom(fixture, '#tier-STARBASE', '5');
        submit();

        expect(pageText(fixture)).toContain(message);
        expect(find('form')).not.toBeNull();
        expect(findButton(fixture, 'Record')?.disabled).toBe(false);
      },
    );

    it('closes the form on Cancel, keeping nothing', async () => {
      await openStarbase();
      chooseFrom(fixture, '#tier-STARBASE', '5');
      pressButton(fixture, 'Cancel');

      expect(find('form')).toBeNull();
      expect(pageText(fixture)).toContain('Starbase 2 of 5');
      expect(service.record).not.toHaveBeenCalled();
    });

    it('reads a track outside the form at its tier now', async () => {
      await render();

      expect(fixture.componentInstance.drafted(EMBASSY.tracks[0])).toBe(0);
    });
  });
});
