import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Notice shown in place of a character progress tracker when the captain has
 * not yet reached the in-game level that unlocks the feature.
 *
 * The level stored against a captain is user-entered, so the notice always
 * offers a way back to the captain edit form rather than treating the lock as
 * final.
 */
@Component({
  selector: 'app-lcars-level-lock',
  templateUrl: './lcars-level-lock.component.html',
  styleUrls: ['./lcars-level-lock.component.scss'],
  standalone: true,
  imports: [RouterModule],
})
export class LcarsLevelLockComponent {
  /** The feature being gated, e.g. "Research & Development". */
  @Input() featureName = 'This feature';

  /** The in-game level at which the feature unlocks. */
  @Input() requiredLevel = 1;

  /** The captain's recorded level, or null when it is unknown. */
  @Input() currentLevel: number | null = null;

  /** The captain's handle, used to personalise the notice. */
  @Input() characterHandle = '';

  /** Router link to the captain edit form where the level can be corrected. */
  @Input() editLink: string[] = [];

  /** The captain's name for the notice, falling back when no handle is set. */
  get captainLabel(): string {
    return this.characterHandle || 'This captain';
  }
}
