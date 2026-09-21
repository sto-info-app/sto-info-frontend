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
});
