import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ChatRemoveDialogComponent } from './chat-remove-dialog.component';

describe('ChatRemoveDialogComponent', () => {
  let close: jest.Mock;
  let element: HTMLElement;

  beforeEach(() => {
    close = jest.fn();
    TestBed.configureTestingModule({
      imports: [ChatRemoveDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { authorName: 'Kira' } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });

    const fixture = TestBed.createComponent(ChatRemoveDialogComponent);

    fixture.autoDetectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const reason = (): HTMLTextAreaElement =>
    element.querySelector('#chat-remove-reason') as HTMLTextAreaElement;

  it('needs a reason before removing', () => {
    const remove = element.querySelector('button.red') as HTMLButtonElement;

    expect(remove.disabled).toBe(true);
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(close).not.toHaveBeenCalled();

    reason().value = '  Off topic ';
    reason().dispatchEvent(new Event('input'));
    remove.click();

    expect(close).toHaveBeenCalledWith('Off topic');
  });

  it('keeps the message on cancel', () => {
    (element.querySelector('button.green') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalledWith();
  });
});
