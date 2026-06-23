import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subscription,
  catchError,
  switchMap,
  tap,
  throwError,
  timer,
} from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  AppNotification,
  AppState,
  Banner,
  CreateBannerRequest,
  CreateNotificationRequest,
  InboxQuery,
  PaginatedInbox,
  UnreadCountResponse,
  UpdateBannerRequest,
} from 'src/app/models/notification.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  MILLISECONDS_APP_STATE_POLLING_INTERVAL,
  MILLISECONDS_ZERO,
} from 'src/app/shared/constants/timings.constants';

/**
 * Service for site banners and user inbox notifications, plus admin management.
 *
 * Maintains a reactive unread-count stream so the notification bell can update
 * its badge without each consumer polling independently.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  /** Emits the current unread notification count. */
  public readonly unreadCount$ = this.unreadCountSubject.asObservable();

  private readonly bannersSubject = new BehaviorSubject<Banner[]>([]);
  /** Emits the currently active site banners, refreshed by app-state polling. */
  public readonly banners$ = this.bannersSubject.asObservable();

  private appStatePollSub?: Subscription;

  // ----- App state (polled) -----

  /**
   * Fetches the aggregated app state (active banners plus, when authenticated,
   * the unread count) and pushes it onto the {@link banners$} and
   * {@link unreadCount$} streams.
   *
   * The access token is included when present so the server can return the
   * caller's unread count; anonymous callers receive banners with a zero count.
   *
   * @returns An observable of the app state.
   */
  getAppState(): Observable<AppState> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken() ?? {};
    return this.http.get<AppState>(API_URLS.APP_STATE, httpOptions).pipe(
      tap(state => {
        this.bannersSubject.next(state.banners);
        this.unreadCountSubject.next(state.unreadCount);
      }),
    );
  }

  /**
   * Starts polling the app-state endpoint on a fixed interval if not already
   * running, so banners and the unread badge stay current without each consumer
   * polling independently. Poll failures are swallowed (the data is
   * non-critical) and do not stop the interval.
   */
  startAppStatePolling(): void {
    if (this.appStatePollSub) return;

    this.appStatePollSub = timer(
      MILLISECONDS_ZERO,
      MILLISECONDS_APP_STATE_POLLING_INTERVAL,
    )
      .pipe(switchMap(() => this.getAppState().pipe(catchError(() => EMPTY))))
      .subscribe();
  }

  /**
   * Stops the active app-state polling subscription, if one exists.
   */
  stopAppStatePolling(): void {
    this.appStatePollSub?.unsubscribe();
    this.appStatePollSub = undefined;
  }

  // ----- Banners (public) -----

  /**
   * Lists the currently active site banners.
   *
   * @returns An observable of the active banners.
   */
  getActiveBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(API_URLS.NOTIFICATIONS_BANNERS);
  }

  // ----- Inbox (authenticated) -----

  /**
   * Fetches the current user's inbox and updates the unread count.
   *
   * @param query - Optional pagination and unread filter.
   * @returns An observable of the paginated inbox.
   */
  getInbox(query: InboxQuery = {}): Observable<PaginatedInbox> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    let params = new HttpParams();
    if (query.unreadOnly) {
      params = params.set('unreadOnly', String(query.unreadOnly));
    }
    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('pageSize', String(query.pageSize));
    }
    return this.http
      .get<PaginatedInbox>(API_URLS.NOTIFICATIONS, { ...httpOptions, params })
      .pipe(tap(result => this.unreadCountSubject.next(result.unreadCount)));
  }

  /**
   * Refreshes the unread count from the server.
   *
   * @returns An observable of the unread-count response.
   */
  refreshUnreadCount(): Observable<UnreadCountResponse> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http
      .get<UnreadCountResponse>(
        API_URLS.NOTIFICATIONS_UNREAD_COUNT,
        httpOptions,
      )
      .pipe(tap(result => this.unreadCountSubject.next(result.unreadCount)));
  }

  /**
   * Marks a single notification as read and decrements the unread count.
   *
   * @param id - The notification ID.
   * @returns An observable that completes when marked.
   */
  markRead(id: string): Observable<void> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http
      .post<void>(`${API_URLS.NOTIFICATIONS}/${id}/read`, {}, httpOptions)
      .pipe(
        tap(() =>
          this.unreadCountSubject.next(
            Math.max(0, this.unreadCountSubject.value - 1),
          ),
        ),
      );
  }

  /**
   * Marks a single notification as unread and increments the unread count.
   *
   * @param id - The notification ID.
   * @returns An observable that completes when marked.
   */
  markUnread(id: string): Observable<void> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http
      .delete<void>(`${API_URLS.NOTIFICATIONS}/${id}/read`, httpOptions)
      .pipe(
        tap(() =>
          this.unreadCountSubject.next(this.unreadCountSubject.value + 1),
        ),
      );
  }

  /**
   * Marks all notifications as read and zeroes the unread count.
   *
   * @returns An observable of the number marked.
   */
  markAllRead(): Observable<{ marked: number }> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http
      .post<{
        marked: number;
      }>(API_URLS.NOTIFICATIONS_READ_ALL, {}, httpOptions)
      .pipe(tap(() => this.unreadCountSubject.next(0)));
  }

  // ----- Admin -----

  /**
   * Lists all notifications (admin).
   *
   * @returns An observable of all notifications.
   */
  getAllNotificationsForAdmin(): Observable<AppNotification[]> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<AppNotification[]>(
      API_URLS.NOTIFICATIONS_ADMIN,
      httpOptions,
    );
  }

  /**
   * Creates a notification, broadcast or user-targeted (admin).
   *
   * @param payload - The notification data.
   * @returns An observable of the created notification.
   */
  createNotification(
    payload: CreateNotificationRequest,
  ): Observable<AppNotification> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.post<AppNotification>(
      API_URLS.NOTIFICATIONS_ADMIN,
      payload,
      httpOptions,
    );
  }

  /**
   * Deletes a notification (admin).
   *
   * @param id - The notification ID.
   * @returns An observable that completes when deleted.
   */
  deleteNotification(id: string): Observable<void> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.delete<void>(
      `${API_URLS.NOTIFICATIONS_ADMIN}/${id}`,
      httpOptions,
    );
  }

  /**
   * Lists all banners (admin).
   *
   * @returns An observable of all banners.
   */
  getAllBannersForAdmin(): Observable<Banner[]> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<Banner[]>(
      API_URLS.NOTIFICATIONS_ADMIN_BANNERS,
      httpOptions,
    );
  }

  /**
   * Gets a single banner by ID (admin).
   *
   * @param id - The banner ID.
   * @returns An observable of the banner.
   */
  getBannerByIdForAdmin(id: string): Observable<Banner> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<Banner>(
      `${API_URLS.NOTIFICATIONS_ADMIN_BANNERS}/${id}`,
      httpOptions,
    );
  }

  /**
   * Creates a banner (admin).
   *
   * @param payload - The banner data.
   * @returns An observable of the created banner.
   */
  createBanner(payload: CreateBannerRequest): Observable<Banner> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.post<Banner>(
      API_URLS.NOTIFICATIONS_ADMIN_BANNERS,
      payload,
      httpOptions,
    );
  }

  /**
   * Updates a banner (admin).
   *
   * @param id - The banner ID.
   * @param payload - The partial update.
   * @returns An observable of the updated banner.
   */
  updateBanner(id: string, payload: UpdateBannerRequest): Observable<Banner> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.patch<Banner>(
      `${API_URLS.NOTIFICATIONS_ADMIN_BANNERS}/${id}`,
      payload,
      httpOptions,
    );
  }

  /**
   * Deletes a banner (admin).
   *
   * @param id - The banner ID.
   * @returns An observable that completes when deleted.
   */
  deleteBanner(id: string): Observable<void> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.delete<void>(
      `${API_URLS.NOTIFICATIONS_ADMIN_BANNERS}/${id}`,
      httpOptions,
    );
  }
}
