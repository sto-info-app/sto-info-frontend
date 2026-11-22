import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, Router } from '@angular/router';

import { NEVER, of, throwError } from 'rxjs';

import {
  ARMADA_SECTION_ERROR,
  ARMADA_SECTION_MISSING,
} from 'src/app/fleet/armadas/armada-section-page.directive';
import {
  armadaFleet,
  armadaRoute,
  ArmadaRouteStubs,
  resolvedArmada,
} from 'src/app/fleet/armadas/armada.testing';
import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import {
  findButton,
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  ArmadaActionKind,
  ArmadaChange,
  ArmadaHistoryPage,
  ArmadaPosition,
} from 'src/app/models/fleet-armada.models';

import {
  ARMADA_HISTORY_NOT_PERMITTED,
  ArmadaHistoryComponent,
} from './armada-history.component';

const NINTH = armadaFleet('Ninth Fleet');

/**
 * Builds a change.
 *
 * @param overrides - Fields to override.
 * @returns The Ninth Fleet joining as a Beta.
 */
function change(overrides: Partial<ArmadaChange> = {}): ArmadaChange {
  return {
    changeId: 'change-1',
    at: '2026-09-27T20:00:00.000Z',
    recordedBy: 'FleetOwner',
    reason: 'Welcome aboard',
    moves: [
      {
        fleet: NINTH,
        action: ArmadaActionKind.PLACED,
        from: null,
        to: { position: ArmadaPosition.BETA, parent: null },
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
  overrides: Partial<ArmadaHistoryPage> = {},
): ArmadaHistoryPage {
  return {
    items: [],
    recordersShown: false,
    page: 1,
    pageSize: 25,
    total: 0,
    ...overrides,
  };
}

describe('ArmadaHistoryComponent', () => {
  let fixture: ComponentFixture<ArmadaHistoryComponent>;
  let route: ArmadaRouteStubs;
  let service: { history: jest.Mock };
  let navigate: jest.SpyInstance;

  /**
   * Draws the page.
   *
   * @param query - The address's query.
   */
  async function render(query: Record<string, string> = {}): Promise<void> {
    route.query$.next(convertToParamMap(query));

    await TestBed.configureTestingModule({
      imports: [ArmadaHistoryComponent],
      providers: [
        ...route.providers,
        { provide: FleetArmadaService, useValue: service },
      ],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(ArmadaHistoryComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    route = armadaRoute();
    service = { history: jest.fn(() => of(historyPage())) };
  });

  describe('the Armada', () => {
    it('resolves it from the address and heads the page with it', async () => {
      await render();

      expect(route.scopes.resolveArmada).toHaveBeenCalledWith(
        'united-federation-alliance',
        'pc',
        'sol-armada',
      );
      expect(pageText(fixture)).toContain('Sol Armada');
      expect(
        fixture.nativeElement.querySelector('app-armada-tabs'),
      ).not.toBeNull();
    });

    it('asks with empty segments when the address has none', async () => {
      route.params$.next(convertToParamMap({}));

      await render();

      expect(route.scopes.resolveArmada).toHaveBeenCalledWith('', '', '');
    });

    it('says it is reading until the Armada is known', async () => {
      route.scopes.resolveArmada.mockReturnValue(NEVER);

      await render();

      expect(pageText(fixture)).toContain('Reading the history');
      expect(fixture.nativeElement.querySelector('app-armada-tabs')).toBeNull();
    });

    it('says when nothing answers to the address', async () => {
      route.scopes.resolveArmada.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      await render();

      expect(pageText(fixture)).toContain(ARMADA_SECTION_MISSING);
    });

    it('says when it could not be read for another reason', async () => {
      route.scopes.resolveArmada.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      await render();

      expect(pageText(fixture)).toContain(ARMADA_SECTION_ERROR);
    });

    it('opens to anybody who may see the Armada', async () => {
      await render();

      expect(
        fixture.componentInstance.messageOf({ kind: 'LOADING' }),
      ).toBeNull();
      expect(pageText(fixture)).not.toContain(ARMADA_HISTORY_NOT_PERMITTED);
    });
  });

  describe('the history', () => {
    it('says when no Fleet has been placed yet', async () => {
      await render();

      expect(service.history).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        1,
      );
      expect(pageText(fixture)).toContain('No Fleet has been placed here yet.');
      // Nothing here is read from a roster export, and the page says so.
      expect(pageText(fixture)).toContain(
        'none comes from the game’s roster exports',
      );
    });

    it('reads each change as sentences, naming the recorder where shown', async () => {
      service.history.mockReturnValue(
        of(
          historyPage({
            items: [
              change(),
              change({ changeId: 'change-2', recordedBy: null, reason: null }),
            ],
            recordersShown: true,
            total: 2,
          }),
        ),
      );

      await render();

      const text = pageText(fixture);

      expect(text).toContain('Ninth Fleet joined as Beta.');
      expect(text.match(/Made by FleetOwner\./g)).toHaveLength(1);
      expect(text.match(/Reason:/g)).toHaveLength(1);
      expect(text).toContain('Reason: Welcome aboard');
    });

    it('names nobody when recorders are hidden from the reader', async () => {
      service.history.mockReturnValue(
        of(historyPage({ items: [change()], total: 1 })),
      );

      await render();

      expect(pageText(fixture)).not.toContain('Made by');
    });

    it('names each Fleet plainly when no two share a name', async () => {
      route.scopes.resolveArmada.mockReturnValue(
        of({ ...resolvedArmada(), communityName: null }),
      );
      service.history.mockReturnValue(
        of(historyPage({ items: [change(), change()], total: 2 })),
      );

      await render();

      expect(pageText(fixture)).toContain('Ninth Fleet joined as Beta.');
      expect(pageText(fixture)).not.toContain('Ninth Fleet (');
    });
  });

  describe('paging', () => {
    it('offers no paging for a single page', async () => {
      service.history.mockReturnValue(
        of(historyPage({ items: [change()], total: 1 })),
      );

      await render();

      expect(findButton(fixture, 'Older')).toBeUndefined();
    });

    it('asks for the page the address names', async () => {
      await render({ page: '3' });

      expect(service.history).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        3,
      );
    });

    it('never asks for a page the address does not name properly', async () => {
      await render({ page: 'second' });

      expect(service.history).toHaveBeenCalledWith(
        'community-1',
        'armada-1',
        1,
      );
    });

    it('moves between pages by the address', async () => {
      service.history.mockReturnValue(
        of(historyPage({ items: [change()], page: 2, pageSize: 1, total: 3 })),
      );

      await render();

      expect(pageText(fixture)).toContain('Page 2 of 3');

      pressButton(fixture, 'Older');
      expect(navigate).toHaveBeenLastCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { page: 3 },
        queryParamsHandling: 'merge',
      });

      fixture.componentInstance.onPage(1);
      expect(navigate).toHaveBeenLastCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { page: null },
        queryParamsHandling: 'merge',
      });
    });

    it('counts no pages of an empty page size', () => {
      expect(
        ArmadaHistoryComponent.prototype.totalPages(
          historyPage({ pageSize: 0 }),
        ),
      ).toBe(0);
    });
  });
});
