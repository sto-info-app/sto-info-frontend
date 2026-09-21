import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FleetRegistrationService } from './fleet-registration.service';

describe('FleetRegistrationService', () => {
  let service: FleetRegistrationService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: 'Bearer token-1' }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FleetRegistrationService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(FleetRegistrationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts a Community to the directory', () => {
    service
      .registerCommunity({
        name: "Steve's Community",
        recruitmentState: FleetRecruitmentState.OPEN,
      })
      .subscribe();

    const request = httpMock.expectOne(API_URLS.FLEET_COMMUNITIES);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: "Steve's Community",
      recruitmentState: FleetRecruitmentState.OPEN,
    });

    request.flush({});
  });

  // Registering changes what everybody else sees, so unlike reading the
  // directory it needs an account.
  it('signs the registration with the caller’s token', () => {
    service.registerCommunity({ name: 'A Community' }).subscribe();

    const request = httpMock.expectOne(API_URLS.FLEET_COMMUNITIES);

    expect(request.request.headers.get('Authorization')).toBe('Bearer token-1');

    request.flush({});
  });

  // The server refuses it, and that refusal is the honest answer: quietly
  // sending it unsigned would turn a sign-in problem into a 401 nobody can
  // place.
  it('sends the registration even when there is no token to sign it with', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    service.registerCommunity({ name: 'A Community' }).subscribe();

    const request = httpMock.expectOne(API_URLS.FLEET_COMMUNITIES);

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({});
  });
  describe('registering into a Community', () => {
    const community = `${API_URLS.FLEET_COMMUNITIES}/community-1`;

    it('posts a Fleet to the Community that registers it', () => {
      service
        .registerFleet('community-1', {
          exactGameName: 'Starfleet Command ',
          platformId: 'platform-1',
        })
        .subscribe();

      const request = httpMock.expectOne(`${community}/fleets`);

      expect(request.request.method).toBe('POST');
      // The edge space survives the whole journey: it is part of the name.
      expect(request.request.body.exactGameName).toBe('Starfleet Command ');

      request.flush({});
    });

    it('posts an Armada to the Community that registers it', () => {
      service
        .registerArmada('community-1', {
          exactGameName: 'Ninth Fleet Armada',
          platformId: 'platform-1',
        })
        .subscribe();

      const request = httpMock.expectOne(`${community}/armadas`);

      expect(request.request.method).toBe('POST');

      request.flush({});
    });

    it('escapes a Community identifier on its way into the address', () => {
      service
        .registerFleet('a/b', {
          exactGameName: 'X',
          platformId: 'p',
        })
        .subscribe();

      httpMock
        .expectOne(`${API_URLS.FLEET_COMMUNITIES}/a%2Fb/fleets`)
        .flush({});
    });
  });

  // No Community to register into, so the address is its own.
  it('posts a standalone confirmation to the Fleet collection', () => {
    service
      .confirmStandaloneFleet({
        exactGameName: 'Starfleet Command ',
        platformId: 'platform-1',
        confirmUnregistered: true,
      })
      .subscribe();

    const request = httpMock.expectOne(`${API_URLS.FLEETS}/unregistered`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body.confirmUnregistered).toBe(true);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-1');

    request.flush({});
  });

  describe('asking what already answers to a name', () => {
    const community = `${API_URLS.FLEET_COMMUNITIES}/community-1`;

    // Matching folds case and nothing else. Trimming here would report a
    // duplicate that is not one, which is the failure that stops people
    // trusting the warning at all.
    it('sends a Fleet name exactly as it was typed', () => {
      service
        .findFleetDuplicates('community-1', 'platform-1', ' Starfleet ')
        .subscribe();

      const request = httpMock.expectOne(
        candidate => candidate.url === `${community}/fleets/duplicates`,
      );

      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('name')).toBe(' Starfleet ');
      expect(request.request.params.get('platformId')).toBe('platform-1');

      request.flush([]);
    });

    it('asks the Armada collection for an Armada name', () => {
      service
        .findArmadaDuplicates('community-1', 'platform-1', 'Ninth')
        .subscribe();

      const request = httpMock.expectOne(
        candidate => candidate.url === `${community}/armadas/duplicates`,
      );

      expect(request.request.params.get('name')).toBe('Ninth');

      request.flush([]);
    });

    it('signs the question, the collection being capability-guarded', () => {
      service
        .findFleetDuplicates('community-1', 'platform-1', 'Starfleet')
        .subscribe();

      const request = httpMock.expectOne(
        candidate => candidate.url === `${community}/fleets/duplicates`,
      );

      expect(request.request.headers.get('Authorization')).toBe(
        'Bearer token-1',
      );

      request.flush([]);
    });
  });
});
