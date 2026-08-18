import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { AccessControlService } from './access-control.service';

const AUTH_HEADER = 'Bearer token-1';

describe('AccessControlService', () => {
  let service: AccessControlService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue({
        headers: new HttpHeaders({ Authorization: AUTH_HEADER }),
      }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AccessControlService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(AccessControlService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('requests the caller permissions with the access token', async () => {
    const permissions = firstValueFrom(service.getMyPermissions());

    const request = httpMock.expectOne(API_URLS.ACCESS_CONTROL_ME);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
    request.flush({ permissions: [PERMISSIONS.STORYTIME_VIEW] });

    const result = await permissions;
    expect(result.has(PERMISSIONS.STORYTIME_VIEW)).toBe(true);
  });

  // Many templates ask about permissions; each must not trigger its own call.
  it('makes a single request however many callers ask', async () => {
    const first = firstValueFrom(service.getMyPermissions());
    const second = firstValueFrom(service.getMyPermissions());

    httpMock
      .expectOne(API_URLS.ACCESS_CONTROL_ME)
      .flush({ permissions: [PERMISSIONS.STORYTIME_VIEW] });

    await expect(first).resolves.toBeDefined();
    await expect(second).resolves.toBeDefined();
    httpMock.expectNone(API_URLS.ACCESS_CONTROL_ME);
  });

  it('reloads after a refresh', async () => {
    const first = firstValueFrom(service.getMyPermissions());
    httpMock
      .expectOne(API_URLS.ACCESS_CONTROL_ME)
      .flush({ permissions: [PERMISSIONS.STORYTIME_VIEW] });
    await first;

    service.refresh();

    const second = firstValueFrom(service.getMyPermissions());
    httpMock
      .expectOne(API_URLS.ACCESS_CONTROL_ME)
      .flush({ permissions: [PERMISSIONS.STORYTIME_MODERATE] });

    const result = await second;
    expect(result.has(PERMISSIONS.STORYTIME_MODERATE)).toBe(true);
  });

  // A page that cannot determine permissions should show what everyone can
  // see, not break.
  it('yields no permissions for an anonymous caller without calling the API', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    const result = await firstValueFrom(service.getMyPermissions());

    expect(result.size).toBe(0);
    httpMock.expectNone(API_URLS.ACCESS_CONTROL_ME);
  });

  it('preserves an error when the permission request fails', async () => {
    const permissions = firstValueFrom(service.getMyPermissions());

    httpMock
      .expectOne(API_URLS.ACCESS_CONTROL_ME)
      .flush('failed', { status: 500, statusText: 'Server Error' });

    await expect(permissions).rejects.toMatchObject({ status: 500 });
  });

  describe('hasPermission', () => {
    it('is true when the permission is held', async () => {
      const held = firstValueFrom(
        service.hasPermission(PERMISSIONS.STORYTIME_VIEW),
      );

      httpMock
        .expectOne(API_URLS.ACCESS_CONTROL_ME)
        .flush({ permissions: [PERMISSIONS.STORYTIME_VIEW] });

      await expect(held).resolves.toBe(true);
    });

    it('is false when the permission is not held', async () => {
      const held = firstValueFrom(
        service.hasPermission(PERMISSIONS.STORYTIME_MODERATE),
      );

      httpMock
        .expectOne(API_URLS.ACCESS_CONTROL_ME)
        .flush({ permissions: [PERMISSIONS.STORYTIME_VIEW] });

      await expect(held).resolves.toBe(false);
    });
  });
});
