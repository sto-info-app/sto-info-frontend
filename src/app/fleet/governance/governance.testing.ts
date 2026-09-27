import { Provider } from '@angular/core';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';

import { BehaviorSubject, of } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetReportService } from 'src/app/fleet/fleet-reports/fleet-report.service';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { recruitmentFleet } from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetScopeRole,
  ScopeCapabilityEffect,
  ScopeRoles,
} from 'src/app/models/fleet-governance.models';
import {
  FleetScopeStatus,
  ResolvedFleetCommunity,
  ResolvedStoFleet,
} from 'src/app/models/fleet.models';
import { FleetGovernanceService } from './fleet-governance.service';

/** Who is reading a Manage page, and where. */
export interface GovernanceReader {
  /** The role labels they hold there. */
  readonly roles?: string[];
  /** What they may do there. */
  readonly capabilities?: string[];
  /** Whether they administer the site. */
  readonly isSiteAdmin?: boolean;
  /** Whether the page is a Fleet's rather than the Community's. */
  readonly onFleet?: boolean;
  /** Whether the scope has been closed. */
  readonly closed?: boolean;
}

/** The stubs a Manage page is drawn with. */
export interface GovernanceRouteStubs {
  readonly params$: BehaviorSubject<ParamMap>;
  readonly scopes: { resolveCommunity: jest.Mock; resolveFleet: jest.Mock };
  readonly auth: { isLoggedInAsAdmin: jest.Mock };
  readonly providers: Provider[];
}

/**
 * Builds the Community as the server resolves it.
 *
 * @param reader - Who is reading.
 * @returns The resolved Community.
 */
export function governanceCommunity(
  reader: GovernanceReader,
): ResolvedFleetCommunity {
  return {
    community: {
      id: 'community-1',
      slug: 'united-federation-alliance',
      name: 'United Federation Alliance',
      status: reader.closed ? FleetScopeStatus.CLOSED : FleetScopeStatus.ACTIVE,
    },
    redirectedFrom: null,
    viewer: {
      roles: reader.roles ?? [],
      capabilities: reader.capabilities ?? [],
    },
  } as unknown as ResolvedFleetCommunity;
}

/**
 * Builds the Fleet as the server resolves it.
 *
 * @param reader - Who is reading.
 * @returns The resolved Fleet.
 */
export function governanceFleet(reader: GovernanceReader): ResolvedStoFleet {
  const resolved = recruitmentFleet(reader.capabilities ?? [], {
    status: reader.closed ? FleetScopeStatus.CLOSED : FleetScopeStatus.ACTIVE,
  });

  return {
    ...resolved,
    viewer: { ...resolved.viewer, roles: reader.roles ?? [] },
  };
}

/**
 * Builds who governs a scope, as the Owner reads it.
 *
 * @param overrides - Fields to override.
 * @returns The roles.
 */
export function scopeRoles(overrides: Partial<ScopeRoles> = {}): ScopeRoles {
  return {
    owner: { userId: 'user-owner', username: 'FleetOwner' },
    mayManage: true,
    holders: [
      {
        assignmentId: 'assignment-1',
        userId: 'user-admin',
        username: 'FleetAdmin',
        role: FleetScopeRole.ADMIN,
        since: '2026-09-20T10:00:00.000Z',
      },
    ],
    candidates: [
      { userId: 'user-owner', username: 'FleetOwner' },
      { userId: 'user-admin', username: 'FleetAdmin' },
      { userId: 'user-member', username: 'FleetApplicant' },
      { userId: 'user-nameless', username: null },
    ],
    officerCapabilities: ['news.write'],
    personal: [
      {
        grantId: 'grant-1',
        userId: 'user-member',
        username: 'FleetApplicant',
        capability: 'events.manage',
        effect: ScopeCapabilityEffect.GRANT,
        since: '2026-09-21T10:00:00.000Z',
      },
    ],
    delegable: [
      {
        code: 'news.write',
        name: 'Write news',
        description: 'Publish news for the scope.',
      },
      {
        code: 'events.manage',
        name: 'Manage events',
        description: 'Schedule and change events.',
      },
    ],
    ...overrides,
  };
}

/**
 * The providers a Manage page needs to resolve its scope.
 *
 * @param reader - Who is reading, and where.
 * @param governance - The governance service's stand-in.
 * @returns The stubs, and the providers built on them.
 */
export function governanceRoute(
  reader: GovernanceReader,
  governance: object,
): GovernanceRouteStubs {
  const params$ = new BehaviorSubject<ParamMap>(
    convertToParamMap({
      communitySlug: 'united-federation-alliance',
      ...(reader.onFleet ? { platformSegment: 'pc', slug: 'ninth-fleet' } : {}),
    }),
  );
  const scopes = {
    resolveCommunity: jest.fn(() => of(governanceCommunity(reader))),
    resolveFleet: jest.fn(() => of(governanceFleet(reader))),
  };
  const auth = {
    isLoggedInAsAdmin: jest.fn(() => reader.isSiteAdmin ?? false),
  };

  return {
    params$,
    scopes,
    auth,
    providers: [
      provideRouter([]),
      { provide: FleetReportService, useValue: { visible: () => of([]) } },
      { provide: FleetScopeService, useValue: scopes },
      { provide: AuthService, useValue: auth },
      { provide: FleetGovernanceService, useValue: governance },
      { provide: ActivatedRoute, useValue: { paramMap: params$ } },
    ],
  };
}
