import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  RosterIdentityCandidate,
  RosterIdentityCandidatePage,
  RosterIdentityCandidateState,
  RosterIdentityDecisionAction,
} from 'src/app/models/fleet-identity.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { RosterIdentityService } from './roster-identity.service';

describe('RosterIdentityService', () => {
  let service: RosterIdentityService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const candidatesUrl =
    `${API_URLS.FLEET_COMMUNITIES}/community-1/fleets/fleet-1` +
    '/roster-identities/candidates';

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RosterIdentityService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(RosterIdentityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('list', () => {
    const page: RosterIdentityCandidatePage = {
      items: [],
      total: 0,
      page: 2,
      pageSize: 20,
    };

    it('asks for a page of candidates in one state', () => {
      let answered: RosterIdentityCandidatePage | undefined;

      service
        .list('community-1', 'fleet-1', 2, RosterIdentityCandidateState.OPEN)
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(
        r => r.url === candidatesUrl && r.method === 'GET',
      );

      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.params.get('state')).toBe('OPEN');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush(page);
      expect(answered).toEqual(page);
    });

    it('asks for every state by naming none', () => {
      service.list('community-1', 'fleet-1', 1, null).subscribe();

      const request = httpMock.expectOne(r => r.url === candidatesUrl);

      expect(request.request.params.has('state')).toBe(false);
      request.flush(page);
    });

    it('fails without asking when nobody is signed in', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      let failure: Error | undefined;

      service
        .list('community-1', 'fleet-1', 1, null)
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(r => r.url === candidatesUrl);
    });
  });

  describe('decide', () => {
    const decisionsUrl = `${candidatesUrl}/candidate-1/decisions`;

    it('posts the decision with the revision it was read at', () => {
      let answered: RosterIdentityCandidate | undefined;
      const decision = {
        action: RosterIdentityDecisionAction.UNDO,
        revision: 1,
        reason: 'Two different people',
      };

      service
        .decide('community-1', 'fleet-1', 'candidate-1', decision)
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(decisionsUrl);

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(decision);
      request.flush({ id: 'candidate-1' });
      expect(answered).toEqual({ id: 'candidate-1' });
    });

    it('fails without asking when nobody is signed in', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      let failure: Error | undefined;

      service
        .decide('community-1', 'fleet-1', 'candidate-1', {
          action: RosterIdentityDecisionAction.CONFIRM,
          revision: 0,
        })
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(decisionsUrl);
    });
  });
});
