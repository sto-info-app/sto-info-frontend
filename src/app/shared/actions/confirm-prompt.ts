import { ChangeDetectorRef, DestroyRef, NgZone, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map, take } from 'rxjs';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../components/confirm-dialog/confirm-dialog.component';
import { observeInZone } from '../rxjs/observe-in-zone.operator';

/** How wide the question is asked, matching the other prompts. */
const DIALOG_WIDTH = '75%';

/**
 * What a destructive action needs said before it is allowed to happen.
 *
 * Described in parts rather than handed over as markup, so a caller cannot
 * accidentally put a name somebody else chose into the dialog as HTML.
 */
export interface DestructiveConfirmation {
  /** What is about to happen, in the heading. */
  title: string;

  /** The question being asked, as a complete sentence. */
  question: string;

  /** The thing being acted on, quoted back so the reader can check it. */
  subject?: string;

  /** What the reader cannot undo, if they agree. */
  consequence?: string;

  /** The wording on the button that goes ahead. */
  confirmText?: string;

  /** The wording on the button that backs out. */
  cancelText?: string;
}

/**
 * Escapes text so it can be placed inside the dialog's message.
 *
 * The dialog renders its message with `innerHTML`, so that a warning can be
 * laid out over several paragraphs. Angular's sanitiser already removes
 * anything executable, but a title containing a stray angle bracket would
 * still come out mangled, so anything a person typed is escaped first.
 *
 * @param value - The text to escape.
 * @returns The text, safe to interpolate into markup.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Asks the reader to agree before something irreversible happens.
 *
 * Every destructive action asks the same shape of question: name the thing,
 * say what will happen to it, and offer a way out. Doing that in one place
 * keeps the wording and the behaviour from drifting apart between the many
 * places that need it, and means a caller describes the action rather than
 * builds a dialog.
 *
 * Construct it in an injection context, so it can take the component's own
 * destroy, zone and change detection references — the same arrangement as
 * {@link ManagedActionRunner}, which it is normally used alongside.
 */
export class ConfirmPrompt {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _dialog = inject(MatDialog);

  /**
   * Asks a plain question.
   *
   * @param data - What the dialog should say.
   * @returns Whether the reader agreed. Emits once, in the caller's zone.
   */
  ask(data: ConfirmDialogData): Observable<boolean> {
    return this._dialog
      .open(ConfirmDialogComponent, { width: DIALOG_WIDTH, data })
      .afterClosed()
      .pipe(
        take(1),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        // Dismissing the dialog by clicking away closes it with undefined,
        // which is a refusal rather than an answer nobody gave.
        map(confirmed => confirmed === true),
      );
  }

  /**
   * Asks before something is destroyed.
   *
   * @param confirmation - What is about to happen.
   * @returns Whether the reader agreed. Emits once, in the caller's zone.
   */
  askToDestroy(confirmation: DestructiveConfirmation): Observable<boolean> {
    const subject = confirmation.subject
      ? `<p class="go-bluey">${escapeHtml(confirmation.subject)}</p>`
      : '';

    const consequence = confirmation.consequence
      ? `<p><strong>WARNING:</strong> ${escapeHtml(confirmation.consequence)}</p>`
      : '';

    return this.ask({
      title: confirmation.title,
      message: `<p>${escapeHtml(confirmation.question)}</p>${subject}${consequence}`,
      confirmText: confirmation.confirmText ?? 'Delete',
      cancelText: confirmation.cancelText ?? 'Cancel',
    });
  }
}
