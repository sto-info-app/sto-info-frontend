import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { SecurityLogSource } from 'src/app/models/security-log.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { SecurityLogAdminService } from './security-log-admin.service';

describe('SecurityLogAdminService (FC-039)', () => {
  let service: SecurityLogAdminService;
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

    service = TestBed.inject(SecurityLogAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reads a page of every source', () => {
    service.list(null, 2).subscribe();

    const request = httpMock.expectOne(
      req => req.url === API_URLS.SECURITY_LOG_ADMIN,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.has('source')).toBe(false);
    request.flush({ items: [], total: 0, page: 2, pageSize: 50 });
  });

  it('reads one source only', () => {
    service.list(SecurityLogSource.HOLD, 1).subscribe();

    const request = httpMock.expectOne(
      req => req.url === API_URLS.SECURITY_LOG_ADMIN,
    );

    expect(request.request.params.get('source')).toBe('HOLD');
    request.flush({ items: [], total: 0, page: 1, pageSize: 50 });
  });

  it('asks nothing when signed out', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(service.list(null, 1))).rejects.toThrow(
      'No token found',
    );
  });
});
