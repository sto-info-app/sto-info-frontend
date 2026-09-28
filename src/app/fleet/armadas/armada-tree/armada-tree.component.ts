import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ARMADA_POSITION_LABELS } from 'src/app/fleet/armadas/armada.constants';
import {
  fleetLinkOf,
  fleetNamer,
  fleetsIn,
} from 'src/app/fleet/armadas/armada.utils';
import {
  ArmadaNode,
  ArmadaStructure,
} from 'src/app/models/fleet-armada.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * An Armada's shape as a tree (FC-026): the Alpha, then each Beta with the
 * Gammas under it.
 *
 * Nested lists rather than a drawing, so a keyboard, a screen reader and a
 * phone all follow the hierarchy the same way. Each Fleet says its position
 * and when it took it; a Fleet the reader may not see keeps its place
 * without its name. Two Fleets sharing a name get their Community's name
 * after it. For a manager, each Fleet offers Move… and Remove…, which the
 * page holding the tree answers.
 */
@Component({
  selector: 'app-armada-tree',
  templateUrl: './armada-tree.component.html',
  styleUrls: ['./armada-tree.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, NgTemplateOutlet, RouterLink],
})
export class ArmadaTreeComponent {
  /** The Armada's shape. */
  readonly structure = input.required<ArmadaStructure>();

  /** The Community holding it, for links. */
  readonly communitySlug = input.required<string>();

  /** The Community's name, for telling same-named Fleets apart. */
  readonly communityName = input.required<string>();

  /** Whether to offer Move… and Remove…. */
  readonly manageable = input(false);

  /** Asks to move a Fleet. */
  readonly move = output<ArmadaNode>();

  /** Asks to take a Fleet out. */
  readonly remove = output<ArmadaNode>();

  /** Names the Fleets in view. */
  readonly nameOf = computed(() =>
    fleetNamer(fleetsIn(this.structure()), this.communityName()),
  );

  /**
   * A Fleet's position, as a label.
   *
   * @param node - The Fleet's place.
   * @returns "Alpha", "Beta" or "Gamma".
   */
  labelOf(node: ArmadaNode): string {
    return ARMADA_POSITION_LABELS[node.position];
  }

  /**
   * A Fleet's page, where the reader may see it.
   *
   * @param node - The Fleet's place.
   * @returns The link, or null.
   */
  linkOf(node: ArmadaNode): string[] | null {
    return fleetLinkOf(node.fleet, this.communitySlug());
  }
}
