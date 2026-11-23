import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  inject,
} from '@angular/core';
import { CommentSegment, splitSpoilers } from './spoiler.utility';

/**
 * What a comment says, with its spoilers kept back.
 *
 * A spoiler is a button until somebody presses it, and the words behind it
 * are not on the page at all until then — not hidden with a style, absent —
 * so a screen reader cannot read them out, a search cannot find them and a
 * careless copy cannot carry them off. The button shows the same word however
 * long the spoiler is, because its width would otherwise give away how much
 * there is to spoil.
 *
 * Once revealed, a spoiler stays revealed: it was the reader's choice, and
 * hiding it again would only make them choose twice. Focus moves onto the
 * words that took the button's place, so a keyboard reader is not dropped to
 * the top of the page and a screen reader goes straight on to read them.
 */
@Component({
  selector: 'app-storytime-comment-text',
  templateUrl: './comment-text.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentTextComponent {
  /** The comment's pieces, in order. */
  segments: CommentSegment[] = [];

  /** Which of the pieces the reader has chosen to see. */
  private readonly _revealed = new Set<number>();

  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The comment as written.
   *
   * Only a different comment resets what has been revealed: the thread is
   * read back after every change, and the same words arriving again are not
   * a reason to hide what the reader already chose to see.
   *
   * @param body - What the comment says.
   */
  @Input({ required: true })
  set body(body: string) {
    this.segments = splitSpoilers(body);
    this._revealed.clear();
  }

  /**
   * Whether a spoiler has been revealed.
   *
   * @param index - The piece's position in the comment.
   * @returns True once the reader has asked to see it.
   */
  isRevealed(index: number): boolean {
    return this._revealed.has(index);
  }

  /**
   * Shows a spoiler, and puts focus on what it said.
   *
   * @param index - The piece's position in the comment.
   */
  reveal(index: number): void {
    this._revealed.add(index);
    this._cdr.detectChanges();

    this._host.nativeElement
      .querySelector<HTMLElement>(`[data-spoiler="${index}"]`)
      ?.focus();
  }
}
