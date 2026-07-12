import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  Banner,
  NotificationSeverity,
} from 'src/app/models/notification.models';
import {
  SEVERITY_META,
  SeverityMeta,
} from 'src/app/shared/constants/notifications.constants';
import { NotificationService } from '../notification.service';

const DISMISSED_STORAGE_KEY = 'dismissed_banners';

/**
 * Renders the currently active site-wide banners.
 *
 * Dismissals are remembered per browser via localStorage, keeping banners
 * global and cheap (no per-user server state required).
 */
@Component({
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class BannerComponent implements OnInit, OnDestroy {
  private readonly _notificationService = inject(NotificationService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  banners: Banner[] = [];
  private sub?: Subscription;

  /**
   * Subscribes to the shared, polled banners stream and filters out any the
   * user already dismissed, so newly published banners appear without a reload.
   *
   * The stream is wrapped in `ngZone.run()` with an explicit change detection
   * pass because async callbacks in this app do not reliably trigger change
   * detection, which would otherwise leave loaded banners unrendered.
   */
  ngOnInit(): void {
    this.sub = this._notificationService.banners$
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: banners => {
          const dismissed = this.getDismissedIds();
          this.banners = banners.filter(
            banner => !dismissed.includes(banner.id),
          );
        },
        error: () => {
          // Banners are non-critical; fail silently.
          this.banners = [];
        },
      });
  }

  /**
   * Tears down the banners subscription.
   */
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /**
   * Dismisses a banner and remembers the choice.
   *
   * @param banner - The banner to dismiss.
   */
  dismiss(banner: Banner): void {
    this.banners = this.banners.filter(item => item.id !== banner.id);
    const dismissed = this.getDismissedIds();
    if (!dismissed.includes(banner.id)) {
      dismissed.push(banner.id);
      this.persistDismissedIds(dismissed);
    }
  }

  /**
   * Returns the LCARS colour class, icon, and label for a banner's severity.
   *
   * Shared with the notification inbox so banners and inbox cards stay
   * visually identical.
   *
   * @param banner - The banner.
   * @returns The severity visual treatment.
   */
  severityMeta(banner: Banner): SeverityMeta {
    return (
      SEVERITY_META[banner.severity] ?? SEVERITY_META[NotificationSeverity.INFO]
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
   * Reads the dismissed banner IDs from localStorage.
   *
   * @returns The dismissed IDs (empty when none / unavailable).
   */
  private getDismissedIds(): string[] {
    try {
      const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Persists the dismissed banner IDs to localStorage.
   *
   * @param ids - The IDs to store.
   */
  private persistDismissedIds(ids: string[]): void {
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Ignore storage failures (e.g. private mode).
    }
  }
}
