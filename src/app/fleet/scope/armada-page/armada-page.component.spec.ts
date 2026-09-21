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
  FleetScopeStatus,
  FleetScopeViewer,
  ResolvedStoArmada,
  StoArmada,
} from 'src/app/models/fleet.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { PageTitleService } from 'src/app/shared/services/page-title.service';

import { ArmadaPageComponent } from './armada-page.component';

/**
 * Builds an Armada as the server would send it.
 *
 * @param overrides - Fields to override.
 * @returns The Armada.
 */
function armada(overrides: Partial<StoArmada> = {}): StoArmada {
  return {
    id: 'armada-1',
    communityId: 'community-1',
    platformId: 'platform-1',
    platformName: 'PC',
    platformSegment: 'pc',
    exactGameName: 'Ninth Fleet Armada',
    displayName: null,
    slug: 'ninth-fleet-armada',
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
};

/** A viewer who may change the artwork. */
const ARTWORK_KEEPER: FleetScopeViewer = {
  capabilities: ['scope.images.manage'],
  mayManageBanner: true,
  mayManageEmblem: true,
};

/**
 * Builds the server's answer for an Armada address.
 *
 * @param overrides - Fields to override.
 * @returns The resolved Armada.
 */
function resolved(
  overrides: Partial<ResolvedStoArmada> = {},
): ResolvedStoArmada {
  return {
    armada: armada(),
    communitySlug: 'united-federation-alliance',
    communityName: 'United Federation Alliance',
    platformSegment: 'pc',
    redirected: false,
    viewer: READER,
    ...overrides,
  };
}

describe('ArmadaPageComponent', () => {
  let fixture: ComponentFixture<ArmadaPageComponent>;
  let params$: BehaviorSubject<ParamMap>;
  let scopes: { resolveArmada: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(async () => {
    params$ = new BehaviorSubject<ParamMap>(
      convertToParamMap({
        communitySlug: 'united-federation-alliance',
        platformSegment: 'pc',
        slug: 'ninth-fleet-armada',
      }),
    );
    scopes = { resolveArmada: jest.fn(() => of(resolved())) };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ArmadaPageComponent],
      providers: [
        { provide: FleetScopeService, useValue: scopes },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { paramMap: params$ } },
        { provide: PageTitleService, useValue: { setTitle: jest.fn() } },
      ],
    })
      .overrideComponent(ArmadaPageComponent, {
        set: {
          providers: [
            {
              provide: AppDatePipe,
              useValue: { transform: (): string => '2 January 2026' },
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
    fixture = TestBed.createComponent(ArmadaPageComponent);
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

  it('resolves all three segments in one request', () => {
    render();

    expect(scopes.resolveArmada).toHaveBeenCalledWith(
      'united-federation-alliance',
      'pc',
      'ninth-fleet-armada',
    );
  });

  it('asks with empty segments when the address is incomplete', () => {
    params$.next(convertToParamMap({}));

    render();

    expect(scopes.resolveArmada).toHaveBeenLastCalledWith('', '', '');
  });

  // An Armada groups Fleets rather than recruiting players, so the pill
  // speaks only when the record itself has stopped operating.
  it('says nothing about recruitment', () => {
    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.status).toBeNull();
  });

  it('shows a closed Armada as closed', () => {
    scopes.resolveArmada.mockReturnValue(
      of(
        resolved({
          armada: armada({
            status: FleetScopeStatus.CLOSED,
            closedAt: '2026-05-06T07:08:09.000Z',
          }),
        }),
      ),
    );

    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.status).toEqual({
      label: 'Closed',
      modifier: 'closed',
    });
    expect(drawn.kind === 'READY' && drawn.header.facts).toContainEqual({
      label: 'Closed',
      value: '2 January 2026',
    });
  });

  // The exact game name is the heading, so a preferred name goes in the
  // facts, where it cannot be mistaken for the name the game holds.
  it('puts a preferred name first among the facts', () => {
    scopes.resolveArmada.mockReturnValue(
      of(resolved({ armada: armada({ displayName: 'The Ninth' }) })),
    );

    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.name).toBe(
      'Ninth Fleet Armada',
    );
    expect(drawn.kind === 'READY' && drawn.header.facts[0]).toEqual({
      label: 'Known as',
      value: 'The Ninth',
    });
  });

  it('does not repeat a preferred name that matches the game’s', () => {
    scopes.resolveArmada.mockReturnValue(
      of(resolved({ armada: armada({ displayName: 'Ninth Fleet Armada' }) })),
    );

    render();

    const drawn = state();

    expect(drawn.kind === 'READY' && drawn.header.facts[0]).toEqual({
      label: 'Platform',
      value: 'PC',
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

    it('addresses it inside the Community holding it', () => {
      scopes.resolveArmada.mockReturnValue(
        of(resolved({ viewer: ARTWORK_KEEPER })),
      );

      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.artwork?.target).toEqual({
        kind: 'ARMADA',
        communityId: 'community-1',
        armadaId: 'armada-1',
      });
    });

    /*
     * The name the game holds, not the one a Community prefers: the
     * dialogue is about the record, and the record is that name.
     */
    it('heads the dialogue with the name the game holds', () => {
      scopes.resolveArmada.mockReturnValue(
        of(
          resolved({
            armada: armada({ displayName: 'The Ninth' }),
            viewer: ARTWORK_KEEPER,
          }),
        ),
      );

      render();

      const drawn = state();

      expect(drawn.kind === 'READY' && drawn.artwork?.scopeName).toBe(
        armada().exactGameName,
      );
    });
  });

  it('replaces the address when any segment of it is out of date', () => {
    scopes.resolveArmada.mockReturnValue(of(resolved({ redirected: true })));

    render();

    expect(router.navigate).toHaveBeenCalledWith(
      [
        '/fleets',
        'communities',
        'united-federation-alliance',
        'armadas',
        'pc',
        'ninth-fleet-armada',
      ],
      { replaceUrl: true, queryParamsHandling: 'preserve' },
    );
  });
});
