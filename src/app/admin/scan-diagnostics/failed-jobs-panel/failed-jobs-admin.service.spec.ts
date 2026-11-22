import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

import { FailedJobsAdminService } from './failed-jobs-admin.service';

const URL = API_URLS.FILE_SCANNING_ADMIN_FAILED_JOBS;

describe('FailedJobsAdminService (FC-042)', () => {
  let service: FailedJobsAdminService;
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

    service = TestBed.inject(FailedJobsAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Expects one request, with the token.
   *
   * @param method - Its method.
   * @param url - Its URL, without its query.
   * @returns It.
   */
  const expectOne = (method: string, url: string) => {
    const request = httpMock.expectOne(
      req => req.method === method && req.url === url,
    );

    expect(request.request.headers.get('Authorization')).toBe('Bearer token');

    return request;
  };

  it('reads a page of every queue, or of one', () => {
    service.list(null, 2).subscribe();
    const every = expectOne('GET', URL);

    expect(every.request.params.get('page')).toBe('2');
    expect(every.request.params.has('queue')).toBe(false);
    every.flush({});

    service.list('file-scan', 1).subscribe();
    const one = expectOne('GET', URL);

    expect(one.request.params.get('page')).toBe('1');
    expect(one.request.params.get('queue')).toBe('file-scan');
    one.flush({});
  });

  it('retries and discards one job, with a reason', () => {
    service
      .retry('file-asset-publication', 'asset 1', 'Bucket back')
      .subscribe();
    const retry = expectOne(
      'POST',
      `${URL}/file-asset-publication/asset%201/retry`,
    );

    expect(retry.request.body).toEqual({ reason: 'Bucket back' });
    retry.flush(null);

    service.discard('chat-transcript', '42', 'Settled').subscribe();
    const discard = expectOne('POST', `${URL}/chat-transcript/42/discard`);

    expect(discard.request.body).toEqual({ reason: 'Settled' });
    discard.flush(null);
  });

  it('retries or discards them all, in every queue or one', () => {
    service.retryAll(null, 'Redis back').subscribe();
    const retryAll = expectOne('POST', `${URL}/retry-all`);

    expect(retryAll.request.body).toEqual({ reason: 'Redis back' });
    retryAll.flush({});

    service.discardUnretryable('file-scan', 'Clearing up').subscribe();
    const discard = expectOne('POST', `${URL}/discard-unretryable`);

    expect(discard.request.body).toEqual({
      reason: 'Clearing up',
      queue: 'file-scan',
    });
    discard.flush({});
  });

  it('asks nothing when signed out', async () => {
    authService.getHttpOptionsWithAccessToken.mockReturnValue(null);

    await expect(firstValueFrom(service.list(null, 1))).rejects.toThrow(
      'No token found',
    );
  });
});
