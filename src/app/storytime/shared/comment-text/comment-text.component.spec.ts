import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommentTextComponent } from './comment-text.component';

/**
 * Holds the component the way the thread does, so a new body arrives through
 * a real binding rather than by poking the input.
 */
@Component({
  standalone: true,
  imports: [CommentTextComponent],
  template: '<app-storytime-comment-text [body]="body" />',
})
class HostComponent {
  body = 'I did not see ||the twist|| coming.';
}

describe('CommentTextComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  /**
   * Creates the host with a comment and renders it.
   *
   * @param body - What the comment says.
   * @returns The host's element.
   */
  const render = (body?: string): HTMLElement => {
    fixture = TestBed.createComponent(HostComponent);

    if (body !== undefined) {
      fixture.componentInstance.body = body;
    }

    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  /**
   * The paragraph the comment is shown in.
   *
   * @returns Its element.
   */
  const paragraph = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '.storytime-comments__text',
    ) as HTMLElement;

  /**
   * The spoiler buttons still waiting to be pressed.
   *
   * @returns Their elements.
   */
  const buttons = (): HTMLButtonElement[] =>
    Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLButtonElement>('button.storytime-spoiler'),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it('shows a comment without spoilers exactly as written', () => {
    render('A fine chapter.\nTruly.');

    expect(paragraph().textContent).toBe('A fine chapter.\nTruly.');
    expect(buttons()).toHaveLength(0);
  });

  it('keeps the spoiler off the page until it is revealed', () => {
    render();

    expect(paragraph().textContent).not.toContain('the twist');
    expect(paragraph().textContent).toBe('I did not see Spoiler coming.');
  });

  it('offers the spoiler as a button that says what it is to a screen reader', () => {
    render();

    const [button] = buttons();

    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe(
      'Spoiler, hidden. Press to reveal.',
    );
    expect(button.querySelector('i')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the same word however long the spoiler is', () => {
    render('||a|| and ||a much longer passage that gives the ending away||');

    expect(buttons().map(button => button.textContent?.trim())).toEqual([
      'Spoiler',
      'Spoiler',
    ]);
  });

  it('reveals the spoiler when pressed and puts focus on its words', () => {
    render();

    buttons()[0].click();

    const revealed = paragraph().querySelector<HTMLElement>(
      '.storytime-spoiler--revealed',
    );

    expect(paragraph().textContent).toBe('I did not see the twist coming.');
    expect(buttons()).toHaveLength(0);
    expect(revealed?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(revealed);
  });

  it('reveals only the spoiler that was pressed', () => {
    render('||first|| then ||second||');

    buttons()[1].click();

    expect(paragraph().textContent).toBe('Spoiler then second');
    expect(buttons()).toHaveLength(1);
  });

  it('keeps a revealed spoiler revealed when the same words arrive again', () => {
    render();
    buttons()[0].click();

    fixture.componentInstance.body = 'I did not see ||the twist|| coming.';
    fixture.detectChanges();

    expect(paragraph().textContent).toContain('the twist');
  });

  it('hides the spoilers again when the comment says something else', () => {
    render();
    buttons()[0].click();

    fixture.componentInstance.body = 'Edited: ||the twist|| still got me.';
    fixture.detectChanges();

    expect(paragraph().textContent).toBe('Edited: Spoiler still got me.');
  });
});
