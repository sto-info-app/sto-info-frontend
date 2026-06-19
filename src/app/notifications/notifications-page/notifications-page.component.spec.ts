import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
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
      'getInbox' | 'markRead' | 'markUnread' | 'markAllRead'
    >
  > & { unreadCount$: BehaviorSubject<number> };

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
          pageSize: 15,
          unreadCount: 1,
        }),
      ),
      markRead: jest.fn(() => of(void 0)),
      markUnread: jest.fn(() => of(void 0)),
      markAllRead: jest.fn(() => of({ marked: 1 })),
    };

    await TestBed.configureTestingModule({
      imports: [
        NotificationsPageComponent,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [{ provide: NotificationService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPageComponent);
    component = fixture.componentInstance;
  });

  it('loads the first page on init', () => {
    fixture.detectChanges();
    expect(serviceSpy.getInbox).toHaveBeenCalledWith({ page: 1, pageSize: 15 });
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

  it('computes the total pages', () => {
    component.total = 31;
    expect(component.totalPages).toBe(3);
  });

  it('detects external vs internal links', () => {
    expect(component.isExternalLink('https://example.com/page')).toBe(true);
    expect(component.isExternalLink('/notifications')).toBe(false);
    expect(component.isExternalLink(null)).toBe(false);
    expect(component.isExternalLink('not a url')).toBe(false);
  });

  it('reduces internal links to an app-relative path', () => {
    expect(component.internalPath('/dashboard/accounts')).toBe(
      '/dashboard/accounts',
    );
    expect(component.internalPath(`${location.origin}/news/abc?x=1`)).toBe(
      '/news/abc?x=1',
    );
  });

  it('clears the loading flag after a successful load', () => {
    fixture.detectChanges();
    expect(component.isLoading).toBe(false);
  });
});
