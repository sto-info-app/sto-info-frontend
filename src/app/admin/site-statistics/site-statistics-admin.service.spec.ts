import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { SiteStatisticsAdminService } from './site-statistics-admin.service';

describe('SiteStatisticsAdminService (FC-053)', () => {
  let service: SiteStatisticsAdminService;
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

    service = TestBed.inject(SiteStatisticsAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reads the statistics with the access token', () => {
    service.read().subscribe();

    const request = httpMock.expectOne(API_URLS.SITE_STATISTICS_ADMIN);

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    request.flush({ generatedAt: '2026-10-22T15:30:00.000Z' });
  });

  it('fails without a token, sending nothing', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(service.read())).rejects.toThrow(
      'No token found',
    );
    httpMock.expectNone(API_URLS.SITE_STATISTICS_ADMIN);
  });
});
