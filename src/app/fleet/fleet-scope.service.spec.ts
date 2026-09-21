import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetScopeService } from './fleet-scope.service';

describe('FleetScopeService', () => {
  let service: FleetScopeService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  const bySlug = `${API_URLS.FLEET_COMMUNITIES}/by-slug`;

  beforeEach(() => {
    authService = { getHttpOptionsWithAccessToken: jest.fn(() => null) };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetScopeService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetScopeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('resolves a Community from its segment', () => {
    service.resolveCommunity('united-federation-alliance').subscribe();

    const request = httpMock.expectOne(`${bySlug}/united-federation-alliance`);

    expect(request.request.method).toBe('GET');

    request.flush({ community: {}, redirectedFrom: null });
  });

  // One request for the whole address. Fetching the Community, then the
  // platform, then the Fleet would show three loading states for one page.
  it('resolves a whole Fleet address in one request', () => {
    service
      .resolveFleet('united-federation-alliance', 'pc', 'starfleet-command')
      .subscribe();

    const request = httpMock.expectOne(
      `${bySlug}/united-federation-alliance/fleets/pc/starfleet-command`,
    );

    expect(request.request.method).toBe('GET');

    request.flush({});
  });

  it('resolves a whole Armada address in one request', () => {
    service
      .resolveArmada('united-federation-alliance', 'xbox', 'ninth-fleet-armada')
      .subscribe();

    httpMock
      .expectOne(
        `${bySlug}/united-federation-alliance/armadas/xbox/ninth-fleet-armada`,
      )
      .flush({});
  });

  // A slug comes out of a URL somebody may have typed, and the segments are
  // put back into one by hand here.
  it('encodes every segment it is given', () => {
    service.resolveFleet('a b', 'p/c', 'x?y').subscribe();

    httpMock.expectOne(`${bySlug}/a%20b/fleets/p%2Fc/x%3Fy`).flush({});
  });

  // Unlike the directory listings, a single scope does depend on who is
  // asking: a Community that is not public is readable by its own people and
  // absent to everybody else.
  it('attaches the viewer’s token when they have one', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue({
      headers: new HttpHeaders({ Authorization: 'Bearer token-1' }),
    });

    service.resolveCommunity('united-federation-alliance').subscribe();

    const request = httpMock.expectOne(`${bySlug}/united-federation-alliance`);

    expect(request.request.headers.get('Authorization')).toBe('Bearer token-1');

    request.flush({});
  });

  it('asks anonymously when nobody is signed in', () => {
    service.resolveCommunity('united-federation-alliance').subscribe();

    const request = httpMock.expectOne(`${bySlug}/united-federation-alliance`);

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({});
  });
});
