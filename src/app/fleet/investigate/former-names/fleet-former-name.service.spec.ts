import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  FleetFormerName,
  FleetFormerNameList,
} from 'src/app/models/fleet-former-name.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetFormerNameService } from './fleet-former-name.service';

describe('FleetFormerNameService', () => {
  let service: FleetFormerNameService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const formerNamesUrl =
    `${API_URLS.FLEET_COMMUNITIES}/community-1/fleets/fleet-1` +
    '/former-names';

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetFormerNameService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetFormerNameService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('list', () => {
    it('asks for the Fleet’s former names', () => {
      const list: FleetFormerNameList = {
        items: [],
        removed: [],
        mayChange: true,
      };
      let answered: FleetFormerNameList | undefined;

      service
        .list('community-1', 'fleet-1')
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(formerNamesUrl);

      expect(request.request.method).toBe('GET');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush(list);
      expect(answered).toEqual(list);
    });

    it('fails without asking when nobody is signed in', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      let failure: Error | undefined;

      service
        .list('community-1', 'fleet-1')
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(formerNamesUrl);
    });
  });

  describe('record', () => {
    const name = {
      exactName: ' Ninth Fleet ',
      validFrom: '2024-01-01T00:00:00.000Z',
      validTo: '2024-06-01T00:00:00.000Z',
      reason: 'Renamed in June',
    };

    it('posts the name exactly as given', () => {
      let answered: FleetFormerName | undefined;

      service
        .record('community-1', 'fleet-1', name)
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(formerNamesUrl);

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(name);
      request.flush({ id: 'alias-1' });
      expect(answered).toEqual({ id: 'alias-1' });
    });

    it('fails without asking when nobody is signed in', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      let failure: Error | undefined;

      service
        .record('community-1', 'fleet-1', name)
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(formerNamesUrl);
    });
  });

  describe('remove', () => {
    const removalUrl = `${formerNamesUrl}/alias-1/removal`;

    it('posts the removal with its reason', () => {
      let answered: FleetFormerName | undefined;

      service
        .remove('community-1', 'fleet-1', 'alias-1', 'Recorded in error')
        .subscribe(value => (answered = value));

      const request = httpMock.expectOne(removalUrl);

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ reason: 'Recorded in error' });
      request.flush({ id: 'alias-1' });
      expect(answered).toEqual({ id: 'alias-1' });
    });

    it('fails without asking when nobody is signed in', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      let failure: Error | undefined;

      service
        .remove('community-1', 'fleet-1', 'alias-1', 'Recorded in error')
        .subscribe({ error: (error: Error) => (failure = error) });

      expect(failure?.message).toBe('No token found');
      httpMock.expectNone(removalUrl);
    });
  });
});
