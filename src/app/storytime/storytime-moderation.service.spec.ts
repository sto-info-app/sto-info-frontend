import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  AppealStatus,
  StorytimeReportReason,
  StorytimeReportStatus,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { StorytimeModerationService } from './storytime-moderation.service';

const AUTH_HEADER = 'Bearer token-1';
const STORY_ID = 'story-1';
const REPORT_ID = 'report-1';
const APPEAL_ID = 'appeal-1';

describe('StorytimeModerationService', () => {
  let service: StorytimeModerationService;
  let httpMock: HttpTestingController;
  let authService: { getHttpOptionsWithAccessToken: jest.Mock };

  /** A report request. */
  const reportRequest = {
    targetType: StorytimeTargetType.STORY,
    targetId: STORY_ID,
    reasonCode: StorytimeReportReason.HARASSMENT,
  };

  /** A removal request. */
  const moderateRequest = {
    targetType: StorytimeTargetType.STORY,
    targetId: STORY_ID,
    message: 'This breaches the harassment policy.',
  };

  beforeEach(() => {
    authService = {
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue({
        headers: new HttpHeaders({ Authorization: AUTH_HEADER }),
      }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StorytimeModerationService,
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(StorytimeModerationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('what a member may do', () => {
    it('reports a piece of content', async () => {
      const receipt = firstValueFrom(service.report(reportRequest));

      const request = httpMock.expectOne(API_URLS.STORYTIME_REPORTS);
      expect(request.request.headers.get('Authorization')).toBe(AUTH_HEADER);
      expect(request.request.body.reasonCode).toBe(
        StorytimeReportReason.HARASSMENT,
      );
      request.flush({ id: REPORT_ID });

      await expect(receipt).resolves.toEqual({ id: REPORT_ID });
    });

    it('appeals against a removal', async () => {
      const appeal = firstValueFrom(
        service.appeal({
          targetType: StorytimeTargetType.STORY,
          targetId: STORY_ID,
          body: 'The passage quoted is my own writing.',
        }),
      );

      httpMock.expectOne(API_URLS.STORYTIME_APPEALS).flush({ id: APPEAL_ID });

      await expect(appeal).resolves.toBeDefined();
    });

    it('lists the caller’s own appeals', async () => {
      const appeals = firstValueFrom(service.getMyAppeals());

      httpMock.expectOne(API_URLS.STORYTIME_APPEALS).flush([]);

      await expect(appeals).resolves.toEqual([]);
    });

    it('withdraws an appeal', async () => {
      const withdrawn = firstValueFrom(service.withdrawAppeal(APPEAL_ID));

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_APPEALS}/${APPEAL_ID}/withdraw`,
      );
      expect(request.request.method).toBe('POST');
      request.flush({ id: APPEAL_ID });

      await expect(withdrawn).resolves.toBeDefined();
    });
  });

  describe('the moderation queue', () => {
    it('lists the reports', async () => {
      const reports = firstValueFrom(service.getReports());

      httpMock
        .expectOne(`${API_URLS.STORYTIME_ADMIN_MODERATION}/reports`)
        .flush([]);

      await expect(reports).resolves.toEqual([]);
    });

    it('filters the reports by state', async () => {
      const reports = firstValueFrom(
        service.getReports(StorytimeReportStatus.OPEN),
      );

      const request = httpMock.expectOne(
        r =>
          r.url === `${API_URLS.STORYTIME_ADMIN_MODERATION}/reports` &&
          r.params.get('status') === StorytimeReportStatus.OPEN,
      );
      request.flush([]);

      await expect(reports).resolves.toEqual([]);
    });

    it('reads one report', async () => {
      const report = firstValueFrom(service.getReport(REPORT_ID));

      httpMock
        .expectOne(
          `${API_URLS.STORYTIME_ADMIN_MODERATION}/reports/${REPORT_ID}`,
        )
        .flush({ id: REPORT_ID });

      await expect(report).resolves.toBeDefined();
    });

    it('moves a report along', async () => {
      const resolved = firstValueFrom(
        service.resolveReport(REPORT_ID, {
          status: StorytimeReportStatus.DISMISSED,
        }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_ADMIN_MODERATION}/reports/${REPORT_ID}`,
      );
      expect(request.request.method).toBe('PATCH');
      request.flush({ id: REPORT_ID });

      await expect(resolved).resolves.toBeDefined();
    });

    it('lists the reports about one piece of content', async () => {
      const reports = firstValueFrom(
        service.getReportsForTarget(StorytimeTargetType.STORY, STORY_ID),
      );

      httpMock
        .expectOne(
          `${API_URLS.STORYTIME_ADMIN_MODERATION}/content/story/${STORY_ID}/reports`,
        )
        .flush([]);

      await expect(reports).resolves.toEqual([]);
    });

    it('reads a piece of content’s history', async () => {
      const history = firstValueFrom(
        service.getHistory(StorytimeTargetType.STORY, STORY_ID),
      );

      httpMock
        .expectOne(
          `${API_URLS.STORYTIME_ADMIN_MODERATION}/content/story/${STORY_ID}/history`,
        )
        .flush([]);

      await expect(history).resolves.toEqual([]);
    });

    it.each([
      ['remove', () => service.removeContent(moderateRequest)],
      ['restore', () => service.restoreContent(moderateRequest)],
    ])('%ss content', async (action, act) => {
      const result = firstValueFrom(act());

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_ADMIN_MODERATION}/moderation/${action}`,
      );
      expect(request.request.method).toBe('POST');
      expect(request.request.body.message).toContain('harassment policy');
      request.flush({ id: 'action-1' });

      await expect(result).resolves.toBeDefined();
    });

    it('lists the appeals', async () => {
      const appeals = firstValueFrom(service.getAppeals());

      httpMock
        .expectOne(`${API_URLS.STORYTIME_ADMIN_MODERATION}/appeals`)
        .flush([]);

      await expect(appeals).resolves.toEqual([]);
    });

    it('filters the appeals by state', async () => {
      const appeals = firstValueFrom(
        service.getAppeals(AppealStatus.SUBMITTED),
      );

      httpMock
        .expectOne(
          r =>
            r.url === `${API_URLS.STORYTIME_ADMIN_MODERATION}/appeals` &&
            r.params.get('status') === AppealStatus.SUBMITTED,
        )
        .flush([]);

      await expect(appeals).resolves.toEqual([]);
    });

    it('decides an appeal', async () => {
      const decided = firstValueFrom(
        service.decideAppeal(APPEAL_ID, { uphold: true }),
      );

      const request = httpMock.expectOne(
        `${API_URLS.STORYTIME_ADMIN_MODERATION}/appeals/${APPEAL_ID}/decide`,
      );
      expect(request.request.body.uphold).toBe(true);
      request.flush({ id: APPEAL_ID });

      await expect(decided).resolves.toBeDefined();
    });
  });

  // Everything here is about somebody's account: an anonymous report cannot be
  // followed up, and an anonymous appeal is not an appeal.
  describe('without a token', () => {
    beforeEach(() => {
      authService.getHttpOptionsWithAccessToken.mockReturnValue(null);
    });

    it.each<[string, () => Observable<unknown>]>([
      ['report', () => service.report(reportRequest)],
      [
        'appeal',
        () =>
          service.appeal({
            targetType: StorytimeTargetType.STORY,
            targetId: STORY_ID,
            body: 'x',
          }),
      ],
      ['getMyAppeals', () => service.getMyAppeals()],
      ['withdrawAppeal', () => service.withdrawAppeal(APPEAL_ID)],
      ['getReports', () => service.getReports()],
      ['getReport', () => service.getReport(REPORT_ID)],
      [
        'resolveReport',
        () =>
          service.resolveReport(REPORT_ID, {
            status: StorytimeReportStatus.OPEN,
          }),
      ],
      [
        'getReportsForTarget',
        () => service.getReportsForTarget(StorytimeTargetType.STORY, STORY_ID),
      ],
      [
        'getHistory',
        () => service.getHistory(StorytimeTargetType.STORY, STORY_ID),
      ],
      ['removeContent', () => service.removeContent(moderateRequest)],
      ['restoreContent', () => service.restoreContent(moderateRequest)],
      ['getAppeals', () => service.getAppeals()],
      [
        'decideAppeal',
        () => service.decideAppeal(APPEAL_ID, { uphold: false }),
      ],
    ])('refuses %s', async (_name, act) => {
      await expect(firstValueFrom(act())).rejects.toThrow('No token found');
      httpMock.expectNone(() => true);
    });
  });
});
