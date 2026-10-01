import { EnvironmentProviders, Provider } from '@angular/core';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';

import { BehaviorSubject, of } from 'rxjs';

import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import {
  ArmadaBeta,
  ArmadaFleetRef,
  ArmadaNode,
  ArmadaPosition,
  ArmadaRef,
  ArmadaRequest,
  ArmadaRequestStatus,
  ArmadaStructure,
  ArmadaView,
} from 'src/app/models/fleet-armada.models';
import { ResolvedStoArmada } from 'src/app/models/fleet.models';

/** The Armada's own address, which its sections hang below. */
export const ARMADA_HREF =
  '/fleets/communities/united-federation-alliance/armadas/pc/sol-armada';

/**
 * Names a Fleet the reader may see.
 *
 * @param name - Its name, which also makes its id and slug.
 * @returns The reference.
 */
export function armadaFleet(name: string): ArmadaFleetRef {
  const slug = name.toLowerCase().replace(/\s+/g, '-');

  return { id: `fleet-${slug}`, name, slug, platformSegment: 'pc' };
}

/** A Fleet the reader may not see. */
export const HIDDEN_ARMADA_FLEET: ArmadaFleetRef = {
  id: null,
  name: null,
  slug: null,
  platformSegment: 'pc',
};

/**
 * Places a Fleet.
 *
 * @param fleet - The Fleet.
 * @param position - Where.
 * @returns The node.
 */
export function armadaNode(
  fleet: ArmadaFleetRef,
  position: ArmadaPosition,
): ArmadaNode {
  return { fleet, position, since: '2026-09-20T10:00:00.000Z' };
}

/**
 * Places a Beta, with Gammas under it.
 *
 * @param fleet - The Beta.
 * @param gammas - The Fleets under it.
 * @returns The Beta.
 */
export function armadaBeta(
  fleet: ArmadaFleetRef,
  gammas: ArmadaFleetRef[] = [],
): ArmadaBeta {
  return {
    ...armadaNode(fleet, ArmadaPosition.BETA),
    gammas: gammas.map(gamma => armadaNode(gamma, ArmadaPosition.GAMMA)),
  };
}

/**
 * Builds an Armada's shape.
 *
 * @param overrides - Fields to override.
 * @returns The shape: no Alpha and no Betas unless given.
 */
export function armadaStructure(
  overrides: Partial<ArmadaStructure> = {},
): ArmadaStructure {
  return {
    alpha: null,
    betas: [],
    maxBetas: 3,
    maxGammasPerBeta: 3,
    ...overrides,
  };
}

/**
 * Builds an Armada's shape as one reader is shown it.
 *
 * @param overrides - Fields to override.
 * @returns The view: an empty Armada the reader may not manage.
 */
export function armadaView(overrides: Partial<ArmadaView> = {}): ArmadaView {
  return {
    structure: armadaStructure(),
    mayManage: false,
    isMember: false,
    openRequests: 0,
    ...overrides,
  };
}

/**
 * Names an Armada, as a Fleet's pages do.
 *
 * @param overrides - Fields to override.
 * @returns The reference.
 */
export function armadaRef(overrides: Partial<ArmadaRef> = {}): ArmadaRef {
  return {
    id: 'armada-1',
    name: 'Sol Armada',
    slug: 'sol-armada',
    platformSegment: 'pc',
    allegiance: 'Federation',
    ...overrides,
  };
}

/**
 * Builds a request to join.
 *
 * @param overrides - Fields to override.
 * @returns An open request from the Ninth Fleet.
 */
export function armadaRequest(
  overrides: Partial<ArmadaRequest> = {},
): ArmadaRequest {
  return {
    id: 'request-1',
    status: ArmadaRequestStatus.PENDING,
    armada: armadaRef(),
    fleet: armadaFleet('Ninth Fleet'),
    requestedBy: 'FleetOwner',
    message: 'We would like to join.',
    createdAt: '2026-09-27T10:00:00.000Z',
    expiresAt: '2026-10-11T10:00:00.000Z',
    answeredAt: null,
    answeredBy: null,
    reason: null,
    ...overrides,
  };
}

/**
 * Builds the Armada as the server resolves it, for a reader.
 *
 * @param capabilities - What they hold there.
 * @param roles - The role labels they hold there.
 * @returns The resolved Armada.
 */
export function resolvedArmada(
  capabilities: string[] = [],
  roles: string[] = [],
): ResolvedStoArmada {
  return {
    armada: {
      id: 'armada-1',
      communityId: 'community-1',
      slug: 'sol-armada',
      exactGameName: 'Sol Armada',
    },
    communitySlug: 'united-federation-alliance',
    communityName: 'United Federation Alliance',
    platformSegment: 'pc',
    allegianceName: 'Federation',
    redirected: false,
    viewer: { capabilities, roles },
  } as unknown as ResolvedStoArmada;
}

/** The address an Armada section is opened at, and the Armada it names. */
export interface ArmadaRouteStubs {
  readonly params$: BehaviorSubject<ParamMap>;
  readonly query$: BehaviorSubject<ParamMap>;
  readonly scopes: { resolveArmada: jest.Mock };
  readonly providers: (Provider | EnvironmentProviders)[];
}

/**
 * The providers an Armada section needs to resolve its Armada.
 *
 * @param capabilities - What the reader holds there.
 * @param roles - The role labels they hold there.
 * @returns The stubs, and the providers built on them.
 */
export function armadaRoute(
  capabilities: string[] = [],
  roles: string[] = [],
): ArmadaRouteStubs {
  const params$ = new BehaviorSubject<ParamMap>(
    convertToParamMap({
      communitySlug: 'united-federation-alliance',
      platformSegment: 'pc',
      slug: 'sol-armada',
    }),
  );
  const query$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
  const scopes = {
    resolveArmada: jest.fn(() => of(resolvedArmada(capabilities, roles))),
  };

  return {
    params$,
    query$,
    scopes,
    providers: [
      provideRouter([]),
      { provide: FleetScopeService, useValue: scopes },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: params$, queryParamMap: query$ },
      },
    ],
  };
}
