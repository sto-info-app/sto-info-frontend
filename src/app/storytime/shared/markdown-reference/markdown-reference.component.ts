import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  MARKDOWN_REFERENCE,
  MARKDOWN_REFERENCE_NOTES,
} from '../../storytime-markdown.constants';

/**
 * What Storytime's Markdown understands, as a creator meets it.
 *
 * A list rather than a page of prose, because it is read while writing
 * something else: a writer opens it to check one thing and goes straight back.
 *
 * It holds no state and takes no inputs, so it can sit inside the popup beside
 * a field, inside a help guide, or anywhere else the question comes up,
 * without any of those places restating the answer.
 */
@Component({
  selector: 'app-storytime-markdown-reference',
  templateUrl: './markdown-reference.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class MarkdownReferenceComponent {
  /** The constructs, grouped as the reference presents them. */
  readonly groups = MARKDOWN_REFERENCE;

  /** What a two-column list cannot say. */
  readonly notes = MARKDOWN_REFERENCE_NOTES;
}
