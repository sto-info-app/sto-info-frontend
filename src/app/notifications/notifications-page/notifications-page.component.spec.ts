import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';
import {
  AppNotification,
  NotificationSeverity,
  NotificationTarget,
} from 'src/app/models/notification.models';
import { NotificationService } from '../notification.service';
import { NotificationsPageComponent } from './notifications-page.component';

describe('NotificationsPageComponent', () => {
  let component: NotificationsPageComponent;
  let fixture: ComponentFixture<NotificationsPageComponent>;
  let serviceSpy: jest.Mocked<
    Pick<
      NotificationService,
      | 'getInbox'
      | 'markRead'
      | 'markUnread'
      | 'markAllRead'
      | 'dismiss'
      | 'dismissAllRead'
      | 'refreshUnreadCount'
    >
  > & { unreadCount$: BehaviorSubject<number> };
  let dialog: { open: jest.Mock };
  let confirmed: boolean;

  const notification: AppNotification = {
    id: 'n1',
    target: NotificationTarget.BROADCAST,
    userId: null,
    severity: NotificationSeverity.INFO,
    title: 'Title',
    body: 'Body',
    linkUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    isRead: false,
    readAt: null,
  };

  beforeEach(async () => {
    serviceSpy = {
      unreadCount$: new BehaviorSubject<number>(1),
      getInbox: jest.fn(() =>
        of({
          items: [{ ...notification }],
          total: 1,
          page: 1,
          pageSize: 5,
          unreadCount: 1,
        }),
      ),
      markRead: jest.fn<
        ReturnType<NotificationService['markRead']>,
        Parameters<NotificationService['markRead']>
      >(() => of(void 0)),
      markUnread: jest.fn<
        ReturnType<NotificationService['markUnread']>,
        Parameters<NotificationService['markUnread']>
      >(() => of(void 0)),
      markAllRead: jest.fn(() => of({ marked: 1 })),
      dismiss: jest.fn<
        ReturnType<NotificationService['dismiss']>,
        Parameters<NotificationService['dismiss']>
      >(() => of(void 0)),
      dismissAllRead: jest.fn<
        ReturnType<NotificationService['dismissAllRead']>,
        Parameters<NotificationService['dismissAllRead']>
      >(() => of({ dismissed: 1 })),
      refreshUnreadCount: jest.fn<
        ReturnType<NotificationService['refreshUnreadCount']>,
        Parameters<NotificationService['refreshUnreadCount']>
      >(() => of({ unreadCount: 0 })),
    };
    confirmed = true;
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of(confirmed) })),
    };

    await TestBed.configureTestingModule({
      imports: [
        NotificationsPageComponent,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: NotificationService, useValue: serviceSpy },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPageComponent);
    component = fixture.componentInstance;
  });

  it('loads the first page on init', () => {
    fixture.detectChanges();
    expect(serviceSpy.getInbox).toHaveBeenCalledWith({ page: 1, pageSize: 5 });
    expect(component.notifications).toHaveLength(1);
    expect(component.unreadCount).toBe(1);
  });

  it('toggles an unread notification to read', () => {
    const item = { ...notification, isRead: false };
    component.unreadCount = 1;
    component.toggleRead(item, new MouseEvent('click'));
    expect(serviceSpy.markRead).toHaveBeenCalledWith('n1');
    expect(item.isRead).toBe(true);
    expect(component.unreadCount).toBe(0);
  });

  it('toggles a read notification back to unread', () => {
    const item = { ...notification, isRead: true };
    component.unreadCount = 0;
    component.toggleRead(item, new MouseEvent('click'));
    expect(serviceSpy.markUnread).toHaveBeenCalledWith('n1');
    expect(item.isRead).toBe(false);
    expect(component.unreadCount).toBe(1);
  });

  it('marks read when a link is followed', () => {
    const item = { ...notification, isRead: false };
    component.unreadCount = 1;
    component.markReadOnLink(item);
    expect(serviceSpy.markRead).toHaveBeenCalledWith('n1');
    expect(item.isRead).toBe(true);
    expect(component.unreadCount).toBe(0);
  });

  it('marks all read', () => {
    component.notifications = [{ ...notification }];
    component.unreadCount = 1;
    component.markAllRead();
    expect(serviceSpy.markAllRead).toHaveBeenCalled();
    expect(component.notifications[0].isRead).toBe(true);
    expect(component.unreadCount).toBe(0);
  });

  // Five a page, so a long inbox is read a handful at a time.
  it('computes the total pages', () => {
    component.total = 31;
    expect(component.totalPages).toBe(7);
  });

  it('counts the read notifications across every page', () => {
    component.total = 31;
    component.unreadCount = 4;
    expect(component.readCount).toBe(27);

    component.unreadCount = 40;
    expect(component.readCount).toBe(0);
  });

  describe('deleting', () => {
    const click = (): Event =>
      ({ stopPropagation: jest.fn() }) as unknown as Event;

    // A notice, not a record: one tap, no dialog. The page is then read
    // again so paging and counts come from the server.
    it('deletes one notification without asking, and reads the page again', () => {
      fixture.detectChanges();
      serviceSpy.getInbox.mockClear();
      const event = click();

      component.remove({ ...notification }, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(serviceSpy.dismiss).toHaveBeenCalledWith('n1');
      expect(dialog.open).not.toHaveBeenCalled();
      expect(serviceSpy.getInbox).toHaveBeenCalledWith({
        page: 1,
        pageSize: 5,
      });
      expect(serviceSpy.refreshUnreadCount).toHaveBeenCalled();
    });

    it('turns back a page when the last item on it is deleted', () => {
      component.page = 3;
      component.notifications = [{ ...notification }];

      component.remove({ ...notification }, click());

      expect(serviceSpy.getInbox).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 5,
      });
    });

    it('stays on the page when others remain on it', () => {
      component.page = 3;
      component.notifications = [
        { ...notification },
        { ...notification, id: 'n2' },
      ];

      component.remove({ ...notification }, click());

      expect(serviceSpy.getInbox).toHaveBeenLastCalledWith({
        page: 3,
        pageSize: 5,
      });
    });

    // The badge catches up on its own next poll; the page is still read
    // again, and nothing escapes into the console as an unhandled error.
    it('reads the page again even when the unread count cannot be refreshed', () => {
      fixture.detectChanges();
      serviceSpy.getInbox.mockClear();
      serviceSpy.refreshUnreadCount.mockReturnValueOnce(
        throwError(() => new Error('offline')),
      );

      expect(() =>
        component.remove({ ...notification }, click()),
      ).not.toThrow();

      expect(serviceSpy.refreshUnreadCount).toHaveBeenCalled();
      expect(serviceSpy.getInbox).toHaveBeenCalledWith({
        page: 1,
        pageSize: 5,
      });
    });

    it('leaves the list alone when deleting fails', () => {
      component.notifications = [{ ...notification }];
      serviceSpy.dismiss.mockReturnValueOnce(
        throwError(() => new Error('nope')),
      );

      component.remove({ ...notification }, click());

      expect(component.notifications).toHaveLength(1);
      expect(serviceSpy.getInbox).not.toHaveBeenCalled();
    });

    // Many at once, so it asks, as the site's other bulk deletions do.
    it('deletes every read notification once confirmed, and starts again at page one', () => {
      component.page = 4;

      component.deleteAllRead();

      expect(dialog.open).toHaveBeenCalled();
      expect(serviceSpy.dismissAllRead).toHaveBeenCalled();
      expect(serviceSpy.getInbox).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 5,
      });
    });

    it('deletes nothing when the dialog is cancelled', () => {
      confirmed = false;

      component.deleteAllRead();

      expect(serviceSpy.dismissAllRead).not.toHaveBeenCalled();
      expect(serviceSpy.getInbox).not.toHaveBeenCalled();
    });

    it('leaves the list alone when deleting the read ones fails', () => {
      component.notifications = [{ ...notification, isRead: true }];
      serviceSpy.dismissAllRead.mockReturnValueOnce(
        throwError(() => new Error('nope')),
      );

      component.deleteAllRead();

      expect(component.notifications).toHaveLength(1);
      expect(serviceSpy.getInbox).not.toHaveBeenCalled();
    });

    it('offers no Delete all read while nothing has been read', () => {
      serviceSpy.getInbox.mockReturnValue(
        of({
          items: [{ ...notification }],
          total: 3,
          page: 1,
          pageSize: 5,
          unreadCount: 3,
        }),
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain(
        'Delete all read',
      );
    });

    it('offers Delete all read once something has been read, and a delete on each card', () => {
      serviceSpy.getInbox.mockReturnValue(
        of({
          items: [{ ...notification }],
          total: 3,
          page: 1,
          pageSize: 5,
          unreadCount: 2,
        }),
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Delete all read');
      expect(
        fixture.nativeElement.querySelector(
          'button[aria-label="Delete notification"]',
        ),
      ).toBeTruthy();
    });
  });

  it('detects external vs internal links', () => {
    expect(component.isExternalLink('https://example.com/page')).toBe(true);
    expect(component.isExternalLink('/notifications')).toBe(false);
    expect(component.isExternalLink(null)).toBe(false);
    expect(component.isExternalLink('not a url')).toBe(false);
  });

  it('converts internal links to app-relative paths', () => {
    const path = component.internalPath('/app/page');
    expect(path).toContain('/app/page');
  });

  it('fallback to URL when internalPath parsing fails', () => {
    const url = 'not a valid url';
    const path = component.internalPath(url);
    // URL constructor converts spaces to %20, so we just check it returns something
    expect(path).toBeTruthy();
  });

  it('returns severity meta for known severity', () => {
    const notificationWithSeverity = {
      ...notification,
      severity: NotificationSeverity.CRITICAL,
    };
    const meta = component.severityMeta(notificationWithSeverity);
    expect(meta).toBeDefined();
  });

  it('returns default severity meta for unknown severity', () => {
    const notificationWithUnknownSeverity = {
      ...notification,
      severity: 'UNKNOWN' as NotificationSeverity,
    };
    const meta = component.severityMeta(notificationWithUnknownSeverity);
    expect(meta).toBeDefined();
  });

  it('skips marking read on link when already read', () => {
    const item = { ...notification, isRead: true };
    component.markReadOnLink(item);
    expect(serviceSpy.markRead).not.toHaveBeenCalled();
  });

  it('clears the loading flag after a successful load', () => {
    fixture.detectChanges();
    expect(component.isLoading).toBe(false);
  });

  it('shows network error when inbox loading fails with status 0', () => {
    serviceSpy.getInbox.mockReturnValueOnce(throwError(() => ({ status: 0 })));

    component.loadPage(2);

    expect(component.errorMessage).toBe(
      'Unable to reach the server. Please try again later.',
    );
    expect(component.isLoading).toBe(false);
  });

  it('shows generic error when inbox loading fails with non-network error', () => {
    serviceSpy.getInbox.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    component.loadPage(2);

    expect(component.errorMessage).toBe(
      'Something went wrong loading your notifications.',
    );
    expect(component.isLoading).toBe(false);
  });

  it('falls back to empty values when inbox payload is nullish', () => {
    serviceSpy.getInbox.mockReturnValueOnce(
      of(
        null as unknown as {
          items: AppNotification[];
          total: number;
          page: number;
          pageSize: number;
          unreadCount: number;
        },
      ),
    );

    component.loadPage(2);

    expect(component.notifications).toEqual([]);
    expect(component.total).toBe(0);
    expect(component.unreadCount).toBe(0);
  });

  it('handles loading timeout and sets timeout message', () => {
    jest.useFakeTimers();
    serviceSpy.getInbox.mockReturnValueOnce(NEVER);

    component.loadPage(3);
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe(
      'Loading notifications is taking longer than expected. Please try again.',
    );
    expect(component.isLoading).toBe(false);
    jest.useRealTimers();
  });

  it('returns early from timeout callback when loading already stopped', () => {
    jest.useFakeTimers();
    serviceSpy.getInbox.mockReturnValueOnce(NEVER);

    component.loadPage(4);
    component.isLoading = false;
    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
    jest.useRealTimers();
  });

  it('swallows detectChanges errors in stopLoading', () => {
    const detectChangesSpy = jest
      .spyOn(
        (component as unknown as { _cdr: { detectChanges: () => void } })._cdr,
        'detectChanges',
      )
      .mockImplementation(() => {
        throw new Error('render failure');
      });

    component.isLoading = true;
    (
      component as unknown as {
        stopLoading: () => void;
      }
    ).stopLoading();

    expect(component.isLoading).toBe(false);
    expect(detectChangesSpy).toHaveBeenCalled();
  });

  it('handles invalid URL parsing gracefully in isExternalLink', () => {
    const originalUrl = globalThis.URL;
    (globalThis as unknown as { URL: typeof URL }).URL = class {
      constructor() {
        throw new Error('bad url');
      }
    } as unknown as typeof URL;

    expect(component.isExternalLink('https://example.com')).toBe(false);

    (globalThis as unknown as { URL: typeof URL }).URL = originalUrl;
  });

  it('handles invalid URL parsing gracefully in internalPath', () => {
    const originalUrl = globalThis.URL;
    (globalThis as unknown as { URL: typeof URL }).URL = class {
      constructor() {
        throw new Error('bad url');
      }
    } as unknown as typeof URL;

    expect(component.internalPath('/dashboard')).toBe('/dashboard');

    (globalThis as unknown as { URL: typeof URL }).URL = originalUrl;
  });

  it('keeps state unchanged when toggleRead request fails', () => {
    const item = { ...notification, isRead: false };
    component.unreadCount = 3;
    serviceSpy.markRead.mockReturnValueOnce(
      throwError(() => new Error('mark read failed')),
    );

    component.toggleRead(item, new MouseEvent('click'));

    expect(item.isRead).toBe(false);
    expect(component.unreadCount).toBe(3);
  });

  it('keeps unread state when markReadOnLink fails', () => {
    const item = { ...notification, isRead: false };
    component.unreadCount = 2;
    serviceSpy.markRead.mockReturnValueOnce(
      throwError(() => new Error('mark read failed')),
    );

    component.markReadOnLink(item);

    expect(item.isRead).toBe(false);
    expect(component.unreadCount).toBe(2);
  });

  it('keeps notification list unchanged when markAllRead fails', () => {
    component.notifications = [{ ...notification, isRead: false }];
    component.unreadCount = 1;
    serviceSpy.markAllRead.mockReturnValueOnce(
      throwError(() => new Error('mark all failed')),
    );

    component.markAllRead();

    expect(component.notifications[0].isRead).toBe(false);
    expect(component.unreadCount).toBe(1);
  });
});
