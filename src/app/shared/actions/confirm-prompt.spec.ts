import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import { ConfirmPrompt, escapeHtml } from './confirm-prompt';

/**
 * A component of the kind the prompt exists for.
 *
 * A real component rather than a bare object, because the prompt takes the
 * component's own destroy, zone and change-detection references and there is
 * nowhere else a `ChangeDetectorRef` can come from.
 */
@Component({
  selector: 'app-confirm-prompt-host',
  standalone: true,
  template: '<p>host</p>',
})
class ConfirmPromptHostComponent {
  readonly prompt = new ConfirmPrompt();
}

describe('ConfirmPrompt', () => {
  let fixture: ComponentFixture<ConfirmPromptHostComponent>;
  let host: ConfirmPromptHostComponent;
  let dialog: { open: jest.Mock };

  /**
   * Arranges the dialog to close with the given answer.
   *
   * @param answer - What the reader chose, or undefined if they dismissed it.
   */
  const answerWith = (answer: boolean | undefined): void => {
    dialog.open.mockReturnValue({ afterClosed: () => of(answer) });
  };

  beforeEach(async () => {
    dialog = { open: jest.fn() };
    answerWith(true);

    await TestBed.configureTestingModule({
      imports: [ConfirmPromptHostComponent, NoopAnimationsModule],
      providers: [{ provide: MatDialog, useValue: dialog }],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmPromptHostComponent);
    host = fixture.componentInstance;
  });

  it('reports that the reader agreed', () => {
    let agreed: boolean | undefined;

    host.prompt.ask({ message: 'Sure?' }).subscribe(result => {
      agreed = result;
    });

    expect(agreed).toBe(true);
    expect(dialog.open).toHaveBeenCalledWith(ConfirmDialogComponent, {
      width: '75%',
      data: { message: 'Sure?' },
    });
  });

  it('reports that the reader refused', () => {
    answerWith(false);
    let agreed: boolean | undefined;

    host.prompt.ask({ message: 'Sure?' }).subscribe(result => {
      agreed = result;
    });

    expect(agreed).toBe(false);
  });

  // Clicking away from the dialog closes it with nothing, which is a refusal
  // rather than an answer nobody gave.
  it('treats a dismissed dialog as a refusal', () => {
    answerWith(undefined);
    let agreed: boolean | undefined;

    host.prompt.ask({ message: 'Sure?' }).subscribe(result => {
      agreed = result;
    });

    expect(agreed).toBe(false);
  });

  it('names the thing being destroyed, and what cannot be undone', () => {
    host.prompt
      .askToDestroy({
        title: 'Delete Story',
        question: 'Are you sure you want to delete this Story?',
        subject: 'Voyages of the Bellerophon',
        consequence: 'This cannot be undone.',
      })
      .subscribe();

    const { data } = dialog.open.mock.lastCall[1] as {
      data: { title: string; message: string; confirmText: string };
    };

    expect(data.title).toBe('Delete Story');
    expect(data.message).toBe(
      '<p>Are you sure you want to delete this Story?</p>' +
        '<p class="go-bluey">Voyages of the Bellerophon</p>' +
        '<p><strong>WARNING:</strong> This cannot be undone.</p>',
    );
    expect(data.confirmText).toBe('Delete');
  });

  it('leaves out the parts the caller did not give', () => {
    host.prompt
      .askToDestroy({ title: 'Remove', question: 'Remove it?' })
      .subscribe();

    const { data } = dialog.open.mock.lastCall[1] as {
      data: { message: string; cancelText: string };
    };

    expect(data.message).toBe('<p>Remove it?</p>');
    expect(data.cancelText).toBe('Cancel');
  });

  it('uses the wording the caller chose for the buttons', () => {
    host.prompt
      .askToDestroy({
        title: 'Remove',
        question: 'Remove it?',
        confirmText: 'Remove',
        cancelText: 'Keep it',
      })
      .subscribe();

    const { data } = dialog.open.mock.lastCall[1] as {
      data: { confirmText: string; cancelText: string };
    };

    expect(data.confirmText).toBe('Remove');
    expect(data.cancelText).toBe('Keep it');
  });

  // The message is rendered as markup, so a title somebody else chose must not
  // be able to change how the question reads.
  it('escapes what a person typed', () => {
    host.prompt
      .askToDestroy({
        title: 'Delete Story',
        question: 'Delete this?',
        subject: '<img src=x onerror="alert(1)"> & "friends"',
      })
      .subscribe();

    const { data } = dialog.open.mock.lastCall[1] as {
      data: { message: string };
    };

    expect(data.message).toContain(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &quot;friends&quot;',
    );
  });
});

describe('escapeHtml', () => {
  it('escapes every character that carries meaning in markup', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });

  it('leaves ordinary text alone', () => {
    expect(escapeHtml('Voyages of the Bellerophon')).toBe(
      'Voyages of the Bellerophon',
    );
  });
});
