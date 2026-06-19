import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import {
  AppNotification,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { NotificationService } from '../notification.service';

const PAGE_SIZE = 15;
const LOAD_TIMEOUT_MS = 12000;

/** Visual treatment (LCARS colour class + Font Awesome icon) per severity. */
interface SeverityMeta {
  colourClass: string;
  icon: string;
  label: string;
}

const SEVERITY_META: Record<NotificationSeverity, SeverityMeta> = {
  [NotificationSeverity.INFO]: {
    colourClass: 'severity-info',
    icon: 'fa-circle-info',
    label: 'Info',
  },
  [NotificationSeverity.SUCCESS]: {
    colourClass: 'severity-success',
    icon: 'fa-circle-check',
    label: 'Success',
  },
  [NotificationSeverity.WARNING]: {
    colourClass: 'severity-warning',
    icon: 'fa-triangle-exclamation',
    label: 'Warning',
  },
  [NotificationSeverity.CRITICAL]: {
    colourClass: 'severity-critical',
    icon: 'fa-circle-exclamation',
    label: 'Critical',
  },
};

/**
 * Full-page, paginated list of the current user's inbox notifications.
 *
 * Replaces the former header dropdown: the header "incoming transmission" alert
 * routes here, and items can be read individually or all at once.
 */
@Component({
  selector: 'app-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class NotificationsPageComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

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

    this.notificationService
      .getInbox({ page, pageSize: PAGE_SIZE })
      .pipe(
        take(1),
        finalize(() => {
          clearTimeout(loadingTimeout);
          // `finalize` runs on success, error, AND unsubscribe, so the spinner
          // can never get stuck. Data is assigned in `next`/`error` (which can
          // never throw), and the single render happens here once the loading
          // state has already been cleared.
          this.stopLoading();
        }),
      )
      .subscribe({
        next: result => {
          this.notifications = result?.items ?? [];
          this.total = result?.total ?? 0;
          this.unreadCount = result?.unreadCount ?? 0;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 0
              ? 'Unable to reach the server. Please try again later.'
              : 'Something went wrong loading your notifications.';
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
    this.ngZone.run(() => {
      try {
        this.cdr.detectChanges();
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
      ? this.notificationService.markRead(notification.id)
      : this.notificationService.markUnread(notification.id);

    request.subscribe({
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
    this.notificationService.markRead(notification.id).subscribe({
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
    this.notificationService.markAllRead().subscribe({
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
    const origin = globalThis.location?.origin;
    if (!url || !origin) {
      return false;
    }
    try {
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
    const origin = globalThis.location?.origin;
    if (!origin) {
      return url;
    }
    try {
      const parsed = new URL(url, origin);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return url;
    }
  }
}
