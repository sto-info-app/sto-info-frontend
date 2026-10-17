import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import {
  AppNotification,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsPaginationComponent } from 'src/app/shared/components/lcars-pagination/lcars-pagination.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { NotificationService } from '../notification.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import {
  LOAD_TIMEOUT_MS,
  PAGE_SIZE,
  SEVERITY_META,
  SeverityMeta,
} from 'src/app/shared/constants/notifications.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * Full-page, paginated list of the current user's inbox notifications.
 *
 * Replaces the former header dropdown: the header "incoming transmission" alert
 * routes here, and items can be read individually or all at once. Five show
 * at a time. A notification can be deleted, singly without asking or every
 * read one at once behind a confirmation; deleting hides it for this reader
 * alone and for good.
 */
@Component({
  selector: 'app-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss'],
  standalone: true,
  imports: [
    AppDatePipe,
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsPaginationComponent,
  ],
})
export class NotificationsPageComponent implements OnInit {
  private readonly _notificationService = inject(NotificationService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _dialog = inject(MatDialog);

  notifications: AppNotification[] = [];
  isLoading = false;
  errorMessage = '';

  page = 1;
  total = 0;
  unreadCount = 0;

  /**
   * Loads the first page of notifications on init.
   */
  ngOnInit(): void {
    this.loadPage(1);
  }

  /**
   * Loads a specific page of the inbox.
   *
   * @param page - The 1-based page number.
   */
  loadPage(page: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.page = page;

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }
      this.errorMessage =
        'Loading notifications is taking longer than expected. Please try again.';
      this.stopLoading();
    }, LOAD_TIMEOUT_MS);

    this._notificationService
      .getInbox({ page, pageSize: PAGE_SIZE })
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: result => {
          this.notifications = result?.items ?? [];
          this.total = result?.total ?? 0;
          this.unreadCount = result?.unreadCount ?? 0;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 0
              ? 'Unable to reach the server. Please try again later.'
              : 'Something went wrong loading your notifications.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Clears the loading flag and refreshes the view.
   *
   * Change detection is forced explicitly because async callbacks in this app
   * do not reliably trigger it, and it is wrapped so that a template render
   * error can never leave the loading spinner stuck on screen.
   */
  private stopLoading(): void {
    this.isLoading = false;
    this._ngZone.run(() => {
      try {
        this._cdr.detectChanges();
      } catch {
        // The spinner is bound to `isLoading` (already false) and is evaluated
        // before the list, so it is removed even if a later binding throws.
      }
    });
  }

  /**
   * Total number of pages for the inbox.
   *
   * @returns The page count (at least 1).
   */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / PAGE_SIZE));
  }

  /**
   * How many notifications in the inbox have been read, across every page.
   *
   * @returns The count, never below zero.
   */
  get readCount(): number {
    return Math.max(0, this.total - this.unreadCount);
  }

  /**
   * Toggles a notification's read state via the appropriate endpoint and keeps
   * the local unread count in sync.
   *
   * @param notification - The notification to toggle.
   * @param event - The originating click, stopped so the card does not also act.
   */
  toggleRead(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    const markingRead = !notification.isRead;
    const request = markingRead
      ? this._notificationService.markRead(notification.id)
      : this._notificationService.markUnread(notification.id);

    request.pipe(observeInZone(this._ngZone, this._cdr)).subscribe({
      next: () => {
        notification.isRead = markingRead;
        this.unreadCount = Math.max(
          0,
          this.unreadCount + (markingRead ? -1 : 1),
        );
      },
      error: () => {
        // Leave the state unchanged on failure.
      },
    });
  }

  /**
   * Marks a notification as read when its link is opened (if still unread).
   *
   * @param notification - The notification whose link was followed.
   */
  markReadOnLink(notification: AppNotification): void {
    if (notification.isRead) {
      return;
    }
    this._notificationService
      .markRead(notification.id)
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: () => {
          notification.isRead = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        },
        error: () => {
          // Leave as unread on failure.
        },
      });
  }

  /**
   * Marks every loaded notification as read.
   */
  markAllRead(): void {
    this._notificationService
      .markAllRead()
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.map(notification => ({
            ...notification,
            isRead: true,
          }));
          this.unreadCount = 0;
        },
        error: () => {
          // No-op on failure.
        },
      });
  }

  /**
   * Deletes one notification from the inbox, without asking.
   *
   * A notification is a notice, not a record: a wrong tap loses one message
   * whose subject is still on the page it pointed at. The page is read again
   * afterwards so the paging, the counts and the unread badge all come from
   * the server rather than from arithmetic here; a page emptied by the
   * deletion turns back one.
   *
   * @param notification - The notification to delete.
   * @param event - The originating click, stopped so the card does not also act.
   */
  remove(notification: AppNotification, event: Event): void {
    event.stopPropagation();

    this._notificationService
      .dismiss(notification.id)
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: () => this.reloadAfterRemoval(1),
        error: () => {
          // Leave the list unchanged on failure.
        },
      });
  }

  /**
   * Deletes every read notification from the inbox, once confirmed.
   *
   * Acts on many at once, so it asks first, as the site's other bulk
   * deletions do.
   */
  deleteAllRead(): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: {
        title: 'Delete all read notifications',
        message: `
          <p>Delete every notification you have read? Unread ones stay.</p>
          <p><strong>WARNING:</strong> This cannot be undone.</p>`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(confirmed => {
        if (!confirmed) {
          return;
        }

        this._notificationService
          .dismissAllRead()
          .pipe(observeInZone(this._ngZone, this._cdr))
          .subscribe({
            next: () => this.loadPage(1),
            error: () => {
              // Leave the list unchanged on failure.
            },
          });
      });
  }

  /**
   * Reads the inbox again after notifications were deleted.
   *
   * @param removed - How many of the current page's items went.
   */
  private reloadAfterRemoval(removed: number): void {
    const emptied = this.notifications.length <= removed;

    this.loadPage(emptied && this.page > 1 ? this.page - 1 : this.page);
    this._notificationService
      .refreshUnreadCount()
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({ error: () => undefined });
  }

  /**
   * Returns the LCARS colour class and icon for a notification's severity.
   *
   * @param notification - The notification.
   * @returns The severity visual treatment.
   */
  severityMeta(notification: AppNotification): SeverityMeta {
    return (
      SEVERITY_META[notification.severity] ??
      SEVERITY_META[NotificationSeverity.INFO]
    );
  }

  /**
   * Determines whether a link points to a different origin than the app.
   *
   * @param url - The link URL (absolute or relative).
   * @returns `true` when the link leaves the current origin.
   */
  isExternalLink(url: string | null): boolean {
    if (!url) {
      return false;
    }
    try {
      const origin = globalThis.location.origin;
      return new URL(url, origin).origin !== origin;
    } catch {
      return false;
    }
  }

  /**
   * Converts a same-origin link into an app-relative path for SPA routing.
   *
   * @param url - The internal link URL (absolute same-origin or relative).
   * @returns The path (with query/hash) suitable for `routerLink`.
   */
  internalPath(url: string): string {
    try {
      const origin = globalThis.location.origin;
      const parsed = new URL(url, origin);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return url;
    }
  }
}
