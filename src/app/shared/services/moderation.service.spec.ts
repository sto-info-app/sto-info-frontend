import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ModeratedUser,
  PaginatedModeratedUsers,
  PaginatedReports,
  ReportReason,
  ReportStatus,
  UserReport,
} from 'src/app/models/moderation.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { ModerationService } from './moderation.service';

const AUTH_HEADER = 'Bearer token-1';

const emptyReportPage: PaginatedReports = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  openCount: 0,
};

const emptyUserPage: PaginatedModeratedUsers = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
};

const moderatedUser = { id: 'member-1' } as ModeratedUser;

describe('ModerationService', () => {
  let service: ModerationService;
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
        ModerationService,
        { provide: AuthService, useValue: authService },
      ],
    });
    service = TestBed.inject(ModerationService);
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

  describe('reportMember', () => {
    it('should post the report with the access token', () => {
      service
        .reportMember({
          username: 'captain.picard',
          reason: ReportReason.HARASSMENT,
          details: 'Repeated abusive messages.',
        })
        .subscribe();

      const req = httpMock.expectOne(API_URLS.REPORTS);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      expect(req.request.body).toEqual({
        username: 'captain.picard',
        reason: ReportReason.HARASSMENT,
        details: 'Repeated abusive messages.',
      });
      req.flush(null);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(
          service.reportMember({ username: 'x', reason: ReportReason.SPAM }),
        ),
      ).rejects.toThrow('No token found');
    });
  });

  describe('getReports', () => {
    it('should request the queue with no params by default', () => {
      service
        .getReports()
        .subscribe(result => expect(result).toEqual(emptyReportPage));

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.MODERATION_ADMIN_REPORTS &&
          r.params.keys().length === 0,
      );
      expect(req.request.method).toBe('GET');
      req.flush(emptyReportPage);
    });

    it('should send every supplied query param', () => {
      service
        .getReports({
          status: ReportStatus.OPEN,
          reason: ReportReason.SPAM,
          search: 'picard',
          page: 2,
          pageSize: 10,
        })
        .subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.MODERATION_ADMIN_REPORTS &&
          r.params.get('status') === 'OPEN' &&
          r.params.get('reason') === 'SPAM' &&
          r.params.get('search') === 'picard' &&
          r.params.get('page') === '2' &&
          r.params.get('pageSize') === '10',
      );
      req.flush(emptyReportPage);
    });

    it('should omit falsy query params', () => {
      service.getReports({ search: '', page: 0, pageSize: 0 }).subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.MODERATION_ADMIN_REPORTS &&
          r.params.keys().length === 0,
      );
      req.flush(emptyReportPage);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(firstValueFrom(service.getReports())).rejects.toThrow(
        'No token found',
      );
    });
  });

  describe('getReport', () => {
    it('should request the single report', () => {
      service.getReport('report-1').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.MODERATION_ADMIN_REPORTS}/report-1`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'report-1' } as UserReport);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.getReport('report-1')),
      ).rejects.toThrow('No token found');
    });
  });

  describe('updateReport', () => {
    it('should patch the decision onto the report', () => {
      service
        .updateReport('report-1', {
          status: ReportStatus.DISMISSED,
          moderatorNotes: 'No evidence found.',
        })
        .subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.MODERATION_ADMIN_REPORTS}/report-1`,
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        status: ReportStatus.DISMISSED,
        moderatorNotes: 'No evidence found.',
      });
      req.flush({ id: 'report-1' } as UserReport);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(
          service.updateReport('report-1', { status: ReportStatus.ACTIONED }),
        ),
      ).rejects.toThrow('No token found');
    });
  });

  describe('getUsers', () => {
    it('should request the member list with no params by default', () => {
      service
        .getUsers()
        .subscribe(result => expect(result).toEqual(emptyUserPage));

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.MODERATION_ADMIN_USERS &&
          r.params.keys().length === 0,
      );
      expect(req.request.method).toBe('GET');
      req.flush(emptyUserPage);
    });

    it('should send every supplied query param', () => {
      service
        .getUsers({ search: 'picard', disabled: true, page: 2, pageSize: 10 })
        .subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.MODERATION_ADMIN_USERS &&
          r.params.get('search') === 'picard' &&
          r.params.get('disabled') === 'true' &&
          r.params.get('page') === '2' &&
          r.params.get('pageSize') === '10',
      );
      req.flush(emptyUserPage);
    });

    it('should send an active-only filter rather than dropping it', () => {
      service.getUsers({ disabled: false }).subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.MODERATION_ADMIN_USERS &&
          r.params.get('disabled') === 'false',
      );
      req.flush(emptyUserPage);
    });

    it('should omit falsy query params', () => {
      service.getUsers({ search: '', page: 0, pageSize: 0 }).subscribe();

      const req = httpMock.expectOne(
        r =>
          r.url === API_URLS.MODERATION_ADMIN_USERS &&
          r.params.keys().length === 0,
      );
      req.flush(emptyUserPage);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(firstValueFrom(service.getUsers())).rejects.toThrow(
        'No token found',
      );
    });
  });

  describe('disableUser', () => {
    it('should post an empty reason by default', () => {
      service.disableUser('member-1').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.MODERATION_ADMIN_USERS}/member-1/disable`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(moderatedUser);
    });

    it('should post the reason when one is given', () => {
      service.disableUser('member-1', { reason: 'Spamming' }).subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.MODERATION_ADMIN_USERS}/member-1/disable`,
      );
      expect(req.request.body).toEqual({ reason: 'Spamming' });
      req.flush(moderatedUser);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.disableUser('member-1')),
      ).rejects.toThrow('No token found');
    });
  });

  describe('enableUser', () => {
    it('should post to the enable endpoint', () => {
      service.enableUser('member-1').subscribe();

      const req = httpMock.expectOne(
        `${API_URLS.MODERATION_ADMIN_USERS}/member-1/enable`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(moderatedUser);
    });

    it('should fail without issuing a request when signed out', async () => {
      signOut();

      await expect(
        firstValueFrom(service.enableUser('member-1')),
      ).rejects.toThrow('No token found');
    });
  });
});
