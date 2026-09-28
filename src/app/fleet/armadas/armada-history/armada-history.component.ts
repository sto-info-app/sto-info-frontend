import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap, Router } from '@angular/router';

import { map, Observable } from 'rxjs';

import {
  ArmadaSection,
  ArmadaSectionPageDirective,
} from 'src/app/fleet/armadas/armada-section-page.directive';
import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import {
  describeMove,
  fleetNamer,
  FleetNamer,
} from 'src/app/fleet/armadas/armada.utils';
import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import {
  ArmadaChange,
  ArmadaHistoryPage,
} from 'src/app/models/fleet-armada.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to a reader the page is not open to; nobody is turned away. */
export const ARMADA_HISTORY_NOT_PERMITTED = 'This Armada’s history is hidden.';

/** A page of an Armada's history, and the Armada. */
export interface ArmadaHistoryData {
  readonly section: ArmadaSection;
  readonly page: ArmadaHistoryPage;
}

/**
 * How an Armada's shape changed, newest change first (FC-026).
 *
 * Shown to whoever may see the Armada, as Steve decided on 28 September
 * 2026. Each change reads as one sentence for each Fleet it moved; who made
 * it and why are shown to the Armada's members alone. Paged by the address,
 * as the roster history is.
 */
@Component({
  selector: 'app-armada-history',
  templateUrl: './armada-history.component.html',
  styleUrls: ['./armada-history.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    ArmadaTabsComponent,
    FleetPageShellComponent,
  ],
})
export class ArmadaHistoryComponent extends ArmadaSectionPageDirective<ArmadaHistoryData> {
  private readonly _router = inject(Router);
  private readonly _armadas = inject(FleetArmadaService);

  readonly notPermittedMessage = ARMADA_HISTORY_NOT_PERMITTED;

  protected readonly _requiredCapabilities: readonly string[] = [];

  /**
   * Names the Fleets on a page.
   *
   * @param data - The page.
   * @returns The namer.
   */
  namerFor(data: ArmadaHistoryData): FleetNamer {
    return fleetNamer(
      data.page.items.flatMap(change => change.moves.map(move => move.fleet)),
      data.section.resolved.communityName ?? '',
    );
  }

  /**
   * Puts a change's moves as sentences.
   *
   * @param change - The change.
   * @param nameOf - Names Fleets.
   * @returns One sentence for each Fleet it moved.
   */
  sentencesOf(change: ArmadaChange, nameOf: FleetNamer): string[] {
    return change.moves.map(move => describeMove(move, nameOf));
  }

  /**
   * How many pages the history has.
   *
   * @param page - The page shown.
   * @returns The count, 0 when there is nothing.
   */
  totalPages(page: ArmadaHistoryPage): number {
    return page.pageSize > 0 ? Math.ceil(page.total / page.pageSize) : 0;
  }

  /**
   * Shows another page.
   *
   * @param page - The page, from 1.
   */
  onPage(page: number): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Reads the page the address asks for.
   *
   * @param section - The Armada.
   * @param query - The address's query.
   * @returns The page, with the Armada.
   */
  protected load(
    section: ArmadaSection,
    query: ParamMap,
  ): Observable<ArmadaHistoryData> {
    const asked = Number(query.get('page'));

    return this._armadas
      .history(
        section.communityId,
        section.armadaId,
        Number.isInteger(asked) && asked > 1 ? asked : 1,
      )
      .pipe(map(page => ({ section, page })));
  }
}
