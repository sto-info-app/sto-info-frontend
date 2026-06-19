import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { PaginatedInbox } from 'src/app/models/notification.models';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jest.Mocked<
    Pick<AuthService, 'getHttpOptionsWithAccessToken'>
  >;

  beforeEach(() => {
    authServiceSpy = {
      getHttpOptionsWithAccessToken: jest.fn(() => ({
        headers: new HttpHeaders(),
      })),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotificationService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches active banners (public)', () => {
    service.getActiveBanners().subscribe();
    const req = httpMock.expectOne(API_URLS.NOTIFICATIONS_BANNERS);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('updates the unread count when fetching the inbox', async () => {
    const inbox: PaginatedInbox = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      unreadCount: 4,
    };
    const promise = firstValueFrom(service.getInbox());
    const req = httpMock.expectOne(r => r.url === API_URLS.NOTIFICATIONS);
    req.flush(inbox);
    await promise;
    await expect(firstValueFrom(service.unreadCount$)).resolves.toBe(4);
  });

  it('decrements the unread count when marking one read', async () => {
    service.refreshUnreadCount().subscribe();
    httpMock.expectOne(API_URLS.NOTIFICATIONS_UNREAD_COUNT).flush({
      unreadCount: 2,
    });

    service.markRead('n1').subscribe();
    httpMock.expectOne(`${API_URLS.NOTIFICATIONS}/n1/read`).flush(null);

    await expect(firstValueFrom(service.unreadCount$)).resolves.toBe(1);
  });

  it('zeroes the unread count when marking all read', async () => {
    service.markAllRead().subscribe();
    httpMock.expectOne(API_URLS.NOTIFICATIONS_READ_ALL).flush({ marked: 3 });
    await expect(firstValueFrom(service.unreadCount$)).resolves.toBe(0);
  });

  it('creates a notification (admin)', () => {
    service.createNotification({ title: 'T', body: 'B' }).subscribe();
    const req = httpMock.expectOne(API_URLS.NOTIFICATIONS_ADMIN);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '1' });
  });

  it('creates a banner (admin)', () => {
    service.createBanner({ message: 'Hi' }).subscribe();
    const req = httpMock.expectOne(API_URLS.NOTIFICATIONS_ADMIN_BANNERS);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '1' });
  });
});
