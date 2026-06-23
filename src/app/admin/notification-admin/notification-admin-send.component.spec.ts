import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  AppNotification,
  NotificationSeverity,
  NotificationTarget,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';
import { NotificationAdminSendComponent } from './notification-admin-send.component';

describe('NotificationAdminSendComponent', () => {
  let component: NotificationAdminSendComponent;
  let fixture: ComponentFixture<NotificationAdminSendComponent>;
  let serviceSpy: jest.Mocked<Pick<NotificationService, 'createNotification'>>;

  beforeEach(async () => {
    const createdNotification: AppNotification = {
      id: '1',
      target: NotificationTarget.BROADCAST,
      userId: null,
      severity: NotificationSeverity.INFO,
      title: 'Title',
      body: 'Body',
      linkUrl: null,
      createdAt: '',
      isRead: false,
      readAt: null,
    };

    serviceSpy = {
      createNotification: jest.fn<
        ReturnType<NotificationService['createNotification']>,
        Parameters<NotificationService['createNotification']>
      >(() => of(createdNotification)),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationAdminSendComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: serviceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationAdminSendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sends a valid broadcast notification and routes to the sent list', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.form.patchValue({
      target: NotificationTarget.BROADCAST,
      severity: NotificationSeverity.INFO,
      title: 'Title',
      body: 'Body',
    });
    component.send();

    expect(serviceSpy.createNotification).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/notifications']);
  });

  it('surfaces an error and clears saving when the send fails', () => {
    serviceSpy.createNotification.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    component.form.patchValue({
      target: NotificationTarget.BROADCAST,
      severity: NotificationSeverity.INFO,
      title: 'Title',
      body: 'Body',
    });
    component.send();

    expect(component.errorMessage).toBe('Failed to send the notification.');
    expect(component.isSaving).toBe(false);
  });

  it('builds a user-targeted payload with trimmed userId and link', () => {
    const router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.form.patchValue({
      target: NotificationTarget.USER,
      severity: NotificationSeverity.WARNING,
      title: 'Title',
      body: 'Body',
      userId: '  user-1  ',
      linkUrl: '  https://example.com  ',
    });
    component.send();

    expect(serviceSpy.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        target: NotificationTarget.USER,
        severity: NotificationSeverity.WARNING,
        userId: 'user-1',
        linkUrl: 'https://example.com',
      }),
    );
  });

  it('requires a userId for user-targeted notifications', () => {
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
