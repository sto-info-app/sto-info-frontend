import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  Router,
} from '@angular/router';

import { BehaviorSubject, of } from 'rxjs';

import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { FleetScopePageState } from 'src/app/fleet/scope/fleet-scope-page.models';
import {
  FleetAudience,
  FleetRecruitmentState,
  FleetScopeStatus,
  FleetScopeRelationship,
  FleetScopeViewer,
  ResolvedStoFleet,
  StoFleet,
} from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import { FleetPageComponent } from './fleet-page.component';

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
    exactGameName: 'Starfleet Command ',
    allegianceFactionId: null,
    slug: 'starfleet-command',
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

/** A viewer who may look and change nothing, which is most of them. */
const READER: FleetScopeViewer = {
  capabilities: [],
  mayManageBanner: false,
  mayManageEmblem: false,
  relationship: FleetScopeRelationship.NONE,
  isFollowingCommunity: false,
  followerCount: 0,
};

/** A viewer who may put a roster into the Fleet. */
const ROSTER_IMPORTER: FleetScopeViewer = {
  ...READER,
  capabilities: ['roster.import'],
};

/** A viewer who may change the artwork. */
const ARTWORK_KEEPER: FleetScopeViewer = {
  capabilities: ['scope.images.manage'],
  mayManageBanner: true,
  mayManageEmblem: true,
  relationship: FleetScopeRelationship.NONE,
  isFollowingCommunity: false,
  followerCount: 0,
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
    viewer: READER,
    ...overrides,
  };
}

describe('FleetPageComponent', () => {
  let fixture: ComponentFixture<FleetPageComponent>;
  let params$: BehaviorSubject<ParamMap>;
  let scopes: { resolveFleet: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(
      convertToParamMap({
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        slug: 'starfleet-command',
      }),
    );
    scopes = { resolveFleet: jest.fn(() => of(resolved())) };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [FleetPageComponent],
      providers: [
        { provide: FleetScopeService, useValue: scopes },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { paramMap: params$ } },
        { provide: PageTitleService, useValue: { setTitle: jest.fn() } },
      ],
    })
      .overrideComponent(FleetPageComponent, {
        set: {
          providers: [
            {
              provide: AppDatePipe,
              useValue: { transform: (): string => '4 March 2015' },
            },
          ],
        },
      })
      .compileComponents();
  });

  /**
   * Renders the page.
   */
  function render(): void {
    fixture = TestBed.createComponent(FleetPageComponent);
    fixture.detectChanges();
  }

  /**
   * Reads the state the page is in.
   *
   * @returns The state.
   */
  const state = (): FleetScopePageState => {
    let current: FleetScopePageState | undefined;
    fixture.componentInstance.state$.subscribe(value => (current = value));

    return current as FleetScopePageState;
  };

  // One request for the whole address. Fetching the Community, then the
  // platform, then the Fleet would show three loading states for one page.
  it('resolves all three segments in one request', () => {
    render();

    expect(scopes.resolveFleet).toHaveBeenCalledWith(
      'united-federation-alliance',
      'pc',
      'starfleet-command',
    );
  });

  it('asks with empty segments when the address is incomplete', () => {
    params$.next(convertToParamMap({}));

    render();

    expect(scopes.resolveFleet).toHaveBeenLastCalledWith('', '', '');
  });

  it('heads the page with the name the game holds, spaces and all', () => {
    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.name).toBe(
      'Starfleet Command ',
    );
  });

  it('names the Community holding it, and links to it', () => {
    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.communityName).toBe(
      'United Federation Alliance',
    );
    expect(drawn.kind === 'READY' && drawn.header.communityLink).toEqual([
      '/fleets',
      'communities',
      'united-federation-alliance',
    ]);
  });

  // Anybody may register a Fleet and nothing proves they run it, so how
  // fresh the record is leads the facts.
  it('leads with when a roster was last imported', () => {
    scopes.resolveFleet.mockReturnValue(
      of(resolved({ fleet: fleet({ lastEffectiveImportAt: '2015-03-04Z' }) })),
    );

    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.facts[0]).toEqual({
      label: 'Roster last imported',
      value: '4 March 2015',
    });
  });

  it('says Never rather than leaving the freshness line off', () => {
    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.facts[0]).toEqual({
      label: 'Roster last imported',
      value: 'Never',
    });
  });

  /*
   * “Never” and “could not possibly” look identical on the line a reader
   * judges a record by, and only one of them is somebody's neglect.
   */
  it('says why a console Fleet has no roster instead of saying Never', () => {
    scopes.resolveFleet.mockReturnValue(
      of(
        resolved({
          fleet: fleet({
            platformName: 'Xbox',
            platformProvidesRosterExport: false,
          }),
        }),
      ),
    );

    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.facts[0]).toEqual({
      label: 'Roster last imported',
      value: 'The game provides no roster export on Xbox',
    });
  });

  /*
   * A Fleet can carry a date from before it moved platform, or from a
   * console that has since lost the facility. The platform is the reason
   * there is nothing to show, so it answers first.
   */
  it('says so even where a date was recorded before', () => {
    scopes.resolveFleet.mockReturnValue(
      of(
        resolved({
          fleet: fleet({
            platformName: 'PlayStation',
            platformProvidesRosterExport: false,
            lastEffectiveImportAt: '2015-03-04Z',
          }),
        }),
      ),
    );

    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.facts[0]?.value).toBe(
      'The game provides no roster export on PlayStation',
    );
  });

  it('says when a closed Fleet was closed', () => {
    scopes.resolveFleet.mockReturnValue(
      of(
        resolved({
          fleet: fleet({
            status: FleetScopeStatus.CLOSED,
            closedAt: '2026-05-06T07:08:09.000Z',
          }),
        }),
      ),
    );

    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.facts).toContainEqual({
      label: 'Closed',
      value: '4 March 2015',
    });
  });

  it('shows no description, a Fleet having none of its own', () => {
    render();

    expect(state()).toEqual(
      expect.objectContaining({ kind: 'READY', description: null }),
    );
  });

  describe('a Fleet no Community has registered', () => {
    beforeEach(() => {
      scopes.resolveFleet.mockReturnValue(
        of(
          resolved({
            fleet: fleet({ communityId: null }),
            communitySlug: 'standalone',
            communityName: null,
          }),
        ),
      );
    });

    // The two things that make such a record different — nobody stands
    // behind it, and nobody can correct it — are the two a reader would
    // otherwise assume the opposite of.
    it('says plainly that nobody here runs it', () => {
      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.notice).toContain(
        'No Community here has registered this Fleet',
      );
      expect(drawn.kind === 'READY' && drawn.notice).toContain(
        'nobody can change or close it',
      );
    });

    it('names no Community and offers nothing to open', () => {
      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.header.communityName).toBeNull();
      expect(drawn.kind === 'READY' && drawn.header.communityLink).toBeNull();
    });

    /*
     * Its artwork is addressed outside the Community collection, because
     * there is no Community to nest it under and the rule it is held to is
     * a different one.
     */
    it('addresses its artwork as a record nobody registered', () => {
      scopes.resolveFleet.mockReturnValue(
        of(
          resolved({
            fleet: fleet({ communityId: null }),
            communitySlug: 'standalone',
            communityName: null,
            viewer: ARTWORK_KEEPER,
          }),
        ),
      );

      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.artwork?.target).toEqual({
        kind: 'STANDALONE_FLEET',
        fleetId: 'fleet-1',
      });
    });

    it('keeps the reserved segment when it corrects the address', () => {
      scopes.resolveFleet.mockReturnValue(
        of(
          resolved({
            fleet: fleet({ communityId: null }),
            communitySlug: 'standalone',
            communityName: null,
            redirected: true,
          }),
        ),
      );

      render();

      expect(router.navigate).toHaveBeenCalledWith(
        [
          '/fleets',
          'communities',
          'standalone',
          'fleets',
          'pc',
          'starfleet-command',
        ],
        { replaceUrl: true, queryParamsHandling: 'preserve' },
      );
    });
  });

  describe('its artwork', () => {
    /*
     * A page is read far more often than it is edited, so a row of buttons
     * nobody can press would be the ordinary case rather than the exception.
     */
    it('offers nothing to somebody who may change nothing', () => {
      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.artwork).toBeNull();
    });

    it('addresses a registered Fleet inside its Community', () => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved({ viewer: ARTWORK_KEEPER })),
      );

      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.artwork?.target).toEqual({
        kind: 'FLEET',
        communityId: 'community-1',
        fleetId: 'fleet-1',
      });
      expect(drawn.kind === 'READY' && drawn.artwork?.scopeName).toBe(
        'Starfleet Command ',
      );
    });

    /*
     * Reading the record again is what turns a published picture into one
     * the page can draw: its delivery address only came into existence when
     * the scan cleared.
     */
    it('asks for the record again when something changes', () => {
      render();

      fixture.componentInstance.state$.subscribe();
      const before = scopes.resolveFleet.mock.calls.length;

      fixture.componentInstance.reload();

      expect(scopes.resolveFleet.mock.calls.length).toBeGreaterThan(before);
    });
  });

  it('carries no notice for a Fleet a Community registered', () => {
    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.notice).toBeNull();
  });

  it('replaces the address when any segment of it is out of date', () => {
    scopes.resolveFleet.mockReturnValue(of(resolved({ redirected: true })));

    render();

    expect(router.navigate).toHaveBeenCalledWith(
      [
        '/fleets',
        'communities',
        'united-federation-alliance',
        'fleets',
        'pc',
        'starfleet-command',
      ],
      { replaceUrl: true, queryParamsHandling: 'preserve' },
    );
  });

  it('leaves a current address alone', () => {
    render();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  describe('following it', () => {
    /*
     * The subscription lives at the Community, so a Fleet page follows the
     * Community that holds it. The sentence about standing still names the
     * Fleet, because that is what the page is about.
     */
    it('follows the Community that holds the Fleet', () => {
      render();

      const drawn = state();

      if (drawn.kind !== 'READY') {
        throw new Error('expected a ready page');
      }

      expect(drawn.following?.communityId).toBe('community-1');
      expect(drawn.following?.scopeNoun).toBe('Fleet');
    });
  });

  describe('checking a roster export', () => {
    /**
     * Reads the actions the page offers.
     *
     * @returns Their labels.
     */
    function actionLabels(): string[] {
      const drawn = state();

      if (drawn.kind !== 'READY') {
        throw new Error('expected a ready page');
      }

      return drawn.actions.map(action => action.label);
    }

    it('offers the import to somebody who may import', () => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved({ viewer: ROSTER_IMPORTER })),
      );
      render();

      expect(actionLabels()).toEqual(['Import a roster export']);
    });

    it('links to the page below the Fleet’s own address', () => {
      scopes.resolveFleet.mockReturnValue(
        of(resolved({ viewer: ROSTER_IMPORTER })),
      );
      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.actions[0].link).toEqual([
        '/fleets',
        'communities',
        'united-federation-alliance',
        'fleets',
        'pc',
        'starfleet-command',
        'import',
      ]);
    });

    // Anybody may read a Fleet page, and most readers have no business
    // importing anything. A control they cannot use tells them about a
    // permission they did not ask about.
    it('offers nothing to a reader who may not import', () => {
      render();

      expect(actionLabels()).toEqual([]);
    });

    // Nobody runs a Fleet no Community has registered, so there is nothing
    // for a roster to be imported into.
    it('offers nothing where no Community has registered the Fleet', () => {
      scopes.resolveFleet.mockReturnValue(
        of(
          resolved({
            fleet: fleet({ communityId: null }),
            communityName: null,
            viewer: ROSTER_IMPORTER,
          }),
        ),
      );
      render();

      expect(actionLabels()).toEqual([]);
    });

    // The game writes no export on a console, so there is no file to check.
    it('offers nothing on a platform the game exports no roster from', () => {
      scopes.resolveFleet.mockReturnValue(
        of(
          resolved({
            fleet: fleet({
              platformProvidesRosterExport: false,
              platformName: 'PlayStation',
            }),
            viewer: ROSTER_IMPORTER,
          }),
        ),
      );
      render();

      expect(actionLabels()).toEqual([]);
    });
  });
});
