import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { NewsStatus, PaginatedNews } from 'src/app/models/news.models';
import { NewsService } from './news.service';

describe('NewsService', () => {
  let service: NewsService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jest.Mocked<
    Pick<AuthService, 'getHttpOptionsWithAccessToken'>
  >;

  const emptyPage: PaginatedNews = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  };

  beforeEach(() => {
    authServiceSpy = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders(),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NewsService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
    service = TestBed.inject(NewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches published news with query params', () => {
    service
      .getPublishedNews({ page: 2, pageSize: 5 })
      .subscribe(result => expect(result).toEqual(emptyPage));

    const req = httpMock.expectOne(
      r => r.url === API_URLS.NEWS && r.params.get('page') === '2',
    );
    expect(req.request.method).toBe('GET');
    req.flush(emptyPage);
  });

  it('fetches a post by slug', () => {
    service.getNewsBySlug('my-slug').subscribe();
    const req = httpMock.expectOne(`${API_URLS.NEWS}/my-slug`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: '1' });
  });

  it('creates a post with the auth header', () => {
    service
      .createNews({ title: 'T', body: 'B', status: NewsStatus.DRAFT })
      .subscribe();
    const req = httpMock.expectOne(API_URLS.NEWS);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '1' });
  });

  it('errors when no token is available for admin calls', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);
    service.getAllNewsForAdmin().subscribe({
      error: err => expect(err).toBeInstanceOf(Error),
    });
    httpMock.expectNone(API_URLS.NEWS_ADMIN);
  });

  it('publishes a post', () => {
    service.publishNews('1').subscribe();
    const req = httpMock.expectOne(`${API_URLS.NEWS}/1/publish`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '1' });
  });

  it('deletes a post', () => {
    service.deleteNews('1').subscribe();
    const req = httpMock.expectOne(`${API_URLS.NEWS}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
