import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Notice shown in place of a character progress tracker whose catalogue
 * depends on the captain's general allegiance, when no allegiance has been
 * settled on.
 *
 * Commendations are the case in point: Diplomacy is earned Federation-side and
 * Marauding Klingon-side, so an "Undecided" captain cannot be shown a catalogue
 * that is true for them. As with the level lock, the allegiance is user-entered
 * and the notice always offers a way back to the captain edit form.
 */
@Component({
  selector: 'app-lcars-allegiance-lock',
  templateUrl: './lcars-allegiance-lock.component.html',
  styleUrls: ['./lcars-allegiance-lock.component.scss'],
  standalone: true,
  imports: [RouterModule],
})
export class LcarsAllegianceLockComponent {
  /** The feature being gated, e.g. "Commendations". */
  @Input() featureName = 'This feature';

  /** The captain's recorded allegiance, or null when none is recorded. */
  @Input() currentAllegiance: string | null = null;

  /** The captain's handle, used to personalise the notice. */
  @Input() characterHandle = '';

  /** Router link to the captain edit form where the allegiance can be set. */
  @Input() editLink: string[] = [];

  /** The captain's name for the notice, falling back when no handle is set. */
  get captainLabel(): string {
    return this.characterHandle || 'This captain';
  }
}
