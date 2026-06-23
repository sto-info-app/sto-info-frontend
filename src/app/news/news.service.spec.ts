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

  it('fetches published news with category filter', () => {
    service
      .getPublishedNews({ category: 'patch-notes' })
      .subscribe(result => expect(result).toEqual(emptyPage));

    const req = httpMock.expectOne(
      r =>
        r.url === API_URLS.NEWS && r.params.get('category') === 'patch-notes',
    );
    expect(req.request.method).toBe('GET');
    req.flush(emptyPage);
  });

  it('fetches published news without params', () => {
    service
      .getPublishedNews()
      .subscribe(result => expect(result).toEqual(emptyPage));

    const req = httpMock.expectOne(API_URLS.NEWS);
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

  it('fetches all news for admin with query params', () => {
    service
      .getAllNewsForAdmin({ page: 1, pageSize: 20, category: 'events' })
      .subscribe(result => expect(result).toEqual(emptyPage));

    const req = httpMock.expectOne(
      r =>
        r.url === API_URLS.NEWS_ADMIN &&
        r.params.get('page') === '1' &&
        r.params.get('category') === 'events',
    );
    expect(req.request.method).toBe('GET');
    req.flush(emptyPage);
  });

  it('fetches a news post by ID for admin', () => {
    service.getNewsByIdForAdmin('post-123').subscribe();
    const req = httpMock.expectOne(`${API_URLS.NEWS_ADMIN}/post-123`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'post-123' });
  });

  it('errors when no token for getNewsByIdForAdmin', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);
    service.getNewsByIdForAdmin('123').subscribe({
      error: err => expect(err).toBeInstanceOf(Error),
    });
    httpMock.expectNone(`${API_URLS.NEWS_ADMIN}/123`);
  });

  it('creates a post with the auth header', () => {
    service
      .createNews({ title: 'T', body: 'B', status: NewsStatus.DRAFT })
      .subscribe();
    const req = httpMock.expectOne(API_URLS.NEWS);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '1' });
  });

  it('errors when no token for createNews', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);
    service
      .createNews({ title: 'T', body: 'B', status: NewsStatus.DRAFT })
      .subscribe({
        error: err => expect(err).toBeInstanceOf(Error),
      });
    httpMock.expectNone(API_URLS.NEWS);
  });

  it('updates a post', () => {
    service.updateNews('1', { title: 'Updated Title' }).subscribe();
    const req = httpMock.expectOne(`${API_URLS.NEWS}/1`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: '1' });
  });

  it('errors when no token for updateNews', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);
    service.updateNews('1', { title: 'Updated' }).subscribe({
      error: err => expect(err).toBeInstanceOf(Error),
    });
    httpMock.expectNone(`${API_URLS.NEWS}/1`);
  });

  it('publishes a post', () => {
    service.publishNews('1').subscribe();
    const req = httpMock.expectOne(`${API_URLS.NEWS}/1/publish`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '1' });
  });

  it('errors when no token for publishNews', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);
    service.publishNews('1').subscribe({
      error: err => expect(err).toBeInstanceOf(Error),
    });
    httpMock.expectNone(`${API_URLS.NEWS}/1/publish`);
  });

  it('deletes a post', () => {
    service.deleteNews('1').subscribe();
    const req = httpMock.expectOne(`${API_URLS.NEWS}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('errors when no token for deleteNews', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValue(null);
    service.deleteNews('1').subscribe({
      error: err => expect(err).toBeInstanceOf(Error),
    });
    httpMock.expectNone(`${API_URLS.NEWS}/1`);
  });
});
