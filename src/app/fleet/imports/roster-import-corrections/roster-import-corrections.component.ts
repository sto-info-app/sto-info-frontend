import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Observable } from 'rxjs';

import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  RosterImportAction,
  RosterImportActionKind,
  RosterImportDetail,
  RosterImportStatus,
} from 'src/app/models/fleet-import.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import {
  availableTimezones,
  describeTimezone,
} from 'src/app/shared/utils/timezone.utils';
import { momentsOf } from 'src/app/shared/utils/zoned-day.utils';

/** What to say when a correction failed for a reason the server did not give. */
export const ROSTER_IMPORT_CORRECTION_FAILED =
  'That correction could not be made. Please try again.';

/** The most a reason may say, as the server allows. */
export const ROSTER_IMPORT_REASON_LIMIT = 500;

/** What each correction did, as its history says it. */
export const ROSTER_IMPORT_ACTION_VERBS: Readonly<
  Record<RosterImportActionKind, string>
> = {
  [RosterImportActionKind.EXCLUDED]: 'took it out of the history',
  [RosterImportActionKind.REINSTATED]: 'put it back into the history',
  [RosterImportActionKind.MARKED_PARTIAL]: 'marked it partial',
  [RosterImportActionKind.UNMARKED_PARTIAL]: 'marked it complete',
  [RosterImportActionKind.ROWS_EXCLUDED]: 'excluded rows',
  [RosterImportActionKind.ROWS_REINSTATED]: 'put rows back',
  [RosterImportActionKind.TIMEZONE_CORRECTED]: 'corrected its timezone',
  [RosterImportActionKind.CONFLICT_SELECTED]: 'selected it for its moment',
};

/** The statuses whose import can be corrected: in force, or held. */
const CORRECTABLE: readonly RosterImportStatus[] = [
  RosterImportStatus.IMPORTED,
  RosterImportStatus.HELD,
];

/** Which correction is under way. */
type Correction = 'EXCLUSION' | 'PARTIAL' | 'TIMEZONE';

/**
 * The corrections an investigator can make to a whole import, and every one
 * made (FC-019, FC-020).
 *
 * Each needs a reason, given once above them all, and each can be undone by
 * another, so none asks to be confirmed (Steve's decision of 25 September
 * 2026). An import can be taken out of the Fleet's history and put back,
 * said to list perhaps not everybody, or read again through the timezone it
 * was really taken in. Where the export's stamp names two moments in that
 * zone — the hour the clock went back over — the page works out both and
 * asks which, as the upload does. Choosing between exports of one moment is
 * the Conflicting exports page's, which this links to.
 *
 * Every correction is answered with the import as it now is, which is
 * passed up for the page to show; the Fleet's roster is replayed afterwards
 * on the server's own queue.
 */
@Component({
  selector: 'app-roster-import-corrections',
  templateUrl: './roster-import-corrections.component.html',
  styleUrls: ['./roster-import-corrections.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppDatePipe, LcarsErrorMessageComponent],
})
export class RosterImportCorrectionsComponent {
  private readonly _importService = inject(RosterImportService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly timezones = availableTimezones();
  readonly reasonLimit = ROSTER_IMPORT_REASON_LIMIT;
  readonly verbs = ROSTER_IMPORT_ACTION_VERBS;

  /** The Community holding the Fleet. */
  readonly communityId = input.required<string>();
  readonly fleetId = input.required<string>();
  /** The import, as an investigator sees it. */
  readonly detail = input.required<RosterImportDetail>();
  /** Where the Fleet's conflicting exports are chosen between. */
  readonly conflictsLink = input.required<string[]>();

  /** Tells the page the import changed, with the import as it now is. */
  readonly corrected = output<RosterImportDetail>();

  /** Why, given once for whichever correction is made. */
  readonly reason = signal('');

  /** The correction under way, if any. */
  readonly busy = signal<Correction | null>(null);

  /** What the last correction came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /** What the last correction came to, if it was recorded. */
  readonly notice = signal<string | null>(null);

  /** The zone picked for reading the export again; null until one is. */
  readonly pickedZone = signal<string | null>(null);

  /** Which of two moments the stamp names was picked, if any. */
  readonly pickedMoment = signal<string | null>(null);

  /** Whether the import is in force or held, as a correction needs. */
  readonly correctable = computed(() =>
    CORRECTABLE.includes(this.detail().status),
  );

  /** Whether a reason has been given. */
  readonly hasReason = computed(() => this.reason().trim() !== '');

  /** The zone the timezone control shows: picked, or the import's own. */
  readonly zone = computed(
    () => this.pickedZone() ?? this.detail().exportTimezone ?? '',
  );

  /** The instants the export's stamp names in that zone. */
  readonly moments = computed(() => {
    const stamp = this.detail().exportLocalStamp;

    return stamp === null || this.zone() === ''
      ? []
      : momentsOf(stamp, this.zone());
  });

  /** Whether the whole import may be taken out or put back now. */
  readonly canExclude = computed(
    () => this.busy() === null && this.correctable() && this.hasReason(),
  );

  /** Whether it may be marked partial or complete now. */
  readonly canMarkPartial = this.canExclude;

  /**
   * Whether it may be read through the zone picked now: another zone, in
   * which its stamp happened, with one moment picked where it names two.
   */
  readonly canCorrectZone = computed(() => {
    const moments = this.moments();

    return (
      this.canExclude() &&
      this.detail().conflictGroupId === null &&
      this.zone() !== (this.detail().exportTimezone ?? '') &&
      moments.length > 0 &&
      (moments.length === 1 || moments.includes(this.pickedMoment() ?? ''))
    );
  });

  /**
   * Names a zone, with its offset now.
   *
   * @param timezone - The IANA zone.
   * @returns Its label.
   */
  zoneLabel(timezone: string): string {
    return describeTimezone(timezone);
  }

  /**
   * Labels one of the two moments the stamp names, as the upload does: the
   * stamp is the same for both, so what tells them apart is the offset the
   * zone was on at each, and the instant it makes.
   *
   * @param moment - One of the moments.
   * @returns The label.
   */
  momentLabel(moment: string): string {
    return (
      `${this.detail().exportLocalStamp} ` +
      `${describeTimezone(this.zone(), new Date(moment))}, which is ${moment}`
    );
  }

  /**
   * Says what a correction changed, beyond what it did.
   *
   * @param action - The correction.
   * @returns The lines, or the zones, it changed; empty for the rest.
   */
  changeOf(action: RosterImportAction): string {
    const detail = action.detail;

    if (detail?.lines) {
      return `Line ${detail.lines.join(', ')}.`;
    }

    if (detail?.toTimezone) {
      return `From ${detail.fromTimezone ?? 'no zone'} to ${detail.toTimezone}.`;
    }

    return '';
  }

  /**
   * Picks the zone to read the export through again.
   *
   * @param timezone - The IANA zone.
   */
  onZone(timezone: string): void {
    this.pickedZone.set(timezone);
    this.pickedMoment.set(null);
  }

  /** Takes the import out of the history, or puts it back. */
  onExcluded(): void {
    const excluded = !this.detail().excluded;

    this.send(
      'EXCLUSION',
      (communityId, fleetId, importId, reason) =>
        this._importService.setExcluded(
          communityId,
          fleetId,
          importId,
          excluded,
          reason,
        ),
      excluded
        ? 'Taken out of the history. The roster is rebuilt without it.'
        : 'Put back into the history. The roster is rebuilt with it.',
    );
  }

  /** Marks the import partial, or complete. */
  onPartial(): void {
    const partial = !this.detail().partial;

    this.send(
      'PARTIAL',
      (communityId, fleetId, importId, reason) =>
        this._importService.setPartial(
          communityId,
          fleetId,
          importId,
          partial,
          reason,
        ),
      partial
        ? 'Marked partial: nobody missing from it is taken to have left.'
        : 'Marked complete: anybody missing from it is taken to have left.',
    );
  }

  /** Reads the export again through the zone picked. */
  onCorrectZone(): void {
    const timezone = this.zone();
    const moments = this.moments();
    const exportedAt = moments.length > 1 ? this.pickedMoment() : null;

    this.send(
      'TIMEZONE',
      (communityId, fleetId, importId, reason) =>
        this._importService.correctTimezone(
          communityId,
          fleetId,
          importId,
          timezone,
          exportedAt,
          reason,
        ),
      `Read again through ${timezone}. The roster is rebuilt to match.`,
    );
  }

  /**
   * Sends one correction, and says what it came to.
   *
   * @param correction - Which it is.
   * @param request - Sends it.
   * @param recorded - What to say once it is recorded.
   */
  private send(
    correction: Correction,
    request: (
      communityId: string,
      fleetId: string,
      importId: string,
      reason: string,
    ) => Observable<RosterImportDetail>,
    recorded: string,
  ): void {
    this.busy.set(correction);
    this.error.set(null);
    this.notice.set(null);
    request(
      this.communityId(),
      this.fleetId(),
      this.detail().id,
      this.reason().trim(),
    )
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: detail => {
          this.busy.set(null);
          this.reason.set('');
          this.pickedZone.set(null);
          this.pickedMoment.set(null);
          this.notice.set(recorded);
          this.corrected.emit(detail);
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(null);
          this.error.set(refusalOf(error));
        },
      });
  }
}

/**
 * Says why a correction was refused.
 *
 * @param error - The refusal.
 * @returns The server's own sentence for a correction it understood and
 *   would not make, and a general one otherwise.
 */
function refusalOf(error: HttpErrorResponse): string {
  const message: unknown = error.error?.message;

  return (error.status === HttpStatusCode.Conflict ||
    error.status === HttpStatusCode.BadRequest) &&
    typeof message === 'string'
    ? message
    : ROSTER_IMPORT_CORRECTION_FAILED;
}
