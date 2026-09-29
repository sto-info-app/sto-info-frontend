import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { RescanAdminService } from './rescan-admin.service';

const URL = API_URLS.RESCAN_CAMPAIGNS_ADMIN;

describe('RescanAdminService (FC-041)', () => {
  let service: RescanAdminService;
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

    service = TestBed.inject(RescanAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Expects one request, with the token.
   *
   * @param method - Its method.
   * @param url - Its URL.
   * @returns It.
   */
  const expectOne = (method: string, url: string) => {
    const request = httpMock.expectOne(
      req => req.method === method && req.url === url,
    );

    expect(request.request.headers.get('Authorization')).toBe('Bearer token');

    return request;
  };

  it('reads the campaigns, starts one, and pauses, resumes and cancels it', () => {
    service.overview().subscribe();
    expectOne('GET', URL).flush({});

    service
      .start({ kinds: ['FLEET_IMAGE'], priority: 'HIGH' }, 'New definitions')
      .subscribe();
    const start = expectOne('POST', URL);

    expect(start.request.body).toEqual({
      selection: { kinds: ['FLEET_IMAGE'], priority: 'HIGH' },
      reason: 'New definitions',
    });
    start.flush({});

    for (const action of ['pause', 'resume', 'cancel'] as const) {
      service.act('campaign-1', action, 'Checking').subscribe();
      const request = expectOne('POST', `${URL}/campaign-1/${action}`);

      expect(request.request.body).toEqual({ reason: 'Checking' });
      request.flush({});
    }
  });

  it('asks nothing when signed out', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(service.overview())).rejects.toThrow(
      'No token found',
    );
  });
});
