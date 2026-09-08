import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * The row of buttons that ends a Storytime editor.
 *
 * Every editor finishes the same way — save what is on the screen, optionally
 * put it out where it can be read, or leave without doing either — and each
 * had its own copy of that row. Three copies of a disabled state and a label
 * that changes while saving is three chances for one of them to drift.
 *
 * Publishing is offered as a plain button rather than a second submit, so that
 * pressing Enter in a field can only ever save. It saves first and publishes
 * after: a creator who presses it having just typed something has every right
 * to expect what they typed to be what goes out.
 */
@Component({
  selector: 'app-storytime-editor-actions',
  templateUrl: './editor-actions.component.html',
  standalone: true,
  imports: [RouterModule],
})
export class EditorActionsComponent {
  /** Where leaving without saving goes, as a router link. */
  @Input({ required: true }) cancelLink!: unknown[];

  /** Whether a save is in flight, which disables both buttons. */
  @Input() isSaving = false;

  /** Whether publishing is a sensible next action from here. */
  @Input() canPublish = false;

  /**
   * The form this row submits, when it sits outside it.
   *
   * A Chapter's Save is the last thing on the page rather than the last thing
   * in the form, because the videos and the cast below it are saved on their
   * own and a Save above them would read as though they were not covered. The
   * button is tied back to the form by name instead, which also keeps the
   * media box outside it — pressing Enter there should not submit the Chapter.
   *
   * Left unset where the row is inside the form it submits.
   */
  @Input() formId = '';

  /** Asks the editor to save what is on the screen and then publish it. */
  @Output() readonly publish = new EventEmitter<void>();
}
