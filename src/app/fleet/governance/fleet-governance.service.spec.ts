import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FleetScopeRole,
  ScopeCapabilityEffect,
} from 'src/app/models/fleet-governance.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import {
  FleetGovernanceService,
  GovernanceTarget,
} from './fleet-governance.service';

describe('FleetGovernanceService', () => {
  let service: FleetGovernanceService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const COMMUNITY: GovernanceTarget = {
    communityId: 'community-1',
    fleetId: null,
  };
  const FLEET: GovernanceTarget = {
    communityId: 'community-1',
    fleetId: 'fleet-1',
  };
  const communityUrl = `${API_URLS.FLEET_COMMUNITIES}/community-1/governance`;
  const fleetUrl = `${API_URLS.FLEET_COMMUNITIES}/community-1/fleets/fleet-1/governance`;
  const adminUrl = `${API_URLS.FLEET_COMMUNITIES_ADMIN}/community-1`;

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetGovernanceService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetGovernanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Sends a call and checks what went out.
   *
   * @param call - The call.
   * @param method - The method expected.
   * @param url - The address expected.
   * @param body - The body expected, if any.
   */
  function expectRequest(
    call: () => Observable<unknown>,
    method: string,
    url: string,
    body?: unknown,
  ): void {
    let answered: unknown;

    call().subscribe(value => (answered = value));

    const request = httpMock.expectOne(url);

    expect(request.request.method).toBe(method);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');

    if (body !== undefined) {
      expect(request.request.body).toEqual(body);
    }

    request.flush({ ok: true });
    expect(answered).toEqual({ ok: true });
  }

  it.each<[string, () => Observable<unknown>, string, string, unknown?]>([
    [
      'a Community’s roles',
      () => service.roles(COMMUNITY),
      'GET',
      `${communityUrl}/roles`,
      undefined,
    ],
    [
      'a Fleet’s roles',
      () => service.roles(FLEET),
      'GET',
      `${fleetUrl}/roles`,
      undefined,
    ],
    [
      'an Armada’s roles',
      () =>
        service.roles({
          communityId: 'community-1',
          fleetId: null,
          armadaId: 'armada-1',
        }),
      'GET',
      `${API_URLS.FLEET_COMMUNITIES}/community-1/armadas/armada-1/governance/roles`,
      undefined,
    ],
    [
      'an appointment',
      () =>
        service.assign(FLEET, {
          userId: 'user-1',
          role: FleetScopeRole.OFFICER,
        }),
      'POST',
      `${fleetUrl}/roles`,
      { userId: 'user-1', role: 'OFFICER' },
    ],
    [
      'a withdrawal',
      () => service.withdraw(COMMUNITY, 'assignment-1', 'Stepped down.'),
      'POST',
      `${communityUrl}/roles/assignment-1/withdraw`,
      { reason: 'Stepped down.' },
    ],
    [
      'the Officers’ capabilities with a reason',
      () => service.setOfficerCapabilities(COMMUNITY, [], 'Moved.'),
      'PUT',
      `${communityUrl}/officer-capabilities`,
      { capabilities: [], reason: 'Moved.' },
    ],
    [
      'the Officers’ capabilities without one',
      () => service.setOfficerCapabilities(COMMUNITY, ['news.write']),
      'PUT',
      `${communityUrl}/officer-capabilities`,
      { capabilities: ['news.write'] },
    ],
    [
      'one person’s capability',
      () =>
        service.setPersonal(COMMUNITY, {
          userId: 'user-1',
          capability: 'news.write',
          effect: ScopeCapabilityEffect.DENY,
          reason: 'Spam.',
        }),
      'PUT',
      `${communityUrl}/personal-capabilities`,
      {
        userId: 'user-1',
        capability: 'news.write',
        effect: 'DENY',
        reason: 'Spam.',
      },
    ],
    [
      'a clearing with a reason',
      () => service.clearPersonal(COMMUNITY, 'grant-1', 'Done.'),
      'POST',
      `${communityUrl}/personal-capabilities/grant-1/clear`,
      { reason: 'Done.' },
    ],
    [
      'a clearing without one',
      () => service.clearPersonal(COMMUNITY, 'grant-1'),
      'POST',
      `${communityUrl}/personal-capabilities/grant-1/clear`,
      {},
    ],
    [
      'the history',
      () => service.history(FLEET),
      'GET',
      `${fleetUrl}/history`,
      undefined,
    ],
    [
      'a closure',
      () => service.close(FLEET, 'Merged.'),
      'POST',
      `${fleetUrl}/close`,
      { reason: 'Merged.' },
    ],
    [
      'where ownership stands',
      () => service.ownership('community-1'),
      'GET',
      `${communityUrl}/ownership`,
      undefined,
    ],
    [
      'an offer',
      () => service.offerOwnership('community-1', 'user-1'),
      'POST',
      `${communityUrl}/ownership`,
      { toUserId: 'user-1' },
    ],
    [
      'an answer',
      () => service.answerOwnership('community-1', 'transfer-1', 'accept'),
      'POST',
      `${communityUrl}/ownership/transfer-1/accept`,
      {},
    ],
    [
      'a dispute view',
      () => service.disputeView('community-1'),
      'GET',
      `${adminUrl}/dispute`,
      undefined,
    ],
    [
      'a reassignment',
      () => service.reassignOwnership('community-1', 'user-1', 'Left.'),
      'POST',
      `${adminUrl}/owner`,
      { toUserId: 'user-1', reason: 'Left.' },
    ],
    [
      'a site administrator’s closure',
      () => service.closeAsSiteAdmin('community-1', 'Abandoned.'),
      'POST',
      `${adminUrl}/close`,
      { reason: 'Abandoned.' },
    ],
  ])('sends %s', (_what, call, method, url, body) => {
    expectRequest(call, method, url, body);
  });

  it('refuses without a token, and asks nothing', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    let failure: unknown;

    service.roles(COMMUNITY).subscribe({ error: error => (failure = error) });

    expect((failure as Error).message).toBe('No token found');
    httpMock.expectNone(`${communityUrl}/roles`);
  });
});
