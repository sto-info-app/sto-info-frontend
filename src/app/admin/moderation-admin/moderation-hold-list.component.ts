import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

import {
  catchError,
  EMPTY,
  filter,
  Observable,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { chatAuthorName } from 'src/app/fleet/chat/chat.text';
import {
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import { ChatReportPlace } from 'src/app/models/fleet-chat.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import {
  HeldMessage,
  ModerationHold,
  ModerationHoldAdminService,
  ModerationHoldDetail,
} from './moderation-hold-admin.service';
import {
  ModerationHoldExtendDialogComponent,
  ModerationHoldExtendDialogData,
  ModerationHoldExtendDialogResult,
} from './moderation-hold-extend-dialog.component';

/** Which holds to list. */
export type HoldFilter = 'ACTIVE' | 'RELEASED' | 'ALL';

/** What each filter lists, as the server is asked. */
const FILTER_QUERY: Readonly<Record<HoldFilter, boolean | undefined>> = {
  ACTIVE: true,
  RELEASED: false,
  ALL: undefined,
};

/** What is being read of one hold, and why. */
interface Reading {
  readonly purpose: string;
  readonly messages: HeldMessage[];
  readonly before: string | null;
}

/** What each hold keeps, as a label. */
export const HOLD_KIND_LABELS: Readonly<Record<string, string>> = {
  CHAT_REPORT: 'A chat report’s evidence',
  MEMBER_MESSAGES: 'Everything a member wrote in chat',
};

/** What each log entry says was done. */
export const HOLD_ACTION_LABELS: Readonly<Record<string, string>> = {
  PLACED: 'Placed',
  EXTENDED: 'Extended',
  RELEASED: 'Released',
  READ: 'Read',
  REVIEW_DUE: 'Owner told the review is due',
  RELEASE_WARNED: 'Site admins told it will be released',
};

/**
 * The site admins' holds on chat evidence (FC-036).
 *
 * Steve's decisions of 29 September 2026: a hold keeps a chat report's
 * evidence past its 90 days, or everything one member wrote in chat past the
 * 45-day purge, with a reason, an owner and a review date at most 180 days
 * ahead. What it keeps is read here alone, each time with a purpose that is
 * logged; nobody else, scope moderators included, sees it. A hold passing
 * its review date is flagged, never released by itself.
 */
@Component({
  selector: 'app-moderation-hold-list',
  templateUrl: './moderation-hold-list.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './moderation-admin.component.scss',
  ],
  standalone: true,
  imports: [
    AppDatePipe,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
    LoadingBarComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationHoldListComponent {
  private readonly _holds = inject(ModerationHoldAdminService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  readonly appRoutes = APP_ROUTES;
  readonly kindLabels = HOLD_KIND_LABELS;
  readonly actionLabels = HOLD_ACTION_LABELS;
  readonly filters: readonly { value: HoldFilter; label: string }[] = [
    { value: 'ACTIVE', label: 'In force' },
    { value: 'RELEASED', label: 'Released' },
    { value: 'ALL', label: 'All holds' },
  ];

  readonly holds = signal<ModerationHold[]>([]);
  readonly filter = signal<HoldFilter>('ACTIVE');
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  /** Each hold's log, where shown, by ID. */
  readonly details = signal<ReadonlyMap<string, ModerationHoldDetail>>(
    new Map(),
  );
  /** What is being read of each hold, by ID. */
  readonly readings = signal<ReadonlyMap<string, Reading>>(new Map());

  constructor() {
    this.load();
  }

  /**
   * Lists other holds.
   *
   * @param value - The filter chosen.
   */
  protected setFilter(value: string): void {
    this.filter.set(value as HoldFilter);
    this.successMessage.set(null);
    this.load();
  }

  /**
   * Names somebody here.
   *
   * @param person - Who, if their account remains.
   * @returns Their username, or a stand-in.
   */
  protected nameOf(person: ModerationHold['subject']): string {
    return chatAuthorName(person);
  }

  /**
   * Where a kept message was.
   *
   * @param message - The message.
   * @returns The scope and channel, or who a conversation was with.
   */
  protected placeOf(message: HeldMessage): string {
    const place: ChatReportPlace = message.place;

    if (place.kind === 'DIRECT') {
      return message.with === null
        ? 'Direct message'
        : `Direct message with ${this.nameOf(message.with)}`;
    }

    const channel = `# ${place.channelName ?? 'a removed channel'}`;

    return place.scopeName === null
      ? channel
      : `${place.scopeName} · ${channel}`;
  }

  /**
   * Shows or hides a hold's log, reading it the first time.
   *
   * @param hold - The hold.
   */
  protected toggleLog(hold: ModerationHold): void {
    if (this.details().has(hold.id)) {
      this.details.update(details => without(details, hold.id));

      return;
    }

    this._holds
      .detail(hold.id)
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: detail => this.keepDetail(detail),
        error: () => this.errorMessage.set('That hold could not be read.'),
      });
  }

  /**
   * Asks why, then reads what a hold keeps, newest first.
   *
   * @param hold - The hold.
   */
  protected read(hold: ModerationHold): void {
    this.ask({
      title: 'Read what it keeps',
      message:
        'Say why you are reading it. Your purpose is logged with every page you read.',
      label: 'Purpose',
      confirmText: 'Read',
      min: 10,
      max: 500,
    })
      .pipe(
        switchMap(purpose =>
          this.readPage(hold, { purpose, messages: [], before: null }),
        ),
      )
      .subscribe();
  }

  /**
   * Reads the page before, with the purpose already given.
   *
   * @param hold - The hold.
   */
  protected readEarlier(hold: ModerationHold): void {
    const reading = this.readings().get(hold.id) as Reading;

    this.readPage(hold, reading).subscribe();
  }

  /**
   * Puts away what was read of a hold.
   *
   * @param hold - The hold.
   */
  protected closeReading(hold: ModerationHold): void {
    this.readings.update(readings => without(readings, hold.id));
  }

  /**
   * Moves a hold's review date, with a reason.
   *
   * @param hold - The hold.
   */
  protected extend(hold: ModerationHold): void {
    this._dialog
      .open<
        ModerationHoldExtendDialogComponent,
        ModerationHoldExtendDialogData,
        ModerationHoldExtendDialogResult
      >(ModerationHoldExtendDialogComponent, {
        data: { subject: this.nameOf(hold.subject), reviewAt: hold.reviewAt },
      })
      .afterClosed()
      .pipe(
        take(1),
        filter(
          (result): result is ModerationHoldExtendDialogResult =>
            result !== undefined,
        ),
      )
      .subscribe(({ reviewAt, reason }) =>
        this.run(
          this._holds.extend(hold.id, reviewAt, reason),
          'The hold’s review date has moved.',
          'That hold could not be extended.',
        ),
      );
  }

  /**
   * Releases a hold, with a reason. What it kept goes with the next purge.
   *
   * @param hold - The hold.
   */
  protected release(hold: ModerationHold): void {
    this.ask({
      title: 'Release hold',
      message:
        'What it kept is no longer kept: it goes with the next purge, as if it had never been held.',
      label: 'Reason',
      confirmText: 'Release',
      max: 500,
    }).subscribe(reason =>
      this.run(
        this._holds.release(hold.id, reason),
        'The hold is released.',
        'That hold could not be released.',
      ),
    );
  }

  /** Reads the holds the filter asks for. */
  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this._holds
      .list(FILTER_QUERY[this.filter()])
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: holds => {
          this.holds.set(holds);
          this.isLoading.set(false);
        },
        error: () => {
          this.holds.set([]);
          this.errorMessage.set('Holds could not be read.');
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Reads a page of what a hold keeps, adding it to what was read.
   *
   * @param hold - The hold.
   * @param reading - What was read so far, and why.
   * @returns The page, or nothing when it could not be read.
   */
  private readPage(
    hold: ModerationHold,
    reading: Reading,
  ): Observable<unknown> {
    this.errorMessage.set(null);

    return this._holds
      .read(hold.id, reading.purpose, reading.before ?? undefined)
      .pipe(
        take(1),
        tap(page =>
          this.readings.update(readings =>
            new Map(readings).set(hold.id, {
              purpose: reading.purpose,
              messages: [...reading.messages, ...page.messages],
              before: page.before,
            }),
          ),
        ),
        catchError(() => {
          this.errorMessage.set('What it keeps could not be read.');

          return EMPTY;
        }),
        takeUntilDestroyed(this._destroyRef),
      );
  }

  /**
   * Asks why.
   *
   * @param data - What to ask.
   * @returns The answer, once given.
   */
  private ask(data: GovernanceReasonDialogData): Observable<string> {
    return this._dialog
      .open<
        GovernanceReasonDialogComponent,
        GovernanceReasonDialogData,
        string
      >(GovernanceReasonDialogComponent, { data })
      .afterClosed()
      .pipe(
        take(1),
        filter((answer): answer is string => answer !== undefined),
      );
  }

  /**
   * Runs an action on a hold, keeps its log, and reads the list again.
   *
   * @param action - The request.
   * @param success - What to say when it works.
   * @param failure - What to say when it does not.
   */
  private run(
    action: Observable<ModerationHoldDetail>,
    success: string,
    failure: string,
  ): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    action.pipe(take(1), takeUntilDestroyed(this._destroyRef)).subscribe({
      next: detail => {
        this.keepDetail(detail);
        this.successMessage.set(success);
        this.load();
      },
      error: (error: { error?: { message?: string } }) =>
        this.errorMessage.set(error.error?.message ?? failure),
    });
  }

  /**
   * Keeps a hold's log to show.
   *
   * @param detail - The hold, read in full.
   */
  private keepDetail(detail: ModerationHoldDetail): void {
    this.details.update(details => new Map(details).set(detail.id, detail));
  }
}

/**
 * A map without one key.
 *
 * @param map - The map.
 * @param key - The key.
 * @returns A new map.
 */
function without<T>(
  map: ReadonlyMap<string, T>,
  key: string,
): ReadonlyMap<string, T> {
  const next = new Map(map);

  next.delete(key);

  return next;
}
