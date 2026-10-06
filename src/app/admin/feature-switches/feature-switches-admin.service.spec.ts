import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FeatureSwitchState } from 'src/app/models/feature-switches.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FeatureSwitchesAdminService } from './feature-switches-admin.service';

const URL = API_URLS.FEATURE_SWITCHES_ADMIN;

const FLEET: FeatureSwitchState = {
  feature: 'FLEET_COMMUNITIES',
  label: 'Fleet Communities',
  isEnabled: false,
  changedAt: null,
  changedByUsername: null,
  subFlags: [],
};

describe('FeatureSwitchesAdminService (FC-045)', () => {
  let service: FeatureSwitchesAdminService;
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
      providers: [{ provide: AuthService, useValue: authService }],
    });

    service = TestBed.inject(FeatureSwitchesAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is the admin route for the feature switches', () => {
    expect(URL).toMatch(/\/admin\/feature-switches$/);
  });

  it('lists the switches with the access token', async () => {
    const answer = firstValueFrom(service.list());
    const request = httpMock.expectOne(URL);

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush([FLEET]);

    await expect(answer).resolves.toEqual([FLEET]);
  });

  it('switches one feature, with on or off and a reason', async () => {
    const answer = firstValueFrom(
      service.set('FLEET_COMMUNITIES', true, 'Accepted for release'),
    );
    const request = httpMock.expectOne(`${URL}/FLEET_COMMUNITIES`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      isEnabled: true,
      reason: 'Accepted for release',
    });
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush({ ...FLEET, isEnabled: true });

    await expect(answer).resolves.toEqual({ ...FLEET, isEnabled: true });
  });

  it('asks nothing when signed out', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(service.list())).rejects.toThrow(
      'No token found',
    );
    await expect(
      firstValueFrom(service.set('STORYTIME', false, 'Incident')),
    ).rejects.toThrow('No token found');
  });
});
