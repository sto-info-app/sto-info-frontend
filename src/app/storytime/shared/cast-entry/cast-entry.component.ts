import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CharacterPanelVm } from '../../character-panel.utility';

/**
 * One Character as a cast panel shows them.
 *
 * Written once and shown wherever a cast is listed — the reader's cast tab on
 * a Story and the creator's own list of who is in it — because the two
 * describe the same thing, and a reader who has read one should not have to
 * learn the other. The panel it renders is the counterpart of the view model
 * {@link CharacterPanelVm}, which the two already share.
 *
 * Only the actions differ between the two, so those are projected in: the
 * reader gets a way to open a Character, the creator gets the controls to
 * edit, reorder and delete one.
 *
 * Attaches to the host `li` rather than wrapping one, so the panel stays a
 * real list item and keeps the layout that styles the body and the controls
 * as direct children of the row.
 */
@Component({
  // An attribute on the `li` rather than an element of its own: the panel has
  // to stay a real list item, and the row's styling reaches its heading and
  // body as direct children, which a wrapping element would break.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'li[appStorytimeCastEntry]',
  templateUrl: './cast-entry.component.html',
  standalone: true,
  imports: [RouterModule],
  host: { class: 'storytime-panel-card storytime-panel-card--character' },
})
export class StorytimeCastEntryComponent {
  /** The Character the panel is about, as the panel renders them. */
  @Input({ required: true }) entry!: CharacterPanelVm;

  /** Where the Character's name leads, as router link segments. */
  @Input({ required: true }) link!: string[];
}
