import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { ModerationHoldAdminService } from './moderation-hold-admin.service';

const URL = API_URLS.MODERATION_HOLDS_ADMIN;

describe('ModerationHoldAdminService', () => {
  let service: ModerationHoldAdminService;
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

    service = TestBed.inject(ModerationHoldAdminService);
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

  it('lists holds, filtered or not', () => {
    service.list().subscribe();
    expect(expectOne('GET', URL).request.params.keys()).toEqual([]);

    service.list(true).subscribe();
    expect(expectOne('GET', URL).request.params.get('active')).toBe('true');
  });

  it('places, reads, extends, releases and reads what a hold keeps', () => {
    const request = {
      kind: 'MEMBER_MESSAGES' as const,
      subjectUserId: 'user-1',
      reason: 'Case',
    };

    service.place(request).subscribe();
    expect(expectOne('POST', URL).request.body).toEqual(request);

    service.detail('hold-1').subscribe();
    expectOne('GET', `${URL}/hold-1`).flush({});

    service.extend('hold-1', '2026-12-01T23:59:59.000Z', 'More').subscribe();
    expect(expectOne('POST', `${URL}/hold-1/extend`).request.body).toEqual({
      reviewAt: '2026-12-01T23:59:59.000Z',
      reason: 'More',
    });

    service.release('hold-1', 'Done').subscribe();
    expect(expectOne('POST', `${URL}/hold-1/release`).request.body).toEqual({
      reason: 'Done',
    });

    service.read('hold-1', 'Reviewing it').subscribe();
    expect(expectOne('POST', `${URL}/hold-1/read`).request.body).toEqual({
      purpose: 'Reviewing it',
    });

    service.read('hold-1', 'Reviewing it', 'cursor').subscribe();
    expect(expectOne('POST', `${URL}/hold-1/read`).request.body).toEqual({
      purpose: 'Reviewing it',
      before: 'cursor',
    });
  });

  it('counts both queues’ open reports', () => {
    service.openCounts().subscribe();
    expectOne('GET', API_URLS.MODERATION_ADMIN_OPEN_COUNTS).flush({
      userReports: 1,
      chatReports: 2,
      total: 3,
    });
  });

  it('refuses every call without a token', () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    let error: unknown;

    service.list().subscribe({ error: caught => (error = caught) });

    expect(error).toEqual(new Error('No token found'));
  });
});
