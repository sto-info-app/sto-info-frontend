import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { GovernanceReasonDialogComponent } from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';

import { AdminReasonPrompt } from './admin-reason-prompt';

describe('AdminReasonPrompt', () => {
  let dialog: { open: jest.Mock };
  let prompt: AdminReasonPrompt;

  /**
   * Arranges the dialog to close with the given answer.
   *
   * @param answer - The reason given, or undefined if it was dismissed.
   */
  const answerWith = (answer: string | undefined): void => {
    dialog.open.mockReturnValue({ afterClosed: () => of(answer) });
  };

  beforeEach(() => {
    dialog = { open: jest.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: dialog }],
    });
    prompt = TestBed.runInInjectionContext(() => new AdminReasonPrompt());
  });

  it('asks with the reason label and the site admin log’s limit', () => {
    answerWith('Because.');

    prompt
      .ask({ title: 'Pause', message: 'It stops.', confirmText: 'Pause' })
      .subscribe();

    expect(dialog.open).toHaveBeenCalledWith(GovernanceReasonDialogComponent, {
      width: '75%',
      data: {
        title: 'Pause',
        message: 'It stops.',
        confirmText: 'Pause',
        label: 'Reason',
        max: ADMIN_REASON_MAX_LENGTH,
      },
    });
  });

  it('goes on with the reason once one is given', () => {
    answerWith('Because.');
    const reasons: string[] = [];

    prompt
      .ask({ title: 'Pause', message: 'It stops.', confirmText: 'Pause' })
      .subscribe(reason => reasons.push(reason));

    expect(reasons).toEqual(['Because.']);
  });

  it.each([undefined, ''])(
    'goes no further when the dialog closes with %p',
    answer => {
      answerWith(answer);
      const reasons: string[] = [];

      prompt
        .ask({ title: 'Pause', message: 'It stops.', confirmText: 'Pause' })
        .subscribe(reason => reasons.push(reason));

      expect(reasons).toEqual([]);
    },
  );
});
