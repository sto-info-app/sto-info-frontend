import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { apiHealthInterceptor } from './api-health.interceptor';
import { HealthService } from './health.service';

describe('apiHealthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let healthServiceSpy: jest.Mocked<HealthService>;

  beforeEach(() => {
    const spy = {
      recordFailure: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiHealthInterceptor])),
        provideHttpClientTesting(),
        { provide: HealthService, useValue: spy },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    healthServiceSpy = TestBed.inject(
      HealthService,
    ) as jest.Mocked<HealthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should pass through successful requests', () => {
    const url = API_URLS.ROOT + '/test';
    httpClient.get(url).subscribe();

    const req = httpMock.expectOne(url);
    req.flush({});

    expect(healthServiceSpy.recordFailure).not.toHaveBeenCalled();
  });

  it('should record a failure on status 0 (network error)', () => {
    const url = API_URLS.ROOT + '/test';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.error(new ProgressEvent('error'), { status: 0 });

    expect(healthServiceSpy.recordFailure).toHaveBeenCalled();
  });

  it('should record a failure on status 500', () => {
    const url = API_URLS.ROOT + '/test';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.flush('error', { status: 500, statusText: 'Server Error' });

    expect(healthServiceSpy.recordFailure).toHaveBeenCalled();
  });

  it('should NOT record a failure on status 400', () => {
    const url = API_URLS.ROOT + '/test';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.flush('error', { status: 400, statusText: 'Bad Request' });

    expect(healthServiceSpy.recordFailure).not.toHaveBeenCalled();
  });

  it('should NOT record a failure if not an API call', () => {
    const url = 'https://other-domain.com/test';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.flush('error', { status: 500, statusText: 'Server Error' });

    expect(healthServiceSpy.recordFailure).not.toHaveBeenCalled();
  });

  it('should record a failure on status 503 (service unavailable)', () => {
    const url = API_URLS.ROOT + '/test';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.flush('error', { status: 503, statusText: 'Service Unavailable' });

    expect(healthServiceSpy.recordFailure).toHaveBeenCalled();
  });

  it('should NOT record a failure on 4xx client errors (e.g. 404)', () => {
    const url = API_URLS.ROOT + '/missing';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(healthServiceSpy.recordFailure).not.toHaveBeenCalled();
  });
});
