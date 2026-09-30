import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

import { filter, switchMap, take } from 'rxjs';

import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import {
  RosterErasure,
  RosterErasureAdminService,
  RosterErasurePreview,
} from './roster-erasure-admin.service';

/** How long an erasure's reason must be, as the server allows. */
export const ROSTER_ERASURE_REASON_LIMITS = { min: 10, max: 500 } as const;

/**
 * The site admins' verified erasure of roster data (FC-038).
 *
 * Steve's decisions of 29 September 2026: a request arrives through Contact
 * us, and a site admin verifies the person off-site before erasing. Here the
 * admin names the Character and @handle, sees which Fleets' rosters name
 * them, gives a reason and confirms. Erasure anonymises every roster row and
 * alias, deletes every stored file naming them and keeps them out of every
 * future import; it cannot be undone. The list never names who was erased,
 * only the pseudonym that replaced them.
 *
 * After a database restore, "Replay the erasure ledger" makes again every
 * erasure the restore lost.
 */
@Component({
  selector: 'app-roster-erasure-list',
  templateUrl: './roster-erasure-list.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './moderation-admin.component.scss',
  ],
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
export class RosterErasureListComponent {
  private readonly _erasures = inject(RosterErasureAdminService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  readonly appRoutes = APP_ROUTES;
  readonly reasonLimits = ROSTER_ERASURE_REASON_LIMITS;

  readonly erasures = signal<RosterErasure[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly characterName = signal('');
  readonly accountHandle = signal('');
  readonly reason = signal('');
  readonly preview = signal<RosterErasurePreview | null>(null);
  readonly busy = signal(false);
  readonly refusal = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  /** Whether a name and handle have been given. */
  readonly hasTarget = computed(
    () =>
      this.characterName().length > 0 && this.accountHandle().trim().length > 0,
  );

  /** Whether the erasure may be asked for. */
  readonly mayErase = computed(() => {
    const preview = this.preview();
    const reason = this.reason().trim().length;

    return (
      !this.busy() &&
      preview !== null &&
      !preview.alreadyErased &&
      reason >= ROSTER_ERASURE_REASON_LIMITS.min &&
      reason <= ROSTER_ERASURE_REASON_LIMITS.max
    );
  });

  constructor() {
    this.load();
  }

  /**
   * Changes the name looked for, forgetting what was found.
   *
   * @param value - The name.
   */
  protected onName(value: string): void {
    this.characterName.set(value);
    this.preview.set(null);
  }

  /**
   * Changes the handle looked for, forgetting what was found.
   *
   * @param value - The handle.
   */
  protected onHandle(value: string): void {
    this.accountHandle.set(value);
    this.preview.set(null);
  }

  /** Finds which rosters name them. */
  protected onFind(): void {
    this.busy.set(true);
    this.refusal.set(null);
    this.notice.set(null);
    this._erasures
      .preview(this.target())
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: preview => {
          this.preview.set(preview);
          this.busy.set(false);
        },
        error: (error: unknown) => this.refused(error),
      });
  }

  /** Erases them, once confirmed. */
  protected onErase(): void {
    const preview = this.preview()!;

    this._dialog
      .open(ConfirmDialogComponent, {
        width: '75%',
        data: {
          title: 'Erase their roster data?',
          message:
            `Every roster row naming them — ${preview.rows} in ` +
            `${preview.fleets.length} Fleet(s) — becomes "Erased member", ` +
            'every stored file naming them is deleted, and future imports ' +
            'are scrubbed of them. This cannot be undone.',
          confirmText: 'Erase',
          cancelText: 'Cancel',
        },
      })
      .afterClosed()
      .pipe(
        take(1),
        filter(Boolean),
        switchMap(() => {
          this.busy.set(true);
          this.refusal.set(null);

          return this._erasures.erase({
            ...this.target(),
            reason: this.reason().trim(),
          });
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: done => {
          this.busy.set(false);
          this.characterName.set('');
          this.accountHandle.set('');
          this.reason.set('');
          this.preview.set(null);
          this.notice.set(
            `Erased as ${done.pseudonym}: ${done.observations} roster ` +
              `row(s) in ${done.fleets} Fleet(s) anonymised and ` +
              `${done.filesDeleted} file(s) deleted.` +
              (done.filesPending > 0
                ? ` ${done.filesPending} file(s) could not be deleted now; ` +
                  'tonight’s retention run deletes them.'
                : ''),
          );
          this.load();
        },
        error: (error: unknown) => this.refused(error),
      });
  }

  /** Makes again every erasure a restore lost, once confirmed. */
  protected onReplay(): void {
    this._dialog
      .open(ConfirmDialogComponent, {
        width: '75%',
        data: {
          title: 'Replay the erasure ledger?',
          message:
            'Run this after restoring the database from a backup. Every ' +
            'erasure made since that backup is made again from the ledger ' +
            'kept outside the database.',
          confirmText: 'Replay',
          cancelText: 'Cancel',
        },
      })
      .afterClosed()
      .pipe(
        take(1),
        filter(Boolean),
        switchMap(() => {
          this.busy.set(true);
          this.refusal.set(null);

          return this._erasures.replayLedger();
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: done => {
          this.busy.set(false);
          this.notice.set(
            `The ledger holds ${done.markers} erasure(s); ` +
              `${done.replayed} the database had lost were made again.`,
          );
          this.load();
        },
        error: (error: unknown) => this.refused(error),
      });
  }

  /**
   * The name and handle given.
   *
   * @returns Them.
   */
  private target(): { characterName: string; accountHandle: string } {
    return {
      characterName: this.characterName(),
      accountHandle: this.accountHandle().trim(),
    };
  }

  /**
   * Says why a request was refused.
   *
   * @param error - What came back.
   */
  private refused(error: unknown): void {
    const message =
      error instanceof HttpErrorResponse
        ? (error.error as { message?: unknown } | null)?.message
        : undefined;

    this.busy.set(false);
    this.refusal.set(
      typeof message === 'string'
        ? message
        : 'That could not be done. Please try again.',
    );
  }

  /** Reads the list. */
  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this._erasures
      .list()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: erasures => {
          this.erasures.set(erasures);
          this.isLoading.set(false);
        },
        error: () => {
          this.erasures.set([]);
          this.errorMessage.set('Erasures could not be read.');
          this.isLoading.set(false);
        },
      });
  }
}
