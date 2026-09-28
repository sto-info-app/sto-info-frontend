import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import {
  fleetLinkOf,
  fleetNamer,
  FleetNamer,
} from 'src/app/fleet/armadas/armada.utils';
import { ArmadaTreeComponent } from 'src/app/fleet/armadas/armada-tree/armada-tree.component';
import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  ArmadaFleetRef,
  ArmadaRef,
  CommunityStructure,
} from 'src/app/models/fleet-armada.models';

/** The Community the panel is on. */
export interface CommunityStructurePanelVm {
  readonly communityId: string;
  readonly communitySlug: string;
  /** Its name, for telling same-named Fleets apart. */
  readonly communityName: string;
}

/**
 * How a Community's Fleets are arranged, on its page (FC-026).
 *
 * Both of R04's paths at once, and neither forced: each open Armada as a
 * tree, then the Fleets in no Armada, which sit directly under the
 * Community. Fleets the reader may not see are left out of the list and
 * kept, nameless, in an Armada's tree. A structure that cannot be read shows
 * nothing, since the panel is not what the page is for.
 */
@Component({
  selector: 'app-community-structure-panel',
  templateUrl: './community-structure-panel.component.html',
  styleUrls: ['./community-structure-panel.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArmadaTreeComponent, RouterLink],
})
export class CommunityStructurePanelComponent {
  private readonly _armadas = inject(FleetArmadaService);
  private readonly _destroyRef = inject(DestroyRef);

  /** The Community. */
  readonly community = signal<CommunityStructurePanelVm | null>(null);

  /** Its structure, once read. */
  readonly structure = signal<CommunityStructure | null>(null);

  /**
   * The Community to show. Its structure is read each time it changes.
   */
  @Input({ required: true }) set vm(value: CommunityStructurePanelVm) {
    this.community.set(value);
    this.structure.set(null);
    this._armadas
      .communityStructure(value.communityId)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: structure => this.structure.set(structure),
        error: () => undefined,
      });
  }

  /**
   * Names the Fleets in no Armada.
   *
   * @param structure - The Community's structure.
   * @param community - The Community.
   * @returns The namer.
   */
  namerFor(
    structure: CommunityStructure,
    community: CommunityStructurePanelVm,
  ): FleetNamer {
    return fleetNamer(structure.standaloneFleets, community.communityName);
  }

  /**
   * An Armada's page.
   *
   * @param armada - The Armada.
   * @returns The router link.
   */
  armadaLink(armada: ArmadaRef): string[] {
    return FLEET_LINKS.armada(
      (this.community() as CommunityStructurePanelVm).communitySlug,
      armada.platformSegment,
      armada.slug,
    );
  }

  /**
   * A Fleet's page.
   *
   * @param fleet - The Fleet, which the reader may see.
   * @returns The router link.
   */
  fleetLink(fleet: ArmadaFleetRef): string[] {
    return fleetLinkOf(
      fleet,
      (this.community() as CommunityStructurePanelVm).communitySlug,
    ) as string[];
  }
}
