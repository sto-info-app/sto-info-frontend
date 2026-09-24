import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';

import { BehaviorSubject, NEVER, of, Subject, throwError } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterIdentityService } from 'src/app/fleet/identities/roster-identity.service';
import {
  RosterIdentityCandidate,
  RosterIdentityCandidateKind,
  RosterIdentityCandidatePage,
  RosterIdentityCandidateState,
  RosterIdentityCollisionReason,
  RosterIdentityConfidence,
  RosterIdentityDecisionAction,
  RosterIdentitySignal,
} from 'src/app/models/fleet-identity.models';
import {
  FleetAudience,
  FleetRecruitmentState,
  FleetScopeRelationship,
  FleetScopeStatus,
  FleetScopeViewer,
  ResolvedStoFleet,
  StoFleet,
} from 'src/app/models/fleet.models';

import { RosterIdentityDecisionDialogComponent } from '../roster-identity-decision-dialog/roster-identity-decision-dialog.component';

import {
  ROSTER_IDENTITY_ACTOR_GONE,
  ROSTER_IDENTITY_DECISION_ERROR,
  ROSTER_IDENTITY_DECISION_RECORDED,
  ROSTER_IDENTITY_LIST_ERROR,
  ROSTER_IDENTITY_LIST_MISSING,
  ROSTER_IDENTITY_LIST_NOT_PERMITTED,
  RosterIdentityListComponent,
} from './roster-identity-list.component';

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

/** Somebody who may import, and not investigate. */
const IMPORTER: FleetScopeViewer = {
  ...READER,
  capabilities: ['roster.import'],
};

/** Somebody who may decide renames. */
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
    viewer: INVESTIGATOR,
    ...overrides,
  };
}

/**
 * Builds a Character rename candidate, open and decidable.
 *
 * @param overrides - Fields to override.
 * @returns The candidate.
 */
function candidate(
  overrides: Partial<RosterIdentityCandidate> = {},
): RosterIdentityCandidate {
  return {
    id: 'candidate-1',
    kind: RosterIdentityCandidateKind.CHARACTER_RENAME,
    state: RosterIdentityCandidateState.OPEN,
    decidable: true,
    confidence: RosterIdentityConfidence.HIGH,
    signals: [
      { signal: RosterIdentitySignal.LEVEL_NOT_LOWER, held: true },
      { signal: RosterIdentitySignal.CONTRIBUTION_NOT_LOWER, held: false },
      { signal: RosterIdentitySignal.RANK_CHANGE_NOT_EARLIER, held: null },
    ],
    collisionReasons: [],
    stale: false,
    revision: 0,
    earlier: { importId: 'import-1', exportedAt: '2024-11-01T12:00:00.000Z' },
    later: { importId: 'import-2', exportedAt: '2024-11-15T12:00:00.000Z' },
    links: [
      {
        from: {
          aliasId: 'alias-1',
          identityId: 'identity-1',
          characterName: 'Kess Varro',
          accountHandle: '@fixture030',
          firstObservedAt: '2024-11-01T12:00:00.000Z',
          lastObservedAt: '2024-11-01T12:00:00.000Z',
        },
        to: {
          aliasId: 'alias-2',
          identityId: 'identity-2',
          characterName: 'Kess Tarin',
          accountHandle: '@fixture030',
          firstObservedAt: '2024-11-15T12:00:00.000Z',
          lastObservedAt: '2024-11-15T12:00:00.000Z',
        },
      },
    ],
    decisions: [],
    createdAt: '2024-11-15T12:05:00.000Z',
    ...overrides,
  };
}

/**
 * Builds a page of candidates.
 *
 * @param overrides - Fields to override.
 * @returns The page.
 */
function page(
  overrides: Partial<RosterIdentityCandidatePage> = {},
): RosterIdentityCandidatePage {
  return {
    items: [candidate()],
    total: 1,
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

describe('RosterIdentityListComponent', () => {
  let fixture: ComponentFixture<RosterIdentityListComponent>;
  let params$: BehaviorSubject<ParamMap>;
  let query$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let identities: { list: jest.Mock; decide: jest.Mock };
  let dialog: { open: jest.Mock };
  let afterClosed: jest.Mock;

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
    identities = {
      list: jest.fn(() => of(page())),
      decide: jest.fn(() => of(candidate())),
    };
    afterClosed = jest.fn(() => of({}));
    dialog = { open: jest.fn(() => ({ afterClosed })) };

    await TestBed.configureTestingModule({
      imports: [RosterIdentityListComponent],
      providers: [
        provideRouter([]),
        { provide: FleetScopeService, useValue: scopes },
        { provide: RosterIdentityService, useValue: identities },
        { provide: MatDialog, useValue: dialog },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params$, queryParamMap: query$ },
        },
        {
          provide: UserSettingsService,
          useValue: { displayTimezone: signal('UTC') },
        },
      ],
    }).compileComponents();
  });

  /** Renders the page. */
  function render(): void {
    fixture = TestBed.createComponent(RosterIdentityListComponent);
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
   * Finds a button by what it says.
   *
   * @param label - The button's text.
   * @param scope - Where to look.
   * @returns The button, if drawn.
   */
  const button = (
    label: string,
    scope = 'button',
  ): HTMLButtonElement | undefined =>
    findAll(scope).find(element => element.textContent?.trim() === label) as
      HTMLButtonElement | undefined;

  describe('reading the Fleet and its candidates', () => {
    it('says it is loading before the server has answered', () => {
      scopes.resolveFleet.mockReturnValue(NEVER);
      render();

      expect(find('app-loading-bar')).not.toBeNull();
    });

    it.each([
      [404, ROSTER_IDENTITY_LIST_MISSING],
      [500, ROSTER_IDENTITY_LIST_ERROR],
    ])('answers a %i for the Fleet', (status: number, message: string) => {
      scopes.resolveFleet.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status })),
      );
      render();

      expect(text()).toContain(message);
      expect(identities.list).not.toHaveBeenCalled();
    });

    // Switched off, the server says the route does not exist.
    it.each([
      [404, ROSTER_IDENTITY_LIST_MISSING],
      [500, ROSTER_IDENTITY_LIST_ERROR],
    ])('answers a %i for the candidates', (status: number, message: string) => {
      identities.list.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status })),
      );
      render();

      expect(text()).toContain(message);
    });

    it('asks about the Fleet the address names, open candidates first', () => {
      render();

      expect(scopes.resolveFleet).toHaveBeenCalledWith(
        'united-federation-alliance',
        'pc',
        'ninth-fleet',
      );
      expect(identities.list).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        1,
        RosterIdentityCandidateState.OPEN,
      );
    });

    it('asks for nothing where the address carries no segments', () => {
      params$.next(convertToParamMap({}));
      render();

      expect(scopes.resolveFleet).toHaveBeenCalledWith('', '', '');
    });

    it('reports a Fleet no Community holds as nothing to review', () => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved({ fleet: fleet({ communityId: null }) })),
      );
      render();

      expect(text()).toContain(ROSTER_IDENTITY_LIST_MISSING);
      expect(identities.list).not.toHaveBeenCalled();
    });

    // Importing is not investigating: the server refuses an importer too.
    it.each([
      ['a reader', READER],
      ['an importer', IMPORTER],
    ])('tells %s so, without asking', (_who, viewer: FleetScopeViewer) => {
      scopes.resolveFleet.mockReturnValue(of(resolved({ viewer })));
      render();

      expect(text()).toContain(ROSTER_IDENTITY_LIST_NOT_PERMITTED);
      expect(identities.list).not.toHaveBeenCalled();
      expect(findAll('nav a').map(link => link.getAttribute('href'))).toEqual([
        FLEET_HREF,
      ]);
    });

    it.each([
      [{}, 1, RosterIdentityCandidateState.OPEN],
      [{ state: 'confirmed' }, 1, RosterIdentityCandidateState.CONFIRMED],
      [
        { state: 'rejected', page: '3' },
        3,
        RosterIdentityCandidateState.REJECTED,
      ],
      [{ state: 'all' }, 1, null],
      [{ state: 'nonsense', page: '0' }, 1, RosterIdentityCandidateState.OPEN],
      [{ page: 'two' }, 1, RosterIdentityCandidateState.OPEN],
    ])(
      'reads %p as page %i of %p',
      (
        query: Record<string, string>,
        expectedPage: number,
        expectedState: RosterIdentityCandidateState | null,
      ) => {
        query$.next(convertToParamMap(query));
        render();

        expect(identities.list).toHaveBeenCalledWith(
          'community-1',
          'fleet-1',
          expectedPage,
          expectedState,
        );
      },
    );
  });

  describe('drawing a candidate', () => {
    it('counts them, and names the Fleet with a link back', () => {
      identities.list.mockReturnValue(of(page({ total: 7 })));
      render();

      expect(find('.header-count-badge')?.textContent?.trim()).toBe('7');
      expect(find('.roster-identities__intro a')?.getAttribute('href')).toBe(
        FLEET_HREF,
      );
      expect(text()).toContain('never links a name to an STO Info account');
    });

    it('shows its kind, where it stands and how sure', () => {
      render();

      expect(find('.roster-identities__kind')?.textContent).toBe(
        'Character rename',
      );
      expect(find('.roster-identities__state')?.textContent).toBe('Open');
      expect(find('.roster-identities__head')?.textContent).toContain(
        'High confidence',
      );
    });

    it('shows the names it would join, each with its handle', () => {
      render();

      expect(
        findAll('.roster-identities__name').map(name => name.textContent),
      ).toEqual(['Kess Varro', 'Kess Tarin']);
      expect(
        findAll('.roster-identities__handle').map(name => name.textContent),
      ).toEqual(['@fixture030', '@fixture030']);
    });

    it('cites both exports, linking to each import', () => {
      render();

      const links = findAll('.roster-identities__facts a');

      expect(links.map(link => link.getAttribute('href'))).toEqual([
        `${FLEET_HREF}/imports/import-1`,
        `${FLEET_HREF}/imports/import-2`,
      ]);
      // Intl puts a narrow no-break space before the meridiem.
      expect(links[0].textContent).toMatch(/Nov 1, 2024, 12:00:00\sPM/);
      expect(links[1].textContent).toMatch(/Nov 15, 2024, 12:00:00\sPM/);
    });

    it('says how each check came out', () => {
      render();

      const facts = find('.roster-identities__facts')?.textContent ?? '';

      expect(facts).toMatch(/Level did not go down\s*Yes/);
      expect(facts).toMatch(/Contribution total did not go down\s*No/);
      expect(facts).toMatch(
        /Rank change date did not go back\s*Could not be checked/,
      );
    });

    it('offers Confirm and Reject on a decidable candidate, and no Undo', () => {
      render();

      expect(button('Confirm')).toBeDefined();
      expect(button('Reject')).toBeDefined();
      expect(button('Undo')).toBeUndefined();
    });

    it('explains a collision and offers nothing to press', () => {
      identities.list.mockReturnValue(
        of(
          page({
            items: [
              candidate({
                kind: RosterIdentityCandidateKind.ACCOUNT_RENAME,
                decidable: false,
                confidence: RosterIdentityConfidence.MEDIUM,
                collisionReasons: [
                  RosterIdentityCollisionReason.SEVERAL_PARTNERS,
                  RosterIdentityCollisionReason.HANDLE_SPLIT,
                ],
              }),
            ],
          }),
        ),
      );
      render();

      expect(find('.roster-identities__kind')?.textContent).toBe(
        'Account rename',
      );
      expect(findAll('.roster-identities__collision li')).toHaveLength(2);
      expect(text()).toContain('cannot be decided');
      expect(text()).toContain('more than one new handle');
      expect(findAll('.roster-identities__actions button')).toHaveLength(0);
    });

    it('explains a pair a partial roster listed together', () => {
      identities.list.mockReturnValue(
        of(
          page({
            items: [
              candidate({
                decidable: false,
                collisionReasons: [
                  RosterIdentityCollisionReason.LISTED_TOGETHER,
                ],
              }),
            ],
          }),
        ),
      );
      render();

      expect(find('.roster-identities__collision li')?.textContent).toContain(
        'A partial roster between the two listed both names at once.',
      );
      expect(findAll('.roster-identities__actions button')).toHaveLength(0);
    });

    it('offers only Undo on a decided one, with its history', () => {
      identities.list.mockReturnValue(
        of(
          page({
            items: [
              candidate({
                state: RosterIdentityCandidateState.CONFIRMED,
                decidable: false,
                revision: 2,
                decisions: [
                  {
                    action: RosterIdentityDecisionAction.CONFIRM,
                    fromState: RosterIdentityCandidateState.OPEN,
                    toState: RosterIdentityCandidateState.CONFIRMED,
                    revision: 2,
                    reason: null,
                    decidedAt: '2024-11-20T10:00:00.000Z',
                    actorUsername: 'jellico',
                  },
                  {
                    action: RosterIdentityDecisionAction.REJECT,
                    fromState: RosterIdentityCandidateState.OPEN,
                    toState: RosterIdentityCandidateState.REJECTED,
                    revision: 1,
                    reason: 'Looked like two people',
                    decidedAt: '2024-11-16T10:00:00.000Z',
                    actorUsername: null,
                  },
                ],
              }),
            ],
          }),
        ),
      );
      render();

      expect(button('Confirm')).toBeUndefined();
      expect(button('Reject')).toBeUndefined();
      expect(button('Undo')).toBeDefined();

      const history = findAll('.roster-identities__history li').map(
        entry => entry.textContent ?? '',
      );

      expect(find('.roster-identities__history summary')?.textContent).toBe(
        'History (2)',
      );
      expect(history[0]).toContain('Confirmed by jellico');
      expect(history[0]).toMatch(/Nov 20, 2024, 10:00:00\sAM/);
      expect(history[1]).toContain(`Rejected by ${ROSTER_IDENTITY_ACTOR_GONE}`);
      expect(
        findAll('.roster-identities__reason').map(reason => reason.textContent),
      ).toEqual(['Looked like two people']);
    });

    it('draws no history where nothing was decided', () => {
      render();

      expect(find('.roster-identities__history')).toBeNull();
    });

    it('flags a decision whose evidence has moved', () => {
      identities.list.mockReturnValue(
        of(
          page({
            items: [
              candidate({
                state: RosterIdentityCandidateState.REJECTED,
                decidable: false,
                stale: true,
              }),
            ],
          }),
        ),
      );
      render();

      expect(find('.roster-identities__stale')?.textContent).toContain(
        'The evidence has changed since this was decided',
      );
    });

    it('draws no flag on one whose evidence has not', () => {
      render();

      expect(find('.roster-identities__stale')).toBeNull();
    });

    it.each([
      [{}, 'No rename is waiting for a decision.'],
      [{ state: 'confirmed' }, 'No rename has been confirmed.'],
      [{ state: 'rejected' }, 'No rename has been rejected.'],
      [{ state: 'all' }, 'The rosters imported so far suggest no renames.'],
    ])(
      'says so when %p finds nothing',
      (query: Record<string, string>, message: string) => {
        query$.next(convertToParamMap(query));
        identities.list.mockReturnValue(of(page({ items: [], total: 0 })));
        render();

        expect(find('.lcars-empty-state')?.textContent).toBe(message);
        expect(find('.roster-identities__list')).toBeNull();
      },
    );
  });

  describe('filtering and paging', () => {
    let navigate: jest.SpyInstance;

    beforeEach(() => {
      navigate = jest
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);
    });

    it('marks the filter showing', () => {
      query$.next(convertToParamMap({ state: 'rejected' }));
      render();

      const pressed = findAll('.lcars-tab[aria-pressed="true"]');

      expect(pressed.map(tab => tab.textContent?.trim())).toEqual(['Rejected']);
    });

    it.each([
      ['Confirmed', 'confirmed'],
      ['All', 'all'],
      ['Open', null],
    ])(
      'shows %s from the first page',
      (label: string, expected: string | null) => {
        render();
        button(label, '.lcars-tab')?.click();

        expect(navigate).toHaveBeenCalledWith(
          [],
          expect.objectContaining({
            queryParams: { state: expected, page: null },
            queryParamsHandling: 'merge',
          }),
        );
      },
    );

    it('draws no pager for a single page', () => {
      render();

      expect(find('.lcars-pagination')).toBeNull();
    });

    it('draws no pager where the server gives no page size', () => {
      identities.list.mockReturnValue(of(page({ total: 45, pageSize: 0 })));
      render();

      expect(find('.lcars-pagination')).toBeNull();
    });

    it('turns pages, keeping the first page out of the address', () => {
      identities.list.mockReturnValue(
        of(page({ total: 45, page: 2, pageSize: 20 })),
      );
      render();

      expect(find('.lcars-pagination span')?.textContent).toBe('Page 2 of 3');

      button('Next')?.click();
      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: { page: 3 } }),
      );

      button('Previous')?.click();
      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: { page: null } }),
      );
    });

    it('disables Previous on the first page and Next on the last', () => {
      identities.list.mockReturnValue(
        of(page({ total: 45, page: 1, pageSize: 20 })),
      );
      render();

      expect(button('Previous')?.disabled).toBe(true);
      expect(button('Next')?.disabled).toBe(false);
    });
  });

  describe('deciding', () => {
    it.each([
      ['Confirm', RosterIdentityDecisionAction.CONFIRM, false],
      ['Reject', RosterIdentityDecisionAction.REJECT, false],
    ])(
      'asks before it will %s, a reason optional',
      (label: string, _action, reasonRequired: boolean) => {
        render();
        button(label)?.click();

        expect(dialog.open).toHaveBeenCalledWith(
          RosterIdentityDecisionDialogComponent,
          expect.objectContaining({
            data: expect.objectContaining({
              confirmText: label,
              reasonRequired,
            }),
          }),
        );
      },
    );

    it('asks why before it will undo', () => {
      identities.list.mockReturnValue(
        of(
          page({
            items: [
              candidate({
                state: RosterIdentityCandidateState.CONFIRMED,
                decidable: false,
                revision: 1,
              }),
            ],
          }),
        ),
      );
      afterClosed.mockReturnValue(of({ reason: 'Two different people' }));
      render();
      button('Undo')?.click();

      expect(dialog.open).toHaveBeenCalledWith(
        RosterIdentityDecisionDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({ reasonRequired: true }),
        }),
      );
      expect(identities.decide).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'candidate-1',
        {
          action: RosterIdentityDecisionAction.UNDO,
          revision: 1,
          reason: 'Two different people',
        },
      );
    });

    it('does nothing when the reviewer cancels', () => {
      afterClosed.mockReturnValue(of(undefined));
      render();
      button('Confirm')?.click();

      expect(identities.decide).not.toHaveBeenCalled();
    });

    it('sends the revision it read, says it is recorded and reads again', () => {
      render();
      button('Confirm')?.click();
      fixture.detectChanges();

      expect(identities.decide).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'candidate-1',
        { action: RosterIdentityDecisionAction.CONFIRM, revision: 0 },
      );
      expect(identities.list).toHaveBeenCalledTimes(2);
      expect(find('[role="status"]')?.textContent?.trim()).toBe(
        ROSTER_IDENTITY_DECISION_RECORDED,
      );
    });

    it('holds every button while a decision is on its way', () => {
      const pending = new Subject<RosterIdentityCandidate>();

      identities.decide.mockReturnValue(pending);
      render();
      button('Confirm')?.click();
      fixture.detectChanges();

      expect(button('Confirm')?.disabled).toBe(true);
      expect(button('Reject')?.disabled).toBe(true);

      pending.next(candidate());
      fixture.detectChanges();

      expect(button('Confirm')?.disabled).toBe(false);
    });

    it.each([
      [
        'the server’s own sentence for a conflict',
        409,
        { message: 'This candidate has changed since you loaded it.' },
        'This candidate has changed since you loaded it.',
      ],
      [
        'the general sentence for a conflict without one',
        409,
        { message: ['not', 'a', 'sentence'] },
        ROSTER_IDENTITY_DECISION_ERROR,
      ],
      [
        'the general sentence for a failure',
        500,
        null,
        ROSTER_IDENTITY_DECISION_ERROR,
      ],
    ])(
      'gives %s, and reads again',
      (_what, status: number, error: unknown, message: string) => {
        identities.decide.mockReturnValue(
          throwError(() => new HttpErrorResponse({ status, error })),
        );
        render();
        button('Confirm')?.click();
        fixture.detectChanges();

        expect(text()).toContain(message);
        expect(find('[role="status"]')).toBeNull();
        expect(identities.list).toHaveBeenCalledTimes(2);
        expect(button('Confirm')?.disabled).toBe(false);
      },
    );

    it('forgets a refusal on turning to another filter', () => {
      jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      identities.decide.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();
      button('Confirm')?.click();
      fixture.detectChanges();

      button('All', '.lcars-tab')?.click();
      fixture.detectChanges();

      expect(text()).not.toContain(ROSTER_IDENTITY_DECISION_ERROR);
    });
  });
});
