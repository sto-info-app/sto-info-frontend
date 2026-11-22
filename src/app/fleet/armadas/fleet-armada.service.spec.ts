import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ArmadaPosition,
  ArmadaRequestStatus,
} from 'src/app/models/fleet-armada.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetArmadaService } from './fleet-armada.service';

describe('FleetArmadaService', () => {
  let service: FleetArmadaService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const community = `${API_URLS.FLEET_COMMUNITIES}/community-1`;
  const armada = `${community}/armadas/armada-1`;
  const fleet = `${community}/fleets/fleet-1/armada`;

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetArmadaService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetArmadaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('reads', () => {
    const reads: [string, () => Observable<unknown>, string][] = [
      [
        'a Community’s structure',
        () => service.communityStructure('community-1'),
        `${community}/structure`,
      ],
      [
        'an Armada’s shape',
        () => service.view('community-1', 'armada-1'),
        `${armada}/structure`,
      ],
      [
        'a Fleet’s Armada',
        () => service.fleetView('community-1', 'fleet-1'),
        fleet,
      ],
    ];

    it.each(reads)('reads %s with the token when signed in', (_, read, url) => {
      read().subscribe();

      const request = httpMock.expectOne(url);

      expect(request.request.method).toBe('GET');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush({});
    });

    it.each(reads)('reads %s signed out', (_, read, url) => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

      read().subscribe();

      const request = httpMock.expectOne(url);

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });

    it('reads a page of history, signed in or out', () => {
      service.history('community-1', 'armada-1', 2).subscribe();
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      service.history('community-1', 'armada-1', 3).subscribe();

      const [signedIn, signedOut] = httpMock.match(
        req => req.url === `${armada}/history`,
      );

      expect(signedIn.request.params.get('page')).toBe('2');
      expect(signedIn.request.headers.get('Authorization')).toBe(
        'Bearer token',
      );
      expect(signedOut.request.params.get('page')).toBe('3');
      expect(signedOut.request.headers.has('Authorization')).toBe(false);
      signedIn.flush({ items: [] });
      signedOut.flush({ items: [] });
    });
  });

  describe('requests', () => {
    it('lists them by status and page', () => {
      service
        .requests('community-1', 'armada-1', ArmadaRequestStatus.REJECTED, 2)
        .subscribe();

      const request = httpMock.expectOne(
        req => req.url === `${armada}/requests`,
      );

      expect(request.request.params.get('status')).toBe('REJECTED');
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush({ items: [] });
    });
  });

  describe('changes', () => {
    const changes: [string, () => Observable<unknown>, string, unknown][] = [
      [
        'approves a request',
        () =>
          service.approve('community-1', 'armada-1', 'request-1', {
            position: ArmadaPosition.BETA,
          }),
        `${armada}/requests/request-1/approve`,
        { position: 'BETA' },
      ],
      [
        'rejects a request',
        () => service.reject('community-1', 'armada-1', 'request-1', 'No room'),
        `${armada}/requests/request-1/reject`,
        { reason: 'No room' },
      ],
      [
        'moves a Fleet',
        () =>
          service.move('community-1', 'armada-1', 'fleet-1', {
            position: ArmadaPosition.ALPHA,
            reason: 'Leading',
          }),
        `${armada}/placements/fleet-1/move`,
        { position: 'ALPHA', reason: 'Leading' },
      ],
      [
        'takes a Fleet out',
        () =>
          service.remove('community-1', 'armada-1', 'fleet-1', {
            reason: 'Inactive',
          }),
        `${armada}/placements/fleet-1/remove`,
        { reason: 'Inactive' },
      ],
      [
        'asks to join with a message',
        () => service.request('community-1', 'fleet-1', 'armada-1', 'Hello'),
        `${fleet}/requests`,
        { armadaId: 'armada-1', message: 'Hello' },
      ],
      [
        'asks to join without one',
        () => service.request('community-1', 'fleet-1', 'armada-1', null),
        `${fleet}/requests`,
        { armadaId: 'armada-1' },
      ],
      [
        'withdraws a request',
        () => service.withdraw('community-1', 'fleet-1', 'request-1'),
        `${fleet}/requests/request-1/withdraw`,
        {},
      ],
      [
        'leaves',
        () => service.leave('community-1', 'fleet-1', 'Moving on'),
        `${fleet}/leave`,
        { reason: 'Moving on' },
      ],
    ];

    it.each(changes)('%s with the token', (_, change, url, body) => {
      change().subscribe();

      const request = httpMock.expectOne(url);

      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(body);
      expect(request.request.headers.get('Authorization')).toBe('Bearer token');
      request.flush({});
    });

    it.each(changes)('%s: refused signed out, sending nothing', (_, change) => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      const error = jest.fn();

      change().subscribe({ error });

      expect(error).toHaveBeenCalledWith(new Error('No token found'));
      httpMock.expectNone(() => true);
    });

    it('refuses the request list signed out', () => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
      const error = jest.fn();

      service
        .requests('community-1', 'armada-1', ArmadaRequestStatus.PENDING, 1)
        .subscribe({ error });

      expect(error).toHaveBeenCalled();
    });
  });
});
