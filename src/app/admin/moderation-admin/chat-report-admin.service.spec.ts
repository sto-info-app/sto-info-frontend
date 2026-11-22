import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { ReportStatus } from 'src/app/models/moderation.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { ChatReportAdminService } from './chat-report-admin.service';

const URL = API_URLS.CHAT_ADMIN_REPORTS;

describe('ChatReportAdminService', () => {
  let service: ChatReportAdminService;
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

    service = TestBed.inject(ChatReportAdminService);
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

  it('lists the queue, sending only the filters given', () => {
    service.list().subscribe();
    expect(expectOne('GET', URL).request.params.keys()).toEqual([]);

    service
      .list({ status: ReportStatus.OPEN, page: 2, pageSize: undefined })
      .subscribe();

    const request = expectOne('GET', URL);

    expect(request.request.params.get('status')).toBe('OPEN');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.has('pageSize')).toBe(false);
    request.flush({ items: [], total: 0, page: 2, pageSize: 20, openCount: 0 });
  });

  it('reads, decides and removes', () => {
    service.detail('report-1').subscribe();
    expectOne('GET', `${URL}/report-1`).flush({});

    service
      .decide('report-1', { status: ReportStatus.DISMISSED, note: 'Seen' })
      .subscribe();
    expect(expectOne('POST', `${URL}/report-1/decision`).request.body).toEqual({
      status: ReportStatus.DISMISSED,
      note: 'Seen',
    });

    service.removeMessage('report-1', 'Spam').subscribe();
    expect(
      expectOne('POST', `${URL}/report-1/remove-message`).request.body,
    ).toEqual({ reason: 'Spam' });
  });

  it('refuses every call without a token', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    let error: unknown;

    service.list().subscribe({ error: caught => (error = caught) });

    expect(error).toEqual(new Error('No token found'));
  });
});
