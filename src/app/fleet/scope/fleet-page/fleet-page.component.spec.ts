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
});
