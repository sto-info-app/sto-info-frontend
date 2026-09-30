import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { take } from 'rxjs';

import {
  SECURITY_LOG_SOURCE_LABELS,
  SecurityLogEntry,
  SecurityLogPerson,
  SecurityLogSource,
  SITE_ADMIN_ACTION_LABELS,
} from 'src/app/models/security-log.models';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { HOLD_ACTION_LABELS } from '../moderation-admin/moderation-hold-list.component';
import { SecurityLogAdminService } from './security-log-admin.service';

/** What the erasure and investigation logs call their entries. */
const OTHER_ACTION_LABELS: Readonly<Record<string, string>> = {
  LOOKED_INTO_FLEET: 'Looked into a Fleet',
  ERASED: 'Erased roster data',
  REPLAYED: 'Replayed an erasure after a restore',
};

/**
 * Says a code in words: `ROLE_WITHDRAWN` as "Role withdrawn".
 *
 * @param code - The code.
 * @returns It, as a reader would say it.
 */
function inWords(code: string): string {
  const words = code.toLowerCase().replaceAll('_', ' ');

  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The site admins' Security Log (FC-039).
 *
 * Steve's decision of 29 September 2026: one feed, newest first and
 * filterable by source, of what site admins did and what the retention jobs
 * did — who, when, what, to whom or what, and why — read from the logs that
 * already hold each. Nothing in it is content: reasons and purposes are the
 * admins' own words, and details are codes, counts and IDs.
 */
@Component({
  selector: 'app-security-log',
  templateUrl: './security-log.component.html',
  styleUrls: ['../news-admin/news-admin.component.scss'],
  standalone: true,
  imports: [
    AppDatePipe,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityLogComponent {
  private readonly _log = inject(SecurityLogAdminService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly appRoutes = APP_ROUTES;
  readonly sources = Object.values(SecurityLogSource);
  readonly sourceLabels = SECURITY_LOG_SOURCE_LABELS;

  readonly entries = signal<SecurityLogEntry[]>([]);
  readonly total = signal(0);
  readonly pageSize = signal(50);
  readonly page = signal(1);
  readonly source = signal<SecurityLogSource | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  /** How many pages the log holds. */
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  constructor() {
    this.load();
  }

  /**
   * Shows one source only, or every one, from the first page.
   *
   * @param value - The source, or '' for every one.
   */
  protected filter(value: string): void {
    this.source.set(value === '' ? null : (value as SecurityLogSource));
    this.page.set(1);
    this.load();
  }

  /**
   * Moves to another page.
   *
   * @param step - One back or one on.
   */
  protected turn(step: -1 | 1): void {
    this.page.update(page => page + step);
    this.load();
  }

  /**
   * What an entry says was done.
   *
   * @param entry - The entry.
   * @returns It, in words.
   */
  protected actionOf(entry: SecurityLogEntry): string {
    switch (entry.source) {
      case SecurityLogSource.SITE_ADMIN:
        return SITE_ADMIN_ACTION_LABELS[entry.action] ?? inWords(entry.action);
      case SecurityLogSource.HOLD:
        return HOLD_ACTION_LABELS[entry.action] ?? inWords(entry.action);
      case SecurityLogSource.RETENTION:
        return `Retention: ${inWords(entry.action).toLowerCase()}`;
      default:
        return OTHER_ACTION_LABELS[entry.action] ?? inWords(entry.action);
    }
  }

  /**
   * Names who did it.
   *
   * @param entry - The entry.
   * @returns Their username, or what stands in for one.
   */
  protected actorOf(entry: SecurityLogEntry): string {
    return entry.actor === null
      ? entry.source === SecurityLogSource.SITE_ADMIN ||
        entry.source === SecurityLogSource.FLEET
        ? 'An account since closed'
        : 'The system'
      : this.nameOf(entry.actor);
  }

  /**
   * Names somebody an entry names.
   *
   * @param person - Them.
   * @returns Their username, or what stands in for one.
   */
  protected nameOf(person: SecurityLogPerson): string {
    return person.username ?? 'An account with no username';
  }

  /**
   * What it acted on, other than an account.
   *
   * @param entry - The entry.
   * @returns Its kind, in words, or null for none.
   */
  protected subjectOf(entry: SecurityLogEntry): string | null {
    return entry.subjectKind === null ? null : inWords(entry.subjectKind);
  }

  /**
   * An entry's detail, a line to each thing it records.
   *
   * @param entry - The entry.
   * @returns Each, as `name: value`.
   */
  protected detailOf(entry: SecurityLogEntry): string[] {
    return Object.entries(entry.detail ?? {})
      .filter(([, value]) => value !== null && value !== undefined)
      .map(
        ([name, value]) =>
          `${name}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`,
      );
  }

  /** Reads the page asked for. */
  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this._log
      .list(this.source(), this.page())
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: page => {
          this.entries.set(page.items);
          this.total.set(page.total);
          this.pageSize.set(page.pageSize);
          this.isLoading.set(false);
        },
        error: () => {
          this.entries.set([]);
          this.errorMessage.set('The log could not be read.');
          this.isLoading.set(false);
        },
      });
  }
}
