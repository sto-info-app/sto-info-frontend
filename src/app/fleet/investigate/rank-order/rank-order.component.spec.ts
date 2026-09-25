import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import { textOf } from 'src/app/fleet/fleet-reports/fleet-report.testing';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterService } from 'src/app/fleet/roster/roster.service';
import { ResolvedStoFleet } from 'src/app/models/fleet.models';
import { RosterRankOrder } from 'src/app/models/fleet-roster.models';

import {
  RANK_ORDER_CHANGED_MEANWHILE,
  RANK_ORDER_NOT_PERMITTED,
  RANK_ORDER_SAVE_FAILED,
  RANK_ORDER_SAVED,
  RankOrderComponent,
  sameOrder,
} from './rank-order.component';

/**
 * Builds the Fleet as the server resolves it.
 *
 * @param capabilities - What the reader holds.
 * @returns The resolved Fleet.
 */
function resolved(
  capabilities: string[] = ['roster.investigate'],
): ResolvedStoFleet {
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

/** Admiral above Captain and Commander, with Cadet unplaced. */
const ORDER: RosterRankOrder = {
  tiers: [['Admiral'], ['Captain', 'Commander']],
  labels: [
    { label: 'Admiral', tier: 1 },
    { label: 'Captain', tier: 2 },
    { label: 'Commander', tier: 2 },
    { label: 'Cadet', tier: null },
  ],
  actions: [
    {
      id: 'action-2',
      actorName: 'steve',
      reason: 'Commander is Captain renamed',
      tiersBefore: [['Admiral'], ['Captain']],
      tiersAfter: [['Admiral'], ['Captain', 'Commander']],
      actedAt: '2024-11-15T12:00:00.000Z',
    },
    {
      id: 'action-1',
      actorName: null,
      reason: 'First order',
      tiersBefore: [],
      tiersAfter: [['Admiral'], ['Captain']],
      actedAt: '2024-11-01T12:00:00.000Z',
    },
  ],
};

describe('RankOrderComponent', () => {
  let fixture: ComponentFixture<RankOrderComponent>;
  let scopes: { resolveFleet: jest.Mock };
  let roster: { rankOrder: jest.Mock; updateRankOrder: jest.Mock };

  beforeEach(async () => {
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    roster = {
      rankOrder: jest.fn(() => of(ORDER)),
      updateRankOrder: jest.fn(() => of(ORDER)),
    };

    await TestBed.configureTestingModule({
      imports: [RankOrderComponent],
      providers: [
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: RosterService, useValue: roster },
        { provide: FleetReportService, useValue: { visible: () => of([]) } },
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
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();
  });

  /** Draws the page. */
  function render(): void {
    fixture = TestBed.createComponent(RankOrderComponent);
    fixture.detectChanges();
  }

  /** What the page says. */
  const text = (): string => textOf(fixture.nativeElement as HTMLElement);

  /**
   * Finds one element on the page.
   *
   * @param selector - Its selector.
   * @returns It, or null.
   */
  const find = <E extends Element = HTMLElement>(selector: string): E | null =>
    (fixture.nativeElement as HTMLElement).querySelector<E>(selector);

  /** The tier boxes, in the labels' order. */
  const boxes = (): HTMLInputElement[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.rank-order__tier',
      ),
    );

  /** The Save button. */
  const save = (): HTMLButtonElement =>
    find('button[type="submit"]') as HTMLButtonElement;

  /**
   * Types into a field.
   *
   * @param field - The field.
   * @param value - What to type.
   */
  function type(
    field: HTMLInputElement | HTMLTextAreaElement,
    value: string,
  ): void {
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /**
   * Places Cadet in a tier and gives a reason.
   *
   * @param tier - Cadet's tier.
   */
  function placeCadet(tier = '3'): void {
    type(boxes()[3], tier);
    type(
      find('#rank-order-reason') as HTMLTextAreaElement,
      '  Cadets are the newest  ',
    );
  }

  it('reads the order of the Fleet the address names', () => {
    render();

    expect(scopes.resolveFleet).toHaveBeenCalledWith(
      'united-federation-alliance',
      'pc',
      'ninth-fleet',
    );
    expect(roster.rankOrder).toHaveBeenCalledWith('community-1', 'fleet-1');
  });

  it('is only for investigators', () => {
    scopes.resolveFleet.mockReturnValue(of(resolved(['roster.view'])));
    render();

    expect(text()).toContain(RANK_ORDER_NOT_PERMITTED);
    expect(roster.rankOrder).not.toHaveBeenCalled();
  });

  it('shows the order, and a box for every label the exports listed', () => {
    render();

    expect(text()).toContain('Now: 1: Admiral · 2: Captain, Commander');
    expect(
      boxes().map(box => [
        (
          find(`label[for="${box.id}"]`) as HTMLLabelElement
        ).textContent?.trim(),
        box.value,
      ]),
    ).toEqual([
      ['Admiral', '1'],
      ['Captain', '2'],
      ['Commander', '2'],
      ['Cadet', ''],
    ]);
    expect(find('a[href$="/investigate"]')).not.toBeNull();
  });

  it('keeps every edit, newest first, with its reason and both orders', () => {
    render();

    expect(
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.rank-order__actions li',
        ),
      ).map(item => textOf(item).trim()),
    ).toEqual([
      'Nov 15, 2024, 12:00:00 PM, steve: “Commander is Captain renamed” from 1: Admiral · 2: Captain to 1: Admiral · 2: Captain, Commander',
      'Nov 1, 2024, 12:00:00 PM, an account since closed: “First order” from no order to 1: Admiral · 2: Captain',
    ]);
  });

  it('says so when no export has listed a rank, nor anybody ordered one', () => {
    roster.rankOrder.mockReturnValue(
      of({ tiers: [], labels: [], actions: [] }),
    );
    render();

    expect(text()).toContain('Now: no order');
    expect(text()).toContain('No export of this Fleet has listed a rank yet');
    expect(text()).toContain('Nobody has ordered this Fleet’s ranks yet.');
    expect(find('form')).toBeNull();
  });

  it('shows the order the boxes make, closing any gap', () => {
    render();
    type(boxes()[0], '2');
    type(boxes()[1], '5');
    type(boxes()[2], '');

    expect(text()).toContain('Will be: 1: Admiral · 2: Captain');
  });

  it('refuses a box that is not a tier, and says why', () => {
    render();
    type(
      find('#rank-order-reason') as HTMLTextAreaElement,
      'Cadets are the newest',
    );

    for (const typed of ['0', 'x', '1.5', '-1']) {
      type(boxes()[3], typed);

      expect(boxes()[3].getAttribute('aria-invalid')).toBe('true');
      expect(
        find(`#${boxes()[3].getAttribute('aria-describedby')}`)?.textContent,
      ).toContain('A tier is a whole number from 1, or blank.');
      expect(text()).toContain('Correct the tiers marked');
      expect(save().disabled).toBe(true);
    }

    type(boxes()[3], ' 3 ');

    expect(boxes()[3].getAttribute('aria-invalid')).toBe('false');
    expect(save().disabled).toBe(false);
  });

  it('will not save the order the Fleet has, labels in a tier being unordered', () => {
    render();
    type(
      find('#rank-order-reason') as HTMLTextAreaElement,
      'Cadets are the newest',
    );

    expect(save().disabled).toBe(true);

    // The same tiers, numbered differently.
    type(boxes()[0], '4');
    type(boxes()[1], '7');
    type(boxes()[2], '7');

    expect(save().disabled).toBe(true);
  });

  it('will not save without a reason', () => {
    render();
    type(boxes()[3], '3');

    expect(save().disabled).toBe(true);

    type(find('#rank-order-reason') as HTMLTextAreaElement, '   ');

    expect(save().disabled).toBe(true);
  });

  it('saves the order with the one it was read as, and reads it again', () => {
    render();
    placeCadet();
    find('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(roster.updateRankOrder).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      {
        tiers: [['Admiral'], ['Captain', 'Commander'], ['Cadet']],
        expected: ORDER.tiers,
        reason: 'Cadets are the newest',
      },
    );
    expect(roster.rankOrder).toHaveBeenCalledTimes(2);
    expect(find('[role="status"]')?.textContent?.trim()).toBe(RANK_ORDER_SAVED);
    expect(boxes()[3].value).toBe('');
    expect((find('#rank-order-reason') as HTMLTextAreaElement).value).toBe('');
  });

  it('holds the form while a save is under way', () => {
    const saved$ = new Subject<RosterRankOrder>();

    roster.updateRankOrder.mockReturnValue(saved$);
    render();
    placeCadet();
    save().click();
    fixture.detectChanges();

    expect(textOf(save()).trim()).toBe('Saving');
    expect(save().disabled).toBe(true);
    expect(boxes()[0].disabled).toBe(true);

    // A second submission meanwhile sends nothing.
    fixture.componentInstance.onSubmit({
      order: ORDER,
      section: {} as never,
    });

    expect(roster.updateRankOrder).toHaveBeenCalledTimes(1);

    saved$.next(ORDER);
    fixture.detectChanges();

    expect(textOf(save()).trim()).toBe('Save the order');
  });

  it('reads the order again when somebody changed it first, keeping the reason', () => {
    roster.updateRankOrder.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    render();
    placeCadet();
    save().click();
    fixture.detectChanges();

    expect(text()).toContain(RANK_ORDER_CHANGED_MEANWHILE);
    expect(roster.rankOrder).toHaveBeenCalledTimes(2);
    expect(boxes()[3].value).toBe('');
    expect((find('#rank-order-reason') as HTMLTextAreaElement).value).toBe(
      '  Cadets are the newest  ',
    );
  });

  it('gives the server’s reason for an order it would not take', () => {
    roster.updateRankOrder.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'No export has listed the rank “Cadet”.' },
          }),
      ),
    );
    render();
    placeCadet();
    save().click();
    fixture.detectChanges();

    expect(text()).toContain('No export has listed the rank “Cadet”.');
    // What was typed stays, to be put right.
    expect(boxes()[3].value).toBe('3');
    expect(roster.rankOrder).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a failure', new HttpErrorResponse({ status: 500 })],
    ['a refusal with no reason', new HttpErrorResponse({ status: 400 })],
  ])('says the order was not saved after %s', (_case, error) => {
    roster.updateRankOrder.mockReturnValue(throwError(() => error));
    render();
    placeCadet();
    save().click();
    fixture.detectChanges();

    expect(text()).toContain(RANK_ORDER_SAVE_FAILED);
    expect(find('[role="status"]')).toBeNull();
  });
});

describe('sameOrder', () => {
  it('is the same order whatever the order within a tier', () => {
    expect(sameOrder([['A'], ['B', 'C']], [['A'], ['C', 'B']])).toBe(true);
  });

  it('is another order when a tier moves or a label does', () => {
    expect(sameOrder([['A'], ['B']], [['B'], ['A']])).toBe(false);
    expect(sameOrder([['A', 'B']], [['A'], ['B']])).toBe(false);
    expect(sameOrder([], [['A']])).toBe(false);
  });
});
