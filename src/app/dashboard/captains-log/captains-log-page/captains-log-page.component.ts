import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { catchError, filter, of, switchMap, take } from 'rxjs';

import { PrivacyModeService } from 'src/app/dashboard/services/privacy-mode.service';
import { LogEntry, LogEntryType } from 'src/app/models/captains-log.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsPaginationComponent } from 'src/app/shared/components/lcars-pagination/lcars-pagination.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from 'src/app/shared/constants/app-routing.constants';

import { LOG_PAGE_SIZE, LOG_TYPE_LABELS } from '../captains-log.constants';
import { CaptainsLogService } from '../captains-log.service';
import { LogEntryCardComponent } from '../log-entry-card/log-entry-card.component';

/** Which entries the Log is showing. */
export type LogFilter = 'ALL' | LogEntryType;

/** The choices of what to show, in order. */
export const LOG_FILTERS: readonly { value: LogFilter; label: string }[] = [
  { value: 'ALL', label: 'All entries' },
  { value: LogEntryType.CAPTAIN, label: "Captain's entries" },
  { value: LogEntryType.PERSONAL, label: 'Personal entries' },
];

/** What the warning says when privacy mode is on (sc-1450). */
export const LOG_PRIVACY_WARNING = {
  title: 'Privacy mode is on',
  message:
    "<p>Your Captain's Log shows your Personal entries, which only you " +
    'should see. Privacy mode does not hide them.</p>' +
    '<p>If you are streaming or sharing your screen, go back now.</p>',
  confirmText: 'Open the Log',
  cancelText: 'Back to the Dashboard',
};

/** What to say when the Log could not be read. */
export const LOG_LOAD_FAILED =
  "Your Captain's Log could not be loaded. Please try again.";

/** What to say when an entry could not be deleted. */
export const LOG_DELETE_FAILED =
  'The entry could not be deleted. Please try again.';

/**
 * A member's own Captain's Log (sc-1450): every entry they have written,
 * newest first. With privacy mode on, it asks before showing anything,
 * since Personal entries are shown here in full.
 */
@Component({
  selector: 'app-captains-log-page',
  templateUrl: './captains-log-page.component.html',
  styleUrls: ['./captains-log-page.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    CollapsibleSectionComponent,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LcarsPaginationComponent,
    LcarsWarningMessageComponent,
    LoadingBarComponent,
    LogEntryCardComponent,
  ],
})
export class CaptainsLogPageComponent implements OnInit {
  private readonly _log = inject(CaptainsLogService);
  private readonly _privacyMode = inject(PrivacyModeService);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  readonly title = APP_ROUTE_TITLES.STO_DASHBOARD_LOG;
  readonly newEntryLink = '/' + APP_ROUTES.STO_DASHBOARD_LOG_NEW;
  readonly filters = LOG_FILTERS;
  readonly typeLabels = LOG_TYPE_LABELS;

  /** Whether the member has been let in: at once, or after the warning. */
  readonly opened = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly entries = signal<LogEntry[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly shown = signal<LogFilter>('ALL');

  /** How many pages there are. */
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / LOG_PAGE_SIZE)),
  );

  /**
   * Reads the member's settings, warns when privacy mode is on, and opens
   * the Log once they agree. Settings that cannot be read count as privacy
   * mode on, so the warning is never skipped by mistake.
   */
  ngOnInit(): void {
    this._privacyMode
      .load()
      .pipe(
        take(1),
        catchError(() => of(null)),
        switchMap(() =>
          this._privacyMode.isEnabled()
            ? this._confirm.ask(LOG_PRIVACY_WARNING)
            : of(true),
        ),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(agreed => {
        if (!agreed) {
          this._router.navigate(['/' + APP_ROUTES.STO_DASHBOARD]);

          return;
        }

        this.opened.set(true);
        this.load();
      });
  }

  /**
   * Shows only one type of entry, or all of them, from the first page.
   *
   * @param shown - Which.
   */
  show(shown: LogFilter): void {
    this.shown.set(shown);
    this.page.set(1);
    this.load();
  }

  /**
   * Turns a page.
   *
   * @param step - Back one or on one.
   */
  turn(step: -1 | 1): void {
    this.page.update(page => page + step);
    this.load();
  }

  /**
   * The address of an entry's edit page.
   *
   * @param entry - The entry.
   * @returns It.
   */
  editLink(entry: LogEntry): string {
    return '/' + APP_ROUTES.STO_DASHBOARD_LOG_EDIT.replace(':id', entry.id);
  }

  /**
   * Deletes an entry for good, once asked.
   *
   * @param entry - The entry.
   */
  onDelete(entry: LogEntry): void {
    this.errorMessage.set('');
    this._confirm
      .askToDestroy({
        title: 'Delete this entry?',
        question: 'Delete this Log entry for good?',
        subject: entry.headline,
        consequence:
          'It cannot be recovered, and its picture is taken down with it.',
        confirmText: 'Delete',
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this._log.delete(entry.id)),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: () => this.load(),
        error: () => this.errorMessage.set(LOG_DELETE_FAILED),
      });
  }

  /**
   * Reads the page of entries being shown.
   */
  private load(): void {
    const shown = this.shown();

    this.isLoading.set(true);
    this.errorMessage.set('');
    this._log
      .list({
        page: this.page(),
        pageSize: LOG_PAGE_SIZE,
        ...(shown === 'ALL' ? {} : { type: shown }),
      })
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: page => {
          this.entries.set(page.items);
          this.total.set(page.total);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set(LOG_LOAD_FAILED);
          this.isLoading.set(false);
        },
      });
  }
}
