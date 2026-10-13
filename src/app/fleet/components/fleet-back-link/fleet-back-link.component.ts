import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The way back from a Fleet page to the one above it — Manage, a Fleet's
 * applications — drawn as a pill on a row of its own.
 *
 * A link that stands on its own as a destination is a pill (Steve's decision
 * of 12 October 2026), and one component rather than the same row written
 * into every Manage page keeps them all the same shape.
 */
@Component({
  selector: 'app-fleet-back-link',
  templateUrl: './fleet-back-link.component.html',
  styleUrls: ['./fleet-back-link.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class FleetBackLinkComponent {
  /** Where the link goes, as router commands. */
  readonly link = input.required<readonly string[]>();

  /** What the link says, such as "Back to Manage". */
  readonly label = input.required<string>();
}
