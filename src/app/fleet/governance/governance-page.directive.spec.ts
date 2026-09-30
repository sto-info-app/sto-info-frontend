import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Observable, of, throwError } from 'rxjs';

import {
  governanceCommunity,
  GovernanceReader,
  governanceFleet,
  governanceRoute,
  GovernanceRouteStubs,
} from 'src/app/fleet/governance/governance.testing';

import {
  GOVERNANCE_ERROR,
  GOVERNANCE_MISSING,
  GovernancePageDirective,
  GovernancePageState,
  GovernanceScopeVm,
} from './governance-page.directive';

/** What the test page says to a reader it turns away. */
const NOT_PERMITTED = 'Not yours.';

/** A Manage page that shows the scope it resolved. */
@Component({ selector: 'app-test-governance-page', template: '' })
class TestGovernancePageComponent extends GovernancePageDirective<string> {
  readonly notPermittedMessage = NOT_PERMITTED;

  /** What the page reads, once it may. */
  loadWith: () => Observable<string> = () => of('data');

  /**
   * Reads the page.
   *
   * @returns Whatever it is told to.
   */
  protected load(): Observable<string> {
    return this.loadWith();
  }
}

/** The same page, where a site administrator finds any Community (FC-050). */
@Component({ selector: 'app-test-admin-governance-page', template: '' })
class TestAdminGovernancePageComponent extends TestGovernancePageComponent {
  protected override readonly _siteAdminFindsAnyCommunity = true;
}

describe('GovernancePageDirective', () => {
  let route: GovernanceRouteStubs;
  let page: TestGovernancePageComponent;

  /**
   * Builds the page.
   *
   * @param reader - Who is reading, and where.
   */
  function build(reader: GovernanceReader): void {
    route = governanceRoute(reader, {});
    TestBed.configureTestingModule({
      imports: [TestGovernancePageComponent],
      providers: route.providers,
    });
    page = TestBed.createComponent(
      TestGovernancePageComponent,
    ).componentInstance;
  }

  /**
   * Every state the page passes through.
   *
   * @returns The states, in order.
   */
  function states(): GovernancePageState<string>[] {
    const seen: GovernancePageState<string>[] = [];

    page.state$.subscribe(state => seen.push(state));

    return seen;
  }

  it('resolves a Community from an address naming no platform', () => {
    build({ roles: ['OWNER'], capabilities: ['scope.close'] });

    const [loading, ready] = states();
    const scope = (ready as { scope: GovernanceScopeVm }).scope;

    expect(loading).toEqual({ kind: 'LOADING' });
    expect(ready.kind).toBe('READY');
    expect(scope).toEqual({
      target: { communityId: 'community-1', fleetId: null },
      isCommunity: true,
      name: 'United Federation Alliance',
      isClosed: false,
      roles: ['OWNER'],
      capabilities: ['scope.close'],
      isSiteAdmin: false,
      scopeLink: ['/fleets', 'communities', 'united-federation-alliance'],
      manageLink: [
        '/fleets',
        'communities',
        'united-federation-alliance',
        'manage',
      ],
      tabs: null,
      isArmada: false,
      armadaTabs: null,
    });
    expect(page.subjectOf(ready)).toBe('United Federation Alliance');
    expect(page.messageOf(ready)).toBeNull();
    expect(page.tabsOf(ready)).toBeNull();
    expect(page.armadaTabsOf(ready)).toBeNull();
  });

  it('resolves a Fleet from an address naming its platform', () => {
    build({ roles: ['ADMIN'], onFleet: true, closed: true });

    const ready = states()[1] as { scope: GovernanceScopeVm };

    expect(route.scopes.resolveFleet).toHaveBeenCalledWith(
      'united-federation-alliance',
      'pc',
      'ninth-fleet',
    );
    expect(ready.scope.target).toEqual({
      communityId: 'community-1',
      fleetId: 'fleet-1',
    });
    expect(ready.scope.isCommunity).toBe(false);
    expect(ready.scope.isClosed).toBe(true);
    expect(ready.scope.manageLink).toEqual([
      '/fleets',
      'communities',
      'united-federation-alliance',
      'fleets',
      'pc',
      'ninth-fleet',
      'manage',
    ]);
    expect(ready.scope.tabs?.roles).toEqual(['ADMIN']);
  });

  it.each([
    ['no Community holds', { communityId: null }],
    ['has no tabs, being nobody’s', { communityId: null, id: 'fleet-1' }],
  ])('finds nothing at a Fleet %s', (_why, fleet) => {
    build({ roles: ['OWNER'], onFleet: true });
    const resolved = governanceFleet({ roles: ['OWNER'] });

    route.scopes.resolveFleet.mockReturnValue(
      of({ ...resolved, fleet: { ...resolved.fleet, ...fleet } }),
    );

    const missing = states()[1];

    expect(missing).toEqual({ kind: 'MISSING' });
    expect(page.messageOf(missing)).toBe(GOVERNANCE_MISSING);
    expect(page.subjectOf(missing)).toBeNull();
  });

  it('turns away a reader the page is not open to, naming the scope', () => {
    build({ roles: ['MEMBER'] });

    const refused = states()[1];

    expect(refused.kind).toBe('NOT_PERMITTED');
    expect(page.messageOf(refused)).toBe(NOT_PERMITTED);
    expect(page.subjectOf(refused)).toBe('United Federation Alliance');
    expect(page.tabsOf(refused)).toBeNull();
  });

  it('tells an absent scope from a failed read', () => {
    build({ roles: ['OWNER'] });
    route.scopes.resolveCommunity.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    expect(states()[1]).toEqual({ kind: 'MISSING' });

    page.loadWith = () =>
      throwError(() => new HttpErrorResponse({ status: 500 }));
    route.scopes.resolveCommunity.mockReturnValue(
      of({
        community: {
          id: 'community-1',
          slug: 'united-federation-alliance',
          name: 'United Federation Alliance',
          status: 'ACTIVE',
        },
        viewer: { roles: ['OWNER'], capabilities: [] },
      }),
    );

    const failed = states()[1];

    expect(failed).toEqual({ kind: 'ERROR' });
    expect(page.messageOf(failed)).toBe(GOVERNANCE_ERROR);
    expect(page.messageOf({ kind: 'LOADING' })).toBeNull();
    expect(page.tabsOf({ kind: 'LOADING' })).toBeNull();
    expect(page.armadaTabsOf({ kind: 'LOADING' })).toBeNull();
  });

  it('reads the page again on asking, keeping the address', () => {
    build({ roles: ['OWNER'] });
    const seen = states();

    page.reload();

    expect(seen.map(state => state.kind)).toEqual([
      'LOADING',
      'READY',
      'LOADING',
      'READY',
    ]);
    expect(route.scopes.resolveCommunity).toHaveBeenCalledTimes(2);
  });

  it('answers to a missing Community segment with an empty one', () => {
    build({ roles: ['OWNER'] });
    route.params$.next({
      get: () => null,
    } as never);

    states();

    expect(route.scopes.resolveCommunity).toHaveBeenLastCalledWith('');
  });

  // Steve's decision of 30 September 2026, for the pages that ask for it.
  describe('a site administrator’s own read (FC-050)', () => {
    let governance: { resolveCommunityAsSiteAdmin: jest.Mock };

    /**
     * Builds a page.
     *
     * @param reader - Who is reading.
     * @param type - Which page.
     */
    function buildWith(
      reader: GovernanceReader,
      type: typeof TestGovernancePageComponent,
    ): void {
      governance = {
        resolveCommunityAsSiteAdmin: jest.fn(() =>
          of(governanceCommunity({ roles: ['ADMIN'] })),
        ),
      };
      route = governanceRoute(reader, governance);
      TestBed.configureTestingModule({
        imports: [type],
        providers: route.providers,
      });
      page = TestBed.createComponent(type).componentInstance;
    }

    it('finds the Community through it on a page that asks for it', () => {
      buildWith({ isSiteAdmin: true }, TestAdminGovernancePageComponent);

      const ready = states()[1] as { scope: GovernanceScopeVm };

      expect(governance.resolveCommunityAsSiteAdmin).toHaveBeenCalledWith(
        'united-federation-alliance',
      );
      expect(route.scopes.resolveCommunity).not.toHaveBeenCalled();
      expect(ready.scope.roles).toEqual(['ADMIN']);
      expect(ready.scope.isSiteAdmin).toBe(true);
    });

    it('asks the public read for anybody else on that page', () => {
      buildWith({ roles: ['OWNER'] }, TestAdminGovernancePageComponent);

      states();

      expect(route.scopes.resolveCommunity).toHaveBeenCalled();
      expect(governance.resolveCommunityAsSiteAdmin).not.toHaveBeenCalled();
    });

    it('asks the public read for a site administrator on any other page', () => {
      buildWith({ isSiteAdmin: true }, TestGovernancePageComponent);

      states();

      expect(route.scopes.resolveCommunity).toHaveBeenCalled();
      expect(governance.resolveCommunityAsSiteAdmin).not.toHaveBeenCalled();
    });
  });

  it('answers to a missing Fleet segment with an empty one', () => {
    build({ roles: ['OWNER'] });
    route.params$.next({
      get: (name: string) => (name === 'platformSegment' ? 'pc' : null),
    } as never);

    states();

    expect(route.scopes.resolveFleet).toHaveBeenLastCalledWith('', 'pc', '');
  });
});
