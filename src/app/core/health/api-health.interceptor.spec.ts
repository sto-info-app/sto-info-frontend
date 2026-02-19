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
      markDown: jest.fn(),
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

    expect(healthServiceSpy.markDown).not.toHaveBeenCalled();
  });

  it('should mark down on status 0 (network error)', () => {
    const url = API_URLS.ROOT + '/test';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.error(new ProgressEvent('error'), { status: 0 });

    expect(healthServiceSpy.markDown).toHaveBeenCalled();
  });

  it('should mark down on status 500', () => {
    const url = API_URLS.ROOT + '/test';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.flush('error', { status: 500, statusText: 'Server Error' });

    expect(healthServiceSpy.markDown).toHaveBeenCalled();
  });

  it('should NOT mark down on status 400', () => {
    const url = API_URLS.ROOT + '/test';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.flush('error', { status: 400, statusText: 'Bad Request' });

    expect(healthServiceSpy.markDown).not.toHaveBeenCalled();
  });

  it('should NOT mark down if not an API call', () => {
    const url = 'https://other-domain.com/test';
    httpClient.get(url).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne(url);
    req.flush('error', { status: 500, statusText: 'Server Error' });

    expect(healthServiceSpy.markDown).not.toHaveBeenCalled();
  });
});
