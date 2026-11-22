import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetActivityService } from './fleet-activity.service';

const COMMUNITY = `${API_URLS.FLEET_COMMUNITIES}/community-1`;

describe('FleetActivityService', () => {
  let service: FleetActivityService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetActivityService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetActivityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it.each([
    [
      'a Community’s',
      { communityId: 'community-1', fleetId: null },
      `${COMMUNITY}/activity`,
    ],
    [
      'a Fleet’s',
      { communityId: 'community-1', fleetId: 'fleet-1' },
      `${COMMUNITY}/fleets/fleet-1/activity`,
    ],
    [
      'an Armada’s',
      { communityId: 'community-1', fleetId: null, armadaId: 'armada-1' },
      `${COMMUNITY}/armadas/armada-1/activity`,
    ],
  ])('reads %s activity', (_scope, target, url) => {
    service.scopeFeed(target).subscribe();

    const request = httpMock.expectOne(req => req.url === url);

    expect(request.request.params.has('before')).toBe(false);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush({ items: [], next: null });
  });

  it('carries on from a cursor, signed out too', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service
      .scopeFeed({ communityId: 'community-1', fleetId: null }, 'cursor-1')
      .subscribe();

    const request = httpMock.expectOne(
      req => req.url === `${COMMUNITY}/activity`,
    );

    expect(request.request.params.get('before')).toBe('cursor-1');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ items: [], next: null });
  });

  it('reads the signed-in person’s own feed', () => {
    service.mine('cursor-2').subscribe();

    const request = httpMock.expectOne(
      req => req.url === `${API_URLS.FLEET_ACTIVITY}/mine`,
    );

    expect(request.request.params.get('before')).toBe('cursor-2');
    request.flush({ items: [], next: null });
  });

  it('refuses the personal feed without a token', done => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.mine().subscribe({
      error: (error: Error) => {
        expect(error.message).toBe('No token found');
        done();
      },
    });
  });
});
