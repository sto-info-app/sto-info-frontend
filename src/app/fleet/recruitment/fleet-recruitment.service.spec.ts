import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FleetApplicationStatus,
  UpdateRecruitmentSettingsRequest,
} from 'src/app/models/fleet-recruitment.models';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetRecruitmentService } from './fleet-recruitment.service';

describe('FleetRecruitmentService', () => {
  let service: FleetRecruitmentService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const fleetUrl = `${API_URLS.FLEET_COMMUNITIES}/community-1/fleets/fleet-1/recruitment`;
  const mineUrl = API_URLS.FLEET_RECRUITMENT;

  const settings: UpdateRecruitmentSettingsRequest = {
    expectedVersion: 2,
    recruitmentState: FleetRecruitmentState.APPLICATION,
    requirementsText: null,
    minimumLevel: 50,
    factionIds: [],
    questions: [],
  };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetRecruitmentService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetRecruitmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('view', () => {
    it('asks signed in where there is a token', () => {
      let answered: unknown;

      service
        .view('community-1', 'fleet-1')
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(fleetUrl);

      expect(request.request.method).toBe('GET');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush({ viewer: null });
      expect(answered).toEqual({ viewer: null });
    });

    it('still asks signed out, as a Fleet’s page is read', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.view('community-1', 'fleet-1').subscribe();

      const request = httpMock.expectOne(fleetUrl);

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });
  });

  /** One signed-in call, what it should send, and where. */
  interface SignedCall {
    readonly name: string;
    readonly call: () => Observable<unknown>;
    readonly method: 'GET' | 'POST' | 'PUT';
    readonly url: string;
    readonly body?: unknown;
  }

  const calls = (): SignedCall[] => [
    {
      name: 'saveSettings',
      call: () => service.saveSettings('community-1', 'fleet-1', settings),
      method: 'PUT',
      url: `${fleetUrl}/settings`,
      body: settings,
    },
    {
      name: 'join',
      call: () => service.join('community-1', 'fleet-1', 'character-1'),
      method: 'POST',
      url: `${fleetUrl}/join`,
      body: { characterId: 'character-1' },
    },
    {
      name: 'leave',
      call: () => service.leave('community-1', 'fleet-1'),
      method: 'POST',
      url: `${fleetUrl}/leave`,
      body: {},
    },
    {
      name: 'apply',
      call: () =>
        service.apply('community-1', 'fleet-1', {
          characterId: 'character-1',
          settingsVersion: 2,
          answers: [{ questionId: 'q-1', value: true }],
        }),
      method: 'POST',
      url: `${fleetUrl}/applications`,
      body: {
        characterId: 'character-1',
        settingsVersion: 2,
        answers: [{ questionId: 'q-1', value: true }],
      },
    },
    {
      name: 'application',
      call: () => service.application('community-1', 'fleet-1', 'app-1'),
      method: 'GET',
      url: `${fleetUrl}/applications/app-1`,
    },
    {
      name: 'decide',
      call: () =>
        service.decide('community-1', 'fleet-1', 'app-1', {
          decision: 'REJECT',
          note: 'Not yet level 50.',
          revision: 3,
        }),
      method: 'POST',
      url: `${fleetUrl}/applications/app-1/decision`,
      body: { decision: 'REJECT', note: 'Not yet level 50.', revision: 3 },
    },
    {
      name: 'invitations',
      call: () => service.invitations('community-1', 'fleet-1'),
      method: 'GET',
      url: `${fleetUrl}/invitations`,
    },
    {
      name: 'invite',
      call: () => service.invite('community-1', 'fleet-1', 'Tova'),
      method: 'POST',
      url: `${fleetUrl}/invitations`,
      body: { username: 'Tova' },
    },
    {
      name: 'withdrawInvitation',
      call: () =>
        service.withdrawInvitation('community-1', 'fleet-1', 'invite-1'),
      method: 'POST',
      url: `${fleetUrl}/invitations/invite-1/withdraw`,
      body: {},
    },
    {
      name: 'members',
      call: () => service.members('community-1', 'fleet-1'),
      method: 'GET',
      url: `${fleetUrl}/members`,
    },
    {
      name: 'removeMember',
      call: () =>
        service.removeMember(
          'community-1',
          'fleet-1',
          'membership-1',
          'Left the game.',
        ),
      method: 'POST',
      url: `${fleetUrl}/members/membership-1/remove`,
      body: { reason: 'Left the game.' },
    },
    {
      name: 'changeMember',
      call: () =>
        service.changeMember(
          'community-1',
          'fleet-1',
          'membership-1',
          'suspend',
          'Spam.',
        ),
      method: 'POST',
      url: `${fleetUrl}/members/membership-1/suspend`,
      body: { reason: 'Spam.' },
    },
    {
      name: 'myApplications',
      call: () => service.myApplications(),
      method: 'GET',
      url: `${mineUrl}/applications`,
    },
    {
      name: 'withdrawApplication',
      call: () => service.withdrawApplication('app-1'),
      method: 'POST',
      url: `${mineUrl}/applications/app-1/withdraw`,
      body: {},
    },
    {
      name: 'myInvitations',
      call: () => service.myInvitations(),
      method: 'GET',
      url: `${mineUrl}/invitations`,
    },
    {
      name: 'acceptInvitation',
      call: () => service.acceptInvitation('invite-1', 'character-1'),
      method: 'POST',
      url: `${mineUrl}/invitations/invite-1/accept`,
      body: { characterId: 'character-1' },
    },
    {
      name: 'declineInvitation',
      call: () => service.declineInvitation('invite-1'),
      method: 'POST',
      url: `${mineUrl}/invitations/invite-1/decline`,
      body: {},
    },
  ];

  it.each(calls().map(entry => [entry.name]))(
    '%s sends the request signed, and hands back the answer',
    name => {
      const entry = calls().find(candidate => candidate.name === name)!;
      let answered: unknown;

      entry.call().subscribe(value => (answered = value));

      const request = httpMock.expectOne(entry.url);

      expect(request.request.method).toBe(entry.method);
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');

      if (entry.body !== undefined) {
        expect(request.request.body).toEqual(entry.body);
      }

      request.flush({ ok: true });
      expect(answered).toEqual({ ok: true });
    },
  );

  it.each(calls().map(entry => [entry.name]))(
    '%s fails without asking when nobody is signed in',
    name => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      const entry = calls().find(candidate => candidate.name === name)!;
      let failure: Error | undefined;

      entry.call().subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(entry.url);
    },
  );

  describe('applications', () => {
    it('asks for the status and page given', () => {
      service
        .applications('community-1', 'fleet-1', {
          status: FleetApplicationStatus.PENDING,
          page: 2,
          pageSize: undefined,
        })
        .subscribe();

      const request = httpMock.expectOne(
        r => r.url === `${fleetUrl}/applications`,
      );

      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      expect(request.request.params.get('status')).toBe('PENDING');
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.params.has('pageSize')).toBe(false);
      request.flush({});
    });

    it('fails without asking when nobody is signed in', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      let failure: Error | undefined;

      service
        .applications('community-1', 'fleet-1', {})
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(r => r.url === `${fleetUrl}/applications`);
    });
  });
});
