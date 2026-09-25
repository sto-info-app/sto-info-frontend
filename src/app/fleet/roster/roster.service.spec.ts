import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  RosterChangeKind,
  RosterSort,
  RosterSortDirection,
} from 'src/app/models/fleet-roster.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { paramsOf, RosterService } from './roster.service';

describe('RosterService', () => {
  let service: RosterService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const rosterUrl = `${API_URLS.FLEET_COMMUNITIES}/community-1/fleets/fleet-1/roster`;

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RosterService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(RosterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('roster', () => {
    it('asks for the export, page, ordering and filters given, signed', () => {
      let answered: unknown;

      service
        .roster('community-1', 'fleet-1', {
          asOf: '2024-11-15T23:59:59.999Z',
          page: 2,
          sort: RosterSort.CONTRIBUTION,
          direction: RosterSortDirection.DESC,
          search: 'tova',
          rank: 'Officer',
        })
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(r => r.url === rosterUrl);
      const params = request.request.params;

      expect(request.request.method).toBe('GET');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      expect(params.get('asOf')).toBe('2024-11-15T23:59:59.999Z');
      expect(params.get('page')).toBe('2');
      expect(params.get('sort')).toBe('CONTRIBUTION');
      expect(params.get('direction')).toBe('DESC');
      expect(params.get('search')).toBe('tova');
      expect(params.get('rank')).toBe('Officer');
      request.flush({ revision: 17 });
      expect(answered).toEqual({ revision: 17 });
    });

    it('asks for the latest export by naming none', () => {
      service.roster('community-1', 'fleet-1', {}).subscribe();

      const request = httpMock.expectOne(r => r.url === rosterUrl);

      expect(request.request.params.keys()).toEqual([]);
      request.flush({});
    });

    it('fails without asking when nobody is signed in', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      let failure: Error | undefined;

      service
        .roster('community-1', 'fleet-1', {})
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(rosterUrl);
    });
  });

  describe('history', () => {
    it('asks for a page of the kinds given, comma-separated', () => {
      service
        .history('community-1', 'fleet-1', 3, [
          RosterChangeKind.JOINED,
          RosterChangeKind.LEFT,
        ])
        .subscribe();

      const request = httpMock.expectOne(r => r.url === `${rosterUrl}/history`);

      expect(request.request.params.get('page')).toBe('3');
      expect(request.request.params.get('kinds')).toBe('JOINED,LEFT');
      request.flush({});
    });

    it('asks for every kind by naming none', () => {
      service.history('community-1', 'fleet-1', 1, []).subscribe();

      const request = httpMock.expectOne(r => r.url === `${rosterUrl}/history`);

      expect(request.request.params.has('kinds')).toBe(false);
      request.flush({});
    });
  });

  it('reads one member’s timeline', () => {
    service.timeline('community-1', 'fleet-1', 'identity-1').subscribe();

    httpMock.expectOne(`${rosterUrl}/members/identity-1`).flush({});
  });

  describe('rank order', () => {
    it('reads it', () => {
      service.rankOrder('community-1', 'fleet-1').subscribe();

      const request = httpMock.expectOne(`${rosterUrl}/rank-order`);

      expect(request.request.method).toBe('GET');
      request.flush({ tiers: [] });
    });

    it('replaces it with the order as loaded and why', () => {
      const edit = {
        tiers: [['Officer'], ['Member']],
        expected: [],
        reason: 'Officers outrank members',
      };
      let answered: unknown;

      service
        .updateRankOrder('community-1', 'fleet-1', edit)
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(`${rosterUrl}/rank-order`);

      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual(edit);
      request.flush({ tiers: edit.tiers });
      expect(answered).toEqual({ tiers: edit.tiers });
    });

    it('fails without asking when nobody is signed in', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      let failure: Error | undefined;

      service
        .updateRankOrder('community-1', 'fleet-1', {
          tiers: [],
          expected: [],
          reason: 'x',
        })
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(`${rosterUrl}/rank-order`);
    });
  });

  describe('paramsOf', () => {
    it('leaves out what was not given, or given empty', () => {
      const params = paramsOf({ page: 1, search: '', rank: undefined });

      expect(params.keys()).toEqual(['page']);
      expect(params.get('page')).toBe('1');
    });
  });
});
