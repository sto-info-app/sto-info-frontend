import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetHoldingsService } from './fleet-holdings.service';

describe('FleetHoldingsService', () => {
  let service: FleetHoldingsService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const url = `${API_URLS.FLEET_COMMUNITIES}/community-1/fleets/fleet-1/holdings`;

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetHoldingsService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetHoldingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('holdings', () => {
    it('reads them with the token when signed in', () => {
      service.holdings('community-1', 'fleet-1').subscribe();

      const request = httpMock.expectOne(url);

      expect(request.request.method).toBe('GET');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush({ catalogueVersion: 1, mayRecord: false, holdings: [] });
    });

    it('reads them signed out', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.holdings('community-1', 'fleet-1').subscribe();

      const request = httpMock.expectOne(url);

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({ catalogueVersion: 1, mayRecord: false, holdings: [] });
    });
  });

  describe('history', () => {
    it('reads a page with the token when signed in', () => {
      service.history('community-1', 'fleet-1', 3).subscribe();

      const request = httpMock.expectOne(
        req => req.url === `${url}/history` && req.params.get('page') === '3',
      );

      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush({ items: [] });
    });

    it('reads a page signed out', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      service.history('community-1', 'fleet-1', 1).subscribe();

      const request = httpMock.expectOne(req => req.url === `${url}/history`);

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({ items: [] });
    });
  });

  describe('record', () => {
    it('puts the tiers of one holding', () => {
      const body = { tiers: [{ track: 'STARBASE', tier: 2 }], reason: 'Up' };

      service.record('community-1', 'fleet-1', 'STARBASE', body).subscribe();

      const request = httpMock.expectOne(`${url}/STARBASE`);

      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual(body);
      request.flush({ catalogueVersion: 1, mayRecord: true, holdings: [] });
    });

    it('fails without a token, asking nothing of the server', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      const error = jest.fn();

      service
        .record('community-1', 'fleet-1', 'STARBASE', { tiers: [] })
        .subscribe({ error });

      expect(error).toHaveBeenCalledWith(new Error('No token found'));
    });
  });
});
