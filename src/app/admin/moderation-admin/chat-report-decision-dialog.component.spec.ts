import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ReportStatus } from 'src/app/models/moderation.models';

import { ChatReportDecisionDialogComponent } from './chat-report-decision-dialog.component';

describe('ChatReportDecisionDialogComponent', () => {
  let close: jest.Mock;

  /**
   * Opens the dialog for an outcome.
   *
   * @param status - The outcome.
   * @returns Its element.
   */
  const show = (
    status: ReportStatus.ACTIONED | ReportStatus.DISMISSED,
  ): HTMLElement => {
    close = jest.fn();
    TestBed.configureTestingModule({
      imports: [ChatReportDecisionDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { status, authorName: 'Kira' },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });

    const fixture = TestBed.createComponent(ChatReportDecisionDialogComponent);

    fixture.autoDetectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  it('resolves with a trimmed note', () => {
    const element = show(ReportStatus.ACTIONED);
    const note = element.querySelector(
      '#chat-report-note',
    ) as HTMLTextAreaElement;

    expect(element.textContent).toContain('Resolve report');
    expect(element.textContent).toContain('Kira’s message as actioned');

    note.value = '  Warned them  ';
    note.dispatchEvent(new Event('input'));
    (element.querySelector('button.green') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalledWith({
      status: ReportStatus.ACTIONED,
      note: 'Warned them',
    });
  });

  // FC-039: the note is the decision's reason in the site admin log.
  it('dismisses only with a note', () => {
    const element = show(ReportStatus.DISMISSED);
    const note = element.querySelector(
      '#chat-report-note',
    ) as HTMLTextAreaElement;
    const dismiss = element.querySelector('button.green') as HTMLButtonElement;

    expect(element.textContent).toContain('with no action');
    expect(dismiss.disabled).toBe(true);

    note.value = '   ';
    note.dispatchEvent(new Event('input'));
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));

    expect(dismiss.disabled).toBe(true);
    expect(close).not.toHaveBeenCalled();

    note.value = 'Not harassment';
    note.dispatchEvent(new Event('input'));
    dismiss.click();

    expect(close).toHaveBeenCalledWith({
      status: ReportStatus.DISMISSED,
      note: 'Not harassment',
    });
  });

  it('decides nothing on cancel', () => {
    const element = show(ReportStatus.DISMISSED);

    (element.querySelector('button.red') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalledWith();
  });
});
