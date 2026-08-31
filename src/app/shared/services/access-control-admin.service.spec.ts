import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ASSIGNABLE_ROLES,
  AdminPermission,
  PermissionEffect,
  UserAccessSummary,
} from 'src/app/models/access-control.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { AccessControlAdminService } from './access-control-admin.service';

const AUTH_HEADER = 'Bearer token-1';
const MEMBER_ID = 'member-1';

const permission: AdminPermission = {
  id: 'permission-1',
  code: 'storytime.moderate',
  name: 'Moderate Storytime',
  description: 'Review reports and remove content.',
  module: 'STORYTIME',
};

const summary: UserAccessSummary = {
  userId: MEMBER_ID,
  role: ASSIGNABLE_ROLES.USER,
  effectivePermissions: ['storytime.moderate'],
  overrides: [],
};

describe('AccessControlAdminService', () => {
  let service: AccessControlAdminService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders({ Authorization: AUTH_HEADER }),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AccessControlAdminService,
        { provide: AuthService, useValue: authService },
      ],
    });
    service = TestBed.inject(AccessControlAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /**
   * Puts the viewer in a signed-out state for the next call.
   */
  function signOut(): void {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listPermissions', () => {
    it('should request the catalogue with the access token', () => {
      let received: AdminPermission[] | undefined;
      service.listPermissions().subscribe(result => (received = result));

      const req = httpMock.expectOne(API_URLS.ACCESS_CONTROL_ADMIN_PERMISSIONS);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      req.flush([permission]);

      expect(received).toEqual([permission]);
    });

    it('should fail without a token rather than call the API', done => {
      signOut();

      service.listPermissions().subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('No token found');
          done();
        },
      });
    });
  });

  describe('getUserAccessSummary', () => {
    it('should request the summary for the member', () => {
      let received: UserAccessSummary | undefined;
      service
        .getUserAccessSummary(MEMBER_ID)
        .subscribe(result => (received = result));

      const req = httpMock.expectOne(
        `${API_URLS.ACCESS_CONTROL_ADMIN_USERS}/${MEMBER_ID}`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(summary);

      expect(received).toEqual(summary);
    });

    it('should fail without a token rather than call the API', done => {
      signOut();

      service.getUserAccessSummary(MEMBER_ID).subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('No token found');
          done();
        },
      });
    });
  });

  describe('setPermissionOverride', () => {
    it('should post the override and return the updated summary', () => {
      let received: UserAccessSummary | undefined;
      service
        .setPermissionOverride(MEMBER_ID, {
          permissionCode: 'storytime.moderate',
          effect: PermissionEffect.GRANT,
          reason: 'Volunteer moderator.',
          expiresAt: '2026-12-01T00:00:00.000Z',
        })
        .subscribe(result => (received = result));

      const req = httpMock.expectOne(
        `${API_URLS.ACCESS_CONTROL_ADMIN_USERS}/${MEMBER_ID}/permission-overrides`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      expect(req.request.body).toEqual({
        permissionCode: 'storytime.moderate',
        effect: PermissionEffect.GRANT,
        reason: 'Volunteer moderator.',
        expiresAt: '2026-12-01T00:00:00.000Z',
      });
      req.flush(summary);

      expect(received).toEqual(summary);
    });

    it('should fail without a token rather than call the API', done => {
      signOut();

      service
        .setPermissionOverride(MEMBER_ID, {
          permissionCode: 'storytime.moderate',
          effect: PermissionEffect.DENY,
          reason: 'Abuse of the queue.',
        })
        .subscribe({
          error: (error: Error) => {
            expect(error.message).toBe('No token found');
            done();
          },
        });
    });
  });

  describe('setUserRole', () => {
    it('should put the role and return the updated summary', () => {
      let received: UserAccessSummary | undefined;
      service
        .setUserRole(MEMBER_ID, { role: ASSIGNABLE_ROLES.STORYTIME_CURATOR })
        .subscribe(result => (received = result));

      const req = httpMock.expectOne(
        `${API_URLS.ACCESS_CONTROL_ADMIN_USERS}/${MEMBER_ID}/role`,
      );
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      expect(req.request.body).toEqual({
        role: ASSIGNABLE_ROLES.STORYTIME_CURATOR,
      });
      req.flush(summary);

      expect(received).toEqual(summary);
    });

    it('should fail without a token rather than call the API', done => {
      signOut();

      service
        .setUserRole(MEMBER_ID, { role: ASSIGNABLE_ROLES.USER })
        .subscribe({
          error: (error: Error) => {
            expect(error.message).toBe('No token found');
            done();
          },
        });
    });
  });

  describe('removePermissionOverride', () => {
    it('should delete the override for the permission code', () => {
      let received: UserAccessSummary | undefined;
      service
        .removePermissionOverride(MEMBER_ID, 'storytime.moderate')
        .subscribe(result => (received = result));

      const req = httpMock.expectOne(
        `${API_URLS.ACCESS_CONTROL_ADMIN_USERS}/${MEMBER_ID}/permission-overrides/storytime.moderate`,
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(summary);

      expect(received).toEqual(summary);
    });

    it('should escape a permission code so it stays one path segment', () => {
      service
        .removePermissionOverride(MEMBER_ID, 'storytime/moderate')
        .subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.ACCESS_CONTROL_ADMIN_USERS}/${MEMBER_ID}/permission-overrides/storytime%2Fmoderate`,
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(summary);
    });

    it('should fail without a token rather than call the API', done => {
      signOut();

      service
        .removePermissionOverride(MEMBER_ID, 'storytime.moderate')
        .subscribe({
          error: (error: Error) => {
            expect(error.message).toBe('No token found');
            done();
          },
        });
    });
  });
});
