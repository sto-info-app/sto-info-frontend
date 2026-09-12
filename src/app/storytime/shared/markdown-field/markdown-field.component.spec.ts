import { Component, ViewChild } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ContentPreviewService } from '../../content-preview.service';
import {
  MarkdownFieldComponent,
  PREVIEW_TIMEOUT_MS,
} from './markdown-field.component';

/**
 * An editor's form for the field to reach into.
 *
 * The control belongs to the editor rather than to the field, so a host is the
 * only honest way to render it.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MarkdownFieldComponent],
  template: `<form [formGroup]="form">
    <app-storytime-markdown-field
      fieldId="chapter-content"
      label="Chapter"
      controlName="contentSource"
      colour="perano"
      previewClass="storytime-chapter__body"
      [rows]="24">
      A Chapter needs some content before it can be published.
    </app-storytime-markdown-field>
  </form>`,
})
class HostComponent {
  @ViewChild(MarkdownFieldComponent) field!: MarkdownFieldComponent;

  form: FormGroup = new FormBuilder().group({
    contentSource: [''],
  });
}

describe('MarkdownFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let previewService: { render: jest.Mock };

  const RENDERED = '<h2 id="b1">Landfall</h2>\n<p id="b2">She went first.</p>';

  /**
   * Renders the host with whatever the creator has written.
   *
   * @param contentSource - The writing in the field.
   * @returns The rendered element.
   */
  const render = (contentSource = ''): HTMLElement => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.form.setValue({ contentSource });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Finds a tab by its label.
   *
   * @param element - The rendered element.
   * @param label - The words on the tab.
   * @returns The tab.
   */
  const tab = (element: HTMLElement, label: string): HTMLButtonElement =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('.lcars-tab')).find(
      candidate => candidate.textContent?.trim() === label,
    ) as HTMLButtonElement;

  /**
   * Clicks a tab and lets the view settle.
   *
   * @param element - The rendered element.
   * @param label - The words on the tab.
   */
  const click = (element: HTMLElement, label: string): void => {
    tab(element, label).click();
    fixture.detectChanges();
  };

  /**
   * Finds a button by the words on it.
   *
   * @param element - The rendered element.
   * @param label - The button's text.
   * @returns The button.
   */
  const button = (element: HTMLElement, label: string): HTMLButtonElement =>
    Array.from(element.querySelectorAll('button')).find(
      candidate => candidate.textContent?.trim() === label,
    ) as HTMLButtonElement;

  /**
   * One of the two panels.
   *
   * @param element - The rendered element.
   * @param which - 'edit' or 'preview'.
   * @returns The panel.
   */
  const panel = (element: HTMLElement, which: string): HTMLElement =>
    element.querySelector(`#chapter-content-${which}-panel`) as HTMLElement;

  beforeEach(() => {
    previewService = { render: jest.fn().mockReturnValue(of(RENDERED)) };

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: ContentPreviewService, useValue: previewService }],
    });
  });

  it('is created', () => {
    render();
    expect(fixture.componentInstance.field).toBeTruthy();
  });

  describe('the field itself', () => {
    it('binds the textarea to the editor own control', () => {
      const element = render('The Enterprise broke orbit.');
      const textarea = element.querySelector(
        '#chapter-content',
      ) as HTMLTextAreaElement;

      expect(textarea.value).toBe('The Enterprise broke orbit.');
      expect(textarea.rows).toBe(24);
    });

    it('labels the textarea with the name of the field', () => {
      const element = render();
      const label = element.querySelector('label') as HTMLLabelElement;

      expect(label.getAttribute('for')).toBe('chapter-content');
      expect(label.textContent?.trim()).toBe('Chapter');
    });

    it('dresses the container in the colour it was given', () => {
      const element = render();

      expect(
        element.querySelector('.lcars-input-container')?.classList,
      ).toContain('perano');
    });

    // The sentence a particular field adds to the shared note.
    it('keeps whatever the editor projected into the note', () => {
      const element = render();

      expect(element.textContent).toContain(
        'A Chapter needs some content before it can be published.',
      );
    });

    it('offers the Markdown reference beside the writing', () => {
      const element = render();

      expect(element.querySelector('app-storytime-markdown-hint')).toBeTruthy();
    });
  });

  describe('the tab strip', () => {
    it('opens on the writing, not the preview', () => {
      const element = render('Something written.');

      expect(tab(element, 'Edit').getAttribute('aria-selected')).toBe('true');
      expect(tab(element, 'Preview').getAttribute('aria-selected')).toBe(
        'false',
      );
      expect(panel(element, 'edit').hidden).toBe(false);
      expect(panel(element, 'preview').hidden).toBe(true);
      expect(previewService.render).not.toHaveBeenCalled();
    });

    // Naming the strip after the modes alone would tell a screen reader nothing
    // about which field on the page it had reached.
    it('names the strip after the field', () => {
      const element = render();

      expect(
        element.querySelector('[role="tablist"]')?.getAttribute('aria-label'),
      ).toBe('Chapter: writing and preview');
    });

    // Built from the field's own identifier, so two of these on a page never
    // claim the same one.
    it('ties each tab to the panel it opens', () => {
      const element = render();

      expect(tab(element, 'Edit').getAttribute('aria-controls')).toBe(
        'chapter-content-edit-panel',
      );
      expect(tab(element, 'Preview').getAttribute('aria-controls')).toBe(
        'chapter-content-preview-panel',
      );
      expect(panel(element, 'edit').getAttribute('aria-labelledby')).toBe(
        'chapter-content-edit-tab',
      );
      expect(panel(element, 'preview').getAttribute('aria-labelledby')).toBe(
        'chapter-content-preview-tab',
      );
    });

    // The strip is one stop in the tab order, not one per tab: the arrows move
    // between them and focus follows.
    it('is a single stop in the tab order', () => {
      const element = render();

      expect(tab(element, 'Edit').getAttribute('tabindex')).toBe('0');
      expect(tab(element, 'Preview').getAttribute('tabindex')).toBe('-1');
    });

    it.each([['ArrowRight'], ['ArrowLeft'], ['End']])(
      'moves to the preview on %s, and focus with it',
      key => {
        const element = render('Something written.');

        tab(element, 'Edit').dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true }),
        );
        fixture.detectChanges();

        expect(fixture.componentInstance.field.activeTab).toBe('preview');
        expect(document.activeElement).toBe(tab(element, 'Preview'));
      },
    );

    it('leaves the tabs alone on a key that means nothing here', () => {
      const element = render('Something written.');

      tab(element, 'Edit').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      fixture.detectChanges();

      expect(fixture.componentInstance.field.activeTab).toBe('edit');
      expect(previewService.render).not.toHaveBeenCalled();
    });

    it('closes the strip with an end cap', () => {
      const element = render();

      expect(element.querySelector('.lcars-tabs-filler')).toBeTruthy();
    });

    // Hidden rather than removed: taking the textarea out of the page would
    // discard the caret, the scroll position and every undo step behind it.
    it('keeps the textarea in the page while the preview shows', () => {
      const element = render('Something written.');

      click(element, 'Preview');

      expect(element.querySelector('#chapter-content')).toBeTruthy();
      expect(panel(element, 'edit').hidden).toBe(true);
      expect(panel(element, 'preview').hidden).toBe(false);
    });
  });

  describe('rendering the preview', () => {
    it('renders the writing the server returns', () => {
      const element = render('# Landfall\n\nShe went first.');

      click(element, 'Preview');

      expect(previewService.render).toHaveBeenCalledWith(
        '# Landfall\n\nShe went first.',
      );
      expect(panel(element, 'preview').querySelector('h2')?.textContent).toBe(
        'Landfall',
      );
    });

    // Borrowed from the reader so the preview is a likeness rather than an
    // approximation of one.
    it('puts the rendering in the class the published page uses', () => {
      const element = render('Something written.');

      click(element, 'Preview');

      expect(
        element.querySelector('.storytime-markdown-field__preview')?.classList,
      ).toContain('storytime-chapter__body');
    });

    // A render costs a request against the general write allowance, so the
    // answer is kept against the text that produced it.
    it('does not ask again when nothing has been typed', () => {
      const element = render('Something written.');

      click(element, 'Preview');
      click(element, 'Edit');
      click(element, 'Preview');

      expect(previewService.render).toHaveBeenCalledTimes(1);
    });

    it('asks again once the writing has changed', () => {
      const element = render('Something written.');

      click(element, 'Preview');
      fixture.componentInstance.form.setValue({
        contentSource: 'Something else written.',
      });
      click(element, 'Edit');
      click(element, 'Preview');

      expect(previewService.render).toHaveBeenCalledTimes(2);
      expect(previewService.render).toHaveBeenLastCalledWith(
        'Something else written.',
      );
    });

    it('does not ask twice while a render is still in flight', () => {
      previewService.render.mockReturnValue(new Subject<string>());
      const element = render('Something written.');

      click(element, 'Preview');
      click(element, 'Edit');
      click(element, 'Preview');

      expect(previewService.render).toHaveBeenCalledTimes(1);
    });

    it('says it is working while the render is in flight', () => {
      const answer = new Subject<string>();
      previewService.render.mockReturnValue(answer);
      const element = render('Something written.');

      click(element, 'Preview');

      expect(panel(element, 'preview').getAttribute('aria-busy')).toBe('true');
      expect(panel(element, 'preview').textContent).toContain('Rendering');

      answer.next(RENDERED);
      answer.complete();
      fixture.detectChanges();

      expect(panel(element, 'preview').getAttribute('aria-busy')).toBe('false');
      expect(panel(element, 'preview').querySelector('h2')).toBeTruthy();
    });
  });

  describe('an empty field', () => {
    // Nothing to render, and asking would spend an allowance on an empty
    // paragraph.
    it('says so without asking the server', () => {
      const element = render('   ');

      click(element, 'Preview');

      expect(previewService.render).not.toHaveBeenCalled();
      expect(panel(element, 'preview').textContent).toContain(
        'There is nothing written here yet.',
      );
    });

    it('drops a rendering once the writing it came from is cleared', () => {
      const element = render('Something written.');

      click(element, 'Preview');
      expect(panel(element, 'preview').querySelector('h2')).toBeTruthy();

      fixture.componentInstance.form.setValue({ contentSource: '' });
      click(element, 'Edit');
      click(element, 'Preview');

      expect(panel(element, 'preview').querySelector('h2')).toBeNull();
      expect(previewService.render).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the render fails', () => {
    beforeEach(() => {
      previewService.render.mockReturnValue(
        throwError(() => new Error('network')),
      );
    });

    // The writing is untouched by a failed preview, and saying so is the first
    // thing somebody who has spent an hour on it wants to know.
    it('says the writing is unaffected, without naming the failure', () => {
      const element = render('Something written.');

      click(element, 'Preview');
      const text = panel(element, 'preview').textContent ?? '';

      expect(text).toContain('Preview unavailable');
      expect(text).toContain('Nothing you have written is affected');
      expect(text).not.toContain('network');
    });

    it('shows no stale rendering alongside the failure', () => {
      const element = render('Something written.');

      click(element, 'Preview');

      expect(
        element.querySelector('.storytime-markdown-field__preview'),
      ).toBeNull();
    });

    it('tries again on the next switch into the preview', () => {
      const element = render('Something written.');

      click(element, 'Preview');
      click(element, 'Edit');
      previewService.render.mockReturnValue(of(RENDERED));
      click(element, 'Preview');

      expect(previewService.render).toHaveBeenCalledTimes(2);
      expect(panel(element, 'preview').querySelector('h2')).toBeTruthy();
    });

    it('clears the failure once a render succeeds', () => {
      const element = render('Something written.');

      click(element, 'Preview');
      click(element, 'Edit');
      previewService.render.mockReturnValue(of(RENDERED));
      click(element, 'Preview');

      expect(panel(element, 'preview').textContent).not.toContain(
        'Preview unavailable',
      );
    });
  });

  // A request the server never answers — a backend restarted mid-flight, a
  // token refresh stalled behind it. Before the timeout this left the field
  // showing "Rendering…" for the rest of the session: nothing cleared the
  // in-flight flag, and every later press was turned away as a duplicate.
  describe('when a render never comes back', () => {
    /** An observable that never emits, errors or completes. */
    const neverAnswers = (): Observable<string> =>
      new Observable<string>(() => undefined);

    it('gives up rather than showing the spinner for ever', fakeAsync(() => {
      previewService.render.mockReturnValue(neverAnswers());
      const element = render('Something written.');

      click(element, 'Preview');
      expect(panel(element, 'preview').textContent).toContain('Rendering');

      tick(PREVIEW_TIMEOUT_MS);
      fixture.detectChanges();

      expect(fixture.componentInstance.field.isRendering).toBe(false);
      expect(panel(element, 'preview').textContent).toContain(
        'Preview unavailable',
      );
    }));

    it('waits the whole allowance before giving up', fakeAsync(() => {
      previewService.render.mockReturnValue(neverAnswers());
      const element = render('Something written.');

      click(element, 'Preview');
      tick(PREVIEW_TIMEOUT_MS - 1);
      fixture.detectChanges();

      expect(panel(element, 'preview').textContent).toContain('Rendering');

      tick(1);
      fixture.detectChanges();
      expect(panel(element, 'preview').textContent).toContain(
        'Preview unavailable',
      );
    }));

    // The tabs alone would do it, but that is two unobvious presses at the one
    // moment the field has already let somebody down.
    it('offers a way to ask again, and works afterwards', fakeAsync(() => {
      previewService.render.mockReturnValue(neverAnswers());
      const element = render('Something written.');

      click(element, 'Preview');
      tick(PREVIEW_TIMEOUT_MS);
      fixture.detectChanges();

      previewService.render.mockReturnValue(of(RENDERED));
      button(element, 'Try again').click();
      fixture.detectChanges();

      expect(panel(element, 'preview').querySelector('h2')).toBeTruthy();
      expect(panel(element, 'preview').textContent).not.toContain(
        'Preview unavailable',
      );
    }));

    // A hung request must not wedge the field: asking for different writing
    // has to replace it rather than be turned away behind it.
    it('is replaced by a request for different writing', fakeAsync(() => {
      previewService.render.mockReturnValue(neverAnswers());
      const element = render('Something written.');

      click(element, 'Preview');
      previewService.render.mockReturnValue(of(RENDERED));
      fixture.componentInstance.form.setValue({
        contentSource: 'Something else.',
      });
      click(element, 'Edit');
      click(element, 'Preview');

      expect(panel(element, 'preview').querySelector('h2')).toBeTruthy();
      expect(previewService.render).toHaveBeenLastCalledWith('Something else.');
    }));
  });

  // The answer to a request the writing has moved on from is the wrong answer.
  // It used to be shown anyway, because the newer press was refused while the
  // older request was still out.
  describe('when the writing changes mid-request', () => {
    it('shows the current writing, never the superseded answer', () => {
      const first = new Subject<string>();
      const second = new Subject<string>();
      previewService.render
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);

      const element = render('The first draft.');

      click(element, 'Preview');
      click(element, 'Edit');
      fixture.componentInstance.form.setValue({
        contentSource: 'The second draft.',
      });
      click(element, 'Preview');

      // The abandoned request answers late.
      first.next('<h2>The first draft</h2>');
      first.complete();
      fixture.detectChanges();

      expect(panel(element, 'preview').textContent).not.toContain(
        'The first draft',
      );
      expect(panel(element, 'preview').textContent).toContain('Rendering');

      second.next(RENDERED);
      second.complete();
      fixture.detectChanges();

      expect(panel(element, 'preview').querySelector('h2')?.textContent).toBe(
        'Landfall',
      );
      expect(previewService.render).toHaveBeenLastCalledWith(
        'The second draft.',
      );
    });

    it('calls off a request when the writing is emptied', () => {
      const answer = new Subject<string>();
      previewService.render.mockReturnValue(answer);
      const element = render('Something written.');

      click(element, 'Preview');
      expect(answer.observed).toBe(true);

      fixture.componentInstance.form.setValue({ contentSource: '' });
      click(element, 'Edit');
      click(element, 'Preview');

      expect(answer.observed).toBe(false);
      expect(panel(element, 'preview').textContent).toContain(
        'There is nothing written here yet.',
      );
    });
  });

  // The field is handed a control name rather than a control, so it has to cope
  // with a form that does not hold one — a template typo, or a control added
  // after the first render.
  it('treats a control it cannot find as empty', () => {
    const element = render('Something written.');
    fixture.componentInstance.field.controlName = 'notAControl';

    click(element, 'Preview');

    expect(previewService.render).not.toHaveBeenCalled();
    expect(panel(element, 'preview').textContent).toContain(
      'There is nothing written here yet.',
    );
  });
});
