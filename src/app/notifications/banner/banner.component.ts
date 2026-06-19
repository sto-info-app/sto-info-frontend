import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Banner } from 'src/app/models/notification.models';
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
export class BannerComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);

  banners: Banner[] = [];

  /**
   * Loads active banners and filters out any the user already dismissed.
   */
  ngOnInit(): void {
    this.notificationService.getActiveBanners().subscribe({
      next: banners => {
        const dismissed = this.getDismissedIds();
        this.banners = banners.filter(banner => !dismissed.includes(banner.id));
      },
      error: () => {
        // Banners are non-critical; fail silently.
        this.banners = [];
      },
    });
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
   * CSS modifier class for a banner severity.
   *
   * @param banner - The banner.
   * @returns The severity-specific class name.
   */
  severityClass(banner: Banner): string {
    return `banner--${banner.severity.toLowerCase()}`;
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
