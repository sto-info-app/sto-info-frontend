import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap } from '@angular/router';

import { map, Observable } from 'rxjs';

import { FleetDirectoryFiltersComponent } from 'src/app/fleet/directory/fleet-directory-filters/fleet-directory-filters.component';
import { FleetDirectoryPageDirective } from 'src/app/fleet/directory/fleet-directory-page.directive';
import {
  FLEET_SORTS_WITHOUT_FRESHNESS,
  FleetDirectoryResults,
} from 'src/app/fleet/directory/fleet-directory-page.models';
import { FleetDirectoryResultsComponent } from 'src/app/fleet/directory/fleet-directory-results/fleet-directory-results.component';
import { buildArmadaCardVm } from 'src/app/fleet/fleet-card.builders';
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * The Armadas held by Communities the reader can see.
 *
 * An Armada has no audience of its own and is seen exactly as far as the
 * Community holding it, so this listing is shorter than the Fleet one for a
 * reason that has nothing to do with how many Armadas exist.
 *
 * No freshness: nothing imports a roster for an Armada.
 */
@Component({
  selector: 'app-armadas-directory',
  templateUrl: './armadas-directory.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Provided although nothing here formats a date, because the shared base
  // asks for it.
  providers: [AppDatePipe],
  imports: [
    AsyncPipe,
    FleetDirectoryFiltersComponent,
    FleetDirectoryResultsComponent,
  ],
})
export class ArmadasDirectoryComponent extends FleetDirectoryPageDirective {
  private readonly _directory = inject(FleetDirectoryService);

  readonly sortOptions = FLEET_SORTS_WITHOUT_FRESHNESS;

  readonly emptyMessage =
    'No Armada answers to that. An Armada is listed only while the ' +
    'Community holding it is public, so one may exist and not be here.';

  /**
   * Asks for one page of Armadas.
   *
   * @param params - The query string.
   * @returns The page, turned into cards.
   */
  protected load(params: ParamMap): Observable<FleetDirectoryResults> {
    return this._directory
      .listArmadas({
        search: this.searchOf(params),
        status: this.statusOf(params),
        sort: this.sortOf(params),
        ...this.paging(params),
      })
      .pipe(
        map(page => ({
          cards: page.items.map(buildArmadaCardVm),
          total: page.total,
          page: page.page,
          pageSize: page.pageSize,
        })),
      );
  }
}
