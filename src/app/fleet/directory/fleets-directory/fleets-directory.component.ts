import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap, RouterModule } from '@angular/router';

import { map, Observable } from 'rxjs';

import { FleetDirectoryFiltersComponent } from 'src/app/fleet/directory/fleet-directory-filters/fleet-directory-filters.component';
import { FleetDirectoryPageDirective } from 'src/app/fleet/directory/fleet-directory-page.directive';
import {
  FLEET_SORTS_WITH_FRESHNESS,
  FleetDirectoryResults,
} from 'src/app/fleet/directory/fleet-directory-page.models';
import { FleetDirectoryResultsComponent } from 'src/app/fleet/directory/fleet-directory-results/fleet-directory-results.component';
import { buildFleetCardVm } from 'src/app/fleet/fleet-card.builders';
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
import { AuthService } from 'src/app/core/auth/auth.service';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * Every Fleet the site knows about, whoever registered it.
 *
 * The listing the whole directory is named for, and the only one that can be
 * ordered by freshness: a record somebody renamed yesterday and has not
 * imported a roster for since 2024 is stale, and that ordering is what says
 * so.
 *
 * Ordered by name otherwise, which is what makes it duplicate-aware in
 * practice as well as in shape: records answering to one name sit together,
 * and each says how many others do.
 */
@Component({
  selector: 'app-fleets-directory',
  templateUrl: './fleets-directory.component.html',
  styleUrls: ['./fleets-directory.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The date pipe is not provided at the root, and this page calls it rather
  // than binding it: a roster import is an instant, and which timezone it is
  // written in is the reader's choice.
  providers: [AppDatePipe],
  imports: [
    AsyncPipe,
    RouterModule,
    FleetDirectoryFiltersComponent,
    FleetDirectoryResultsComponent,
  ],
})
export class FleetsDirectoryComponent extends FleetDirectoryPageDirective {
  private readonly _directory = inject(FleetDirectoryService);
  private readonly _authService = inject(AuthService);

  /** Where confirming a Fleet nobody here runs starts. */
  readonly confirmStandaloneLink = '/' + APP_ROUTES.FLEET_REGISTER_STANDALONE;

  /**
   * Whether to offer confirming one at all.
   *
   * Signed in is the only condition. The record has no owner and no
   * capability held at it, so having an account is the whole of the gate
   * the server applies too.
   *
   * @returns True when somebody is signed in.
   */
  get canConfirmStandalone(): boolean {
    return this._authService.isLoggedIn();
  }

  readonly sortOptions = FLEET_SORTS_WITH_FRESHNESS;

  readonly emptyMessage =
    'No Fleet answers to that. Check the spelling, including any space at ' +
    'the start or the end of the name, and whether you are looking at the ' +
    'right platform.';

  /**
   * Asks for one page of Fleets.
   *
   * @param params - The query string.
   * @returns The page, turned into cards.
   */
  protected load(params: ParamMap): Observable<FleetDirectoryResults> {
    return this._directory
      .listFleets({
        search: this.searchOf(params),
        status: this.statusOf(params),
        sort: this.sortOf(params),
        ...this.paging(params),
      })
      .pipe(
        map(page => ({
          cards: page.items.map(item =>
            buildFleetCardVm(item, this.formatInstant),
          ),
          total: page.total,
          page: page.page,
          pageSize: page.pageSize,
        })),
      );
  }
}
