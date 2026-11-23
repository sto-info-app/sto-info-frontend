import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FleetScopeAction } from 'src/app/fleet/scope/fleet-scope-page.models';

/**
 * A Fleet hub's list of places to go — Manage, Investigate, Recruitment —
 * each a pill with what it is for written beside it.
 *
 * The pills are all one width, the widest label's, so every description
 * starts at the same place and the list reads as a column (#1469). Each line
 * takes the next colour of the rotation, and its description is written in
 * its pill's colour. On a phone the description goes under its pill.
 */
@Component({
  selector: 'app-fleet-action-list',
  templateUrl: './fleet-action-list.component.html',
  styleUrls: ['./fleet-action-list.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class FleetActionListComponent {
  /** The places the reader may go, in order. */
  readonly actions = input.required<readonly FleetScopeAction[]>();
}
