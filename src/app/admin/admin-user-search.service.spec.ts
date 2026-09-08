import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserSearchPage } from 'src/app/models/notification.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { AdminUserSearchService } from './admin-user-search.service';

describe('AdminUserSearchService', () => {
  let service: AdminUserSearchService;
  let httpMock: HttpTestingController;

  const emptyPage: UserSearchPage = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 5,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(AdminUserSearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('calls the correct URL with q, page and pageSize', () => {
    service.search('kirk').subscribe();
    const req = httpMock.expectOne(
      r =>
        r.url === `${API_URLS.NOTIFICATIONS_ADMIN}/users/search` &&
        r.params.get('q') === 'kirk' &&
        r.params.get('page') === '1' &&
        r.params.get('pageSize') === '5',
    );
    expect(req.request.method).toBe('GET');
    req.flush(emptyPage);
  });

  it('passes a custom page number', () => {
    service.search('spock', 2).subscribe();
    const req = httpMock.expectOne(r => r.params.get('page') === '2');
    req.flush(emptyPage);
  });

  it('passes a custom page size', () => {
    service.search('spock', 1, 10).subscribe();
    const req = httpMock.expectOne(r => r.params.get('pageSize') === '10');
    req.flush(emptyPage);
  });

  it('returns the response from the server', () => {
    const page: UserSearchPage = {
      items: [
        {
          id: 'u1',
          username: 'kirk',
          fullName: 'James Kirk',
          role: 'USER',
          lastLoginAt: '2026-05-01T09:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 5,
    };
    let result: UserSearchPage | undefined;
    service.search('kirk').subscribe(r => (result = r));
    const req = httpMock.expectOne(r => r.url.includes('/users/search'));
    req.flush(page);
    expect(result).toEqual(page);
  });
});
