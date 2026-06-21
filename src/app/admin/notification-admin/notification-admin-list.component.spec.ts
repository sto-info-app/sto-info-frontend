import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import {
  AppNotification,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { NotificationService } from 'src/app/notifications/notification.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationAdminListComponent } from './notification-admin-list.component';

describe('NotificationAdminListComponent', () => {
  let component: NotificationAdminListComponent;
  let fixture: ComponentFixture<NotificationAdminListComponent>;
  let serviceSpy: jest.Mocked<
    Pick<
      NotificationService,
      'getAllNotificationsForAdmin' | 'deleteNotification'
    >
  >;
  let dialogSpy: jest.Mocked<MatDialog>;

  /**
   * Stubs the confirm dialog to close with the given result.
   *
   * @param confirmed - Whether the user confirmed the deletion.
   */
  const stubDialog = (confirmed: boolean): void => {
    dialogSpy.open.mockReturnValue({
      afterClosed: jest.fn().mockReturnValue(of(confirmed)),
    } as unknown as MatDialogRef<unknown>);
  };

  beforeEach(async () => {
    serviceSpy = {
      getAllNotificationsForAdmin: jest.fn(() => of([])),
      deleteNotification: jest.fn(() => of(void 0)),
    };

    dialogSpy = {
      open: jest.fn(),
    } as unknown as jest.Mocked<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [NotificationAdminListComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: serviceSpy },
      ],
    })
      .overrideComponent(NotificationAdminListComponent, {
        remove: { imports: [MatDialogModule] },
        add: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NotificationAdminListComponent);
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

  it('skips the timeout fallback once loading has already finished', () => {
    // NEVER leaves the request pending so `finalize` never clears the timer;
    // flipping the flag exercises the timer's early-return guard.
    serviceSpy.getAllNotificationsForAdmin.mockReturnValueOnce(NEVER);
    fixture.detectChanges();
    component.isLoading = false;

    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
    expect(component.notifications).toEqual([]);
  });

  it('sets an error when loading fails', () => {
    serviceSpy.getAllNotificationsForAdmin.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Failed to load notifications.');
  });

  it('removes a notification after confirmation', () => {
    fixture.detectChanges();
    component.notifications = [
      { id: 'a' } as AppNotification,
      { id: 'b' } as AppNotification,
    ];
    stubDialog(true);

    component.remove({ id: 'a' } as AppNotification);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.anything(),
    );
    expect(serviceSpy.deleteNotification).toHaveBeenCalledWith('a');
    expect(component.notifications).toEqual([{ id: 'b' }]);
  });

  it('does not delete when the user cancels', () => {
    fixture.detectChanges();
    stubDialog(false);

    component.remove({ id: 'a' } as AppNotification);

    expect(serviceSpy.deleteNotification).not.toHaveBeenCalled();
  });

  it('sets an error when deletion fails', () => {
    fixture.detectChanges();
    stubDialog(true);
    serviceSpy.deleteNotification.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    component.remove({ id: 'a' } as AppNotification);

    expect(component.errorMessage).toBe('Failed to delete the notification.');
  });

  it('maps severity to its visual treatment, falling back to info', () => {
    expect(
      component.severityMeta({
        severity: NotificationSeverity.WARNING,
      } as AppNotification).label,
    ).toBe('Warning');
    expect(
      component.severityMeta({
        severity: 'UNKNOWN' as NotificationSeverity,
      } as AppNotification).label,
    ).toBe('Information');
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
});
