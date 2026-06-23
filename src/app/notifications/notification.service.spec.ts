import { HttpHeaders } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { AppState, PaginatedInbox } from 'src/app/models/notification.models';
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

  it('pushes banners and unread count when fetching app state', async () => {
    const state: AppState = {
      banners: [{ id: 'b1' }] as AppState['banners'],
      unreadCount: 5,
    };
    const promise = firstValueFrom(service.getAppState());
    const req = httpMock.expectOne(API_URLS.APP_STATE);
    expect(req.request.method).toBe('GET');
    req.flush(state);
    await promise;
    await expect(firstValueFrom(service.banners$)).resolves.toHaveLength(1);
    await expect(firstValueFrom(service.unreadCount$)).resolves.toBe(5);
  });

  it('fetches app state anonymously when no token is present', () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    service.getAppState().subscribe();
    const req = httpMock.expectOne(API_URLS.APP_STATE);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ banners: [], unreadCount: 0 });
  });

  it('polls app state once started and stops cleanly', fakeAsync(() => {
    service.startAppStatePolling();
    // A second start is a no-op while already polling.
    service.startAppStatePolling();
    tick(0);
    httpMock
      .expectOne(API_URLS.APP_STATE)
      .flush({ banners: [], unreadCount: 0 });

    service.stopAppStatePolling();
    // No further polls after stopping.
    tick(60000);
    httpMock.verify();
  }));

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

  it('fetches inbox with query parameters', async () => {
    const inbox: PaginatedInbox = {
      items: [],
      total: 0,
      page: 2,
      pageSize: 10,
      unreadCount: 0,
    };
    const promise = firstValueFrom(
      service.getInbox({ unreadOnly: true, page: 2, pageSize: 10 }),
    );
    const req = httpMock.expectOne(r => r.url === API_URLS.NOTIFICATIONS);
    expect(req.request.params.get('unreadOnly')).toBe('true');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(inbox);
    await promise;
  });

  it('returns error when no token for getInbox', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.getInbox());
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('refreshes unread count and updates stream', async () => {
    const promise = firstValueFrom(service.refreshUnreadCount());
    const req = httpMock.expectOne(API_URLS.NOTIFICATIONS_UNREAD_COUNT);
    req.flush({ unreadCount: 7 });
    await promise;
    await expect(firstValueFrom(service.unreadCount$)).resolves.toBe(7);
  });

  it('returns error when no token for refreshUnreadCount', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.refreshUnreadCount());
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('increments unread count when marking unread', async () => {
    service.refreshUnreadCount().subscribe();
    httpMock.expectOne(API_URLS.NOTIFICATIONS_UNREAD_COUNT).flush({
      unreadCount: 3,
    });

    service.markUnread('n1').subscribe();
    httpMock.expectOne(`${API_URLS.NOTIFICATIONS}/n1/read`).flush(null);

    await expect(firstValueFrom(service.unreadCount$)).resolves.toBe(4);
  });

  it('returns error when no token for markUnread', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.markUnread('n1'));
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('returns error when no token for markRead', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.markRead('n1'));
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('returns error when no token for markAllRead', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.markAllRead());
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('lists all notifications for admin', () => {
    service.getAllNotificationsForAdmin().subscribe();
    const req = httpMock.expectOne(API_URLS.NOTIFICATIONS_ADMIN);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('returns error when no token for getAllNotificationsForAdmin', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.getAllNotificationsForAdmin());
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('returns error when no token for createNotification', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(
        service.createNotification({ title: 'T', body: 'B' }),
      );
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('deletes a notification (admin)', () => {
    service.deleteNotification('n1').subscribe();
    const req = httpMock.expectOne(`${API_URLS.NOTIFICATIONS_ADMIN}/n1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('returns error when no token for deleteNotification', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.deleteNotification('n1'));
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('lists all banners for admin', () => {
    service.getAllBannersForAdmin().subscribe();
    const req = httpMock.expectOne(API_URLS.NOTIFICATIONS_ADMIN_BANNERS);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('returns error when no token for getAllBannersForAdmin', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.getAllBannersForAdmin());
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('gets a banner by ID (admin)', () => {
    service.getBannerByIdForAdmin('b1').subscribe();
    const req = httpMock.expectOne(
      `${API_URLS.NOTIFICATIONS_ADMIN_BANNERS}/b1`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'b1' });
  });

  it('returns error when no token for getBannerByIdForAdmin', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.getBannerByIdForAdmin('b1'));
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('updates a banner (admin)', () => {
    service.updateBanner('b1', { message: 'Updated' }).subscribe();
    const req = httpMock.expectOne(
      `${API_URLS.NOTIFICATIONS_ADMIN_BANNERS}/b1`,
    );
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 'b1' });
  });

  it('returns error when no token for updateBanner', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.updateBanner('b1', { message: 'Updated' }));
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('deletes a banner (admin)', () => {
    service.deleteBanner('b1').subscribe();
    const req = httpMock.expectOne(
      `${API_URLS.NOTIFICATIONS_ADMIN_BANNERS}/b1`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('returns error when no token for deleteBanner', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.deleteBanner('b1'));
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('returns error when no token for createBanner', async () => {
    authServiceSpy.getHttpOptionsWithAccessToken.mockReturnValueOnce(null);
    try {
      await firstValueFrom(service.createBanner({ message: 'Hi' }));
      fail('should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('No token found');
    }
  });

  it('handles app state polling errors gracefully', fakeAsync(() => {
    service.startAppStatePolling();
    tick(0);
    httpMock.expectOne(API_URLS.APP_STATE).error(new ErrorEvent('test'));
    // Polling should continue despite the error
    tick(60000);
    httpMock.expectOne(API_URLS.APP_STATE);
    service.stopAppStatePolling();
    httpMock.verify();
  }));
});
