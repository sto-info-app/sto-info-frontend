import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SettingHelpComponent } from '../setting-help/setting-help.component';
import { MarkdownReferenceComponent } from '../markdown-reference/markdown-reference.component';

/**
 * The note under a field that takes Markdown, and the reference behind it.
 *
 * Four fields across four editors accept the same Markdown and each carried
 * the same sentence about it. Saying "Markdown is supported" answers less than
 * it appears to: it tells a writer the word without telling them which of the
 * dozen things called Markdown this is, so a table comes out as a row of pipe
 * characters and they cannot tell whether they typed it wrongly.
 *
 * The mark beside the note opens the whole list, in the same popup every
 * Storytime setting explains itself through. It opens where the writing is
 * happening rather than sending anybody to a help page, because the question
 * arrives mid-sentence and unsaved work is on the screen.
 *
 * Anything a particular field needs to add — a Chapter needing content before
 * it can be published — is projected in, so the shared part stays shared.
 */
@Component({
  selector: 'app-storytime-markdown-hint',
  templateUrl: './markdown-hint.component.html',
  standalone: true,
  imports: [CommonModule, SettingHelpComponent, MarkdownReferenceComponent],
})
export class MarkdownHintComponent {}
