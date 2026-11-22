import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, filter, take } from 'rxjs';

import {
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';

/** What a site admin is told before an action that asks them why. */
export interface AdminReasonRequest {
  /** The dialog's title. */
  title: string;

  /** What is about to happen. */
  message: string;

  /** The wording on the button that goes ahead. */
  confirmText: string;

  /**
   * Whether going ahead takes something away (`refuse`, a red button) or is
   * the plain yes of the question (`accept`, the default, green).
   */
  confirmTone?: NonNullable<GovernanceReasonDialogData['confirmTone']>;
}

/**
 * Asks a site admin why, before an action that is kept in the site admin log
 * with its reason (FC-039).
 *
 * Every such action asks the same way, with the same label and the same
 * limit on the reason's length, so the question is put in one place rather
 * than rebuilt by each page that needs it.
 *
 * Construct it in an injection context, as {@link ConfirmPrompt} is.
 */
export class AdminReasonPrompt {
  private readonly _dialog = inject(MatDialog);

  /**
   * Asks why.
   *
   * @param request - What the dialog should say.
   * @returns The reason, once, when one is given. Closing the dialog without
   *   one emits nothing.
   */
  ask(request: AdminReasonRequest): Observable<string> {
    return this._dialog
      .open<
        GovernanceReasonDialogComponent,
        GovernanceReasonDialogData,
        string
      >(GovernanceReasonDialogComponent, {
        width: '75%',
        data: { ...request, label: 'Reason', max: ADMIN_REASON_MAX_LENGTH },
      })
      .afterClosed()
      .pipe(
        take(1),
        filter((reason): reason is string => !!reason),
      );
  }
}
