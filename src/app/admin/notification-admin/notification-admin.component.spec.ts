import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import {
  NotificationSeverity,
  NotificationTarget,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';
import { NotificationAdminComponent } from './notification-admin.component';

describe('NotificationAdminComponent', () => {
  let component: NotificationAdminComponent;
  let fixture: ComponentFixture<NotificationAdminComponent>;
  let serviceSpy: jest.Mocked<
    Pick<
      NotificationService,
      | 'getAllNotificationsForAdmin'
      | 'createNotification'
      | 'deleteNotification'
    >
  >;

  beforeEach(async () => {
    serviceSpy = {
      getAllNotificationsForAdmin: jest.fn(() => of([])),
      createNotification: jest.fn(() => of({ id: '1' } as never)),
      deleteNotification: jest.fn(() => of(void 0)),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationAdminComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: serviceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationAdminComponent);
    component = fixture.componentInstance;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads notifications on init', () => {
    fixture.detectChanges();
    expect(serviceSpy.getAllNotificationsForAdmin).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('handles empty notification datasets', () => {
    serviceSpy.getAllNotificationsForAdmin.mockReturnValueOnce(of([]));

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.notifications).toEqual([]);
  });

  it('handles malformed notification payloads without hanging loading', () => {
    serviceSpy.getAllNotificationsForAdmin.mockReturnValueOnce(
      of(null as unknown as never[]),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.notifications).toEqual([]);
  });

  it('clears loading when notification request hangs', () => {
    serviceSpy.getAllNotificationsForAdmin.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading notifications is taking longer than expected. Please try again.',
    );
  });

  it('sends a valid broadcast notification', () => {
    fixture.detectChanges();
    component.form.patchValue({
      target: NotificationTarget.BROADCAST,
      severity: NotificationSeverity.INFO,
      title: 'Title',
      body: 'Body',
    });
    component.send();
    expect(serviceSpy.createNotification).toHaveBeenCalled();
  });

  it('requires a userId for user-targeted notifications', () => {
    fixture.detectChanges();
    component.form.patchValue({
      target: NotificationTarget.USER,
      title: 'Title',
      body: 'Body',
      userId: '',
    });
    component.send();
    expect(serviceSpy.createNotification).not.toHaveBeenCalled();
  });
});
