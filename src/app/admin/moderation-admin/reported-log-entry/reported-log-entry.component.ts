import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, take } from 'rxjs';

import { AdminReasonPrompt } from 'src/app/admin/admin-reason-prompt';
import { LOG_TYPE_LABELS } from 'src/app/dashboard/captains-log/captains-log.constants';
import { CaptainsLogService } from 'src/app/dashboard/captains-log/captains-log.service';
import { LogEntryCardComponent } from 'src/app/dashboard/captains-log/log-entry-card/log-entry-card.component';
import { AdminLogEntry } from 'src/app/models/captains-log.models';

/** What to say when the entry could not be read. */
export const REPORTED_ENTRY_LOAD_FAILED =
  'The reported entry could not be loaded. Its author may have deleted it.';

/** What to say when the entry could not be removed. */
export const REPORTED_ENTRY_REMOVE_FAILED =
  'The entry could not be removed. Please try again.';

/**
 * The Captain's Log entry a user report names (sc-1450), as a site admin
 * sees it, with the way to remove it from its author's profile.
 */
@Component({
  selector: 'app-reported-log-entry',
  templateUrl: './reported-log-entry.component.html',
  styleUrls: ['./reported-log-entry.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogEntryCardComponent],
})
export class ReportedLogEntryComponent implements OnInit {
  private readonly _log = inject(CaptainsLogService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _reasons = new AdminReasonPrompt();

  /** The entry the report names. */
  readonly entryId = input.required<string>();

  readonly typeLabels = LOG_TYPE_LABELS;
  readonly entry = signal<AdminLogEntry | null>(null);
  readonly errorMessage = signal('');

  /**
   * Reads the entry.
   */
  ngOnInit(): void {
    this._log
      .getForAdmin(this.entryId())
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: entry => this.entry.set(entry),
        error: () => this.errorMessage.set(REPORTED_ENTRY_LOAD_FAILED),
      });
  }

  /**
   * Removes the entry from its author's profile, once a reason is given.
   *
   * @param entry - The entry.
   */
  remove(entry: AdminLogEntry): void {
    this.errorMessage.set('');
    this._reasons
      .ask({
        title: 'Remove this entry?',
        message:
          `Remove “${entry.headline}” from its author’s profile? It stays ` +
          'with them, marked as removed, and they are told your reason.',
        confirmText: 'Remove entry',
        confirmTone: 'refuse',
      })
      .pipe(
        switchMap(reason => this._log.removeForAdmin(entry.id, reason)),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: removed => this.entry.set(removed),
        error: () => this.errorMessage.set(REPORTED_ENTRY_REMOVE_FAILED),
      });
  }
}
