import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CanDeactivateFn } from '@angular/router';
import { Observable, map } from 'rxjs';

import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

/** A component that may be holding work nobody has saved. */
export interface HasUnsavedChanges {
  /**
   * Whether leaving now would lose something.
   *
   * @returns True while there is unsaved work.
   */
  hasUnsavedChanges(): boolean;
}

/**
 * Asks whether unsaved work may be thrown away.
 *
 * Shared between the route guard and the components that navigate within
 * themselves, so the question is worded the same however somebody is about to
 * leave. Two copies of it would eventually be two different warnings about the
 * same loss.
 *
 * @param dialog - The dialog service to ask through.
 * @returns An observable of whether to go ahead.
 */
export function confirmDiscard(dialog: MatDialog): Observable<boolean> {
  return dialog
    .open(ConfirmDialogComponent, {
      data: {
        title: 'Unsaved changes',
        message: `<p>You have changes here that have not been saved.</p>
          <p>Leaving now discards them. Nothing already saved is affected.</p>`,
        confirmText: 'Discard changes',
        cancelText: 'Stay here',
      },
    })
    .afterClosed()
    .pipe(map(confirmed => confirmed === true));
}

/**
 * Stops a route change from quietly throwing away unsaved work.
 *
 * A form somebody has half-filled is work, and a stray click on a navigation
 * link should not be able to lose it without a word. The component decides
 * whether there is anything to lose; this decides what to do about it.
 *
 * @param component - The component being left.
 * @returns True to leave, or an observable of the user's answer.
 */
export const unsavedChangesGuard: CanDeactivateFn<
  HasUnsavedChanges
> = component =>
  component.hasUnsavedChanges() ? confirmDiscard(inject(MatDialog)) : true;
