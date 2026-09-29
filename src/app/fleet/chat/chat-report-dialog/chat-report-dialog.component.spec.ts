import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ReportReason } from 'src/app/models/moderation.models';

import { ChatReportDialogComponent } from './chat-report-dialog.component';

describe('ChatReportDialogComponent', () => {
  let close: jest.Mock;
  let element: HTMLElement;

  beforeEach(() => {
    close = jest.fn();
    TestBed.configureTestingModule({
      imports: [ChatReportDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { authorName: 'Kira' } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });

    const fixture = TestBed.createComponent(ChatReportDialogComponent);

    fixture.autoDetectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const reason = (): HTMLSelectElement =>
    element.querySelector('#chat-report-reason') as HTMLSelectElement;
  const details = (): HTMLTextAreaElement =>
    element.querySelector('#chat-report-details') as HTMLTextAreaElement;
  const send = (): HTMLButtonElement =>
    element.querySelector('button.green') as HTMLButtonElement;

  /**
   * Chooses a reason.
   *
   * @param value - The reason.
   */
  const choose = (value: ReportReason): void => {
    reason().value = value;
    reason().dispatchEvent(new Event('change'));
  };

  /**
   * Types the details.
   *
   * @param value - What to type.
   */
  const type = (value: string): void => {
    details().value = value;
    details().dispatchEvent(new Event('input'));
  };

  it('names whose message it is, and offers every reason', () => {
    expect(element.textContent).toContain('Kira');
    expect(reason().options).toHaveLength(Object.values(ReportReason).length);
    expect(reason().value).toBe(ReportReason.HARASSMENT);
  });

  it('sends a reason alone, the details being optional', () => {
    choose(ReportReason.SPAM);
    send().click();

    expect(close).toHaveBeenCalledWith({ reason: ReportReason.SPAM });
  });

  it('sends trimmed details with the reason', () => {
    type('  Said it twice  ');
    send().click();

    expect(close).toHaveBeenCalledWith({
      reason: ReportReason.HARASSMENT,
      details: 'Said it twice',
    });
  });

  it('needs details for "Something else"', () => {
    choose(ReportReason.OTHER);

    expect(send().disabled).toBe(true);
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(close).not.toHaveBeenCalled();
    expect(details().hasAttribute('required')).toBe(true);

    type('Explained');
    send().click();

    expect(close).toHaveBeenCalledWith({
      reason: ReportReason.OTHER,
      details: 'Explained',
    });
  });

  it('reports nothing on cancel', () => {
    (element.querySelector('button.red') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalledWith();
  });
});
