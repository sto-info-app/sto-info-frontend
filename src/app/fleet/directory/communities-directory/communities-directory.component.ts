import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ParamMap, RouterModule } from '@angular/router';

import { map, Observable } from 'rxjs';

import { FleetDirectoryFiltersComponent } from 'src/app/fleet/directory/fleet-directory-filters/fleet-directory-filters.component';
import { FleetDirectoryPageDirective } from 'src/app/fleet/directory/fleet-directory-page.directive';
import {
  FLEET_SORTS_WITHOUT_FRESHNESS,
  FleetDirectoryResults,
} from 'src/app/fleet/directory/fleet-directory-page.models';
import { FleetDirectoryResultsComponent } from 'src/app/fleet/directory/fleet-directory-results/fleet-directory-results.component';
import { buildCommunityCardVm } from 'src/app/fleet/fleet-card.builders';
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
import { AuthService } from 'src/app/core/auth/auth.service';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * The groups of people who register Fleets here.
 *
 * No duplicate count and no freshness. A Community names a group of people
 * rather than claiming something the game holds exactly once, so two
 * Communities sharing a name are not two records of one thing; and nothing
 * observes a Community, so there is no import for one to be fresh.
 */
@Component({
  selector: 'app-communities-directory',
  templateUrl: './communities-directory.component.html',
  styleUrls: ['./communities-directory.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Provided although nothing here formats a date, because the shared base
  // asks for it. Cheaper than a second base class for the one listing that
  // has an instant to write out.
  providers: [AppDatePipe],
  imports: [
    AsyncPipe,
    RouterModule,
    FleetDirectoryFiltersComponent,
    FleetDirectoryResultsComponent,
  ],
})
export class CommunitiesDirectoryComponent extends FleetDirectoryPageDirective {
  private readonly _directory = inject(FleetDirectoryService);
  private readonly _authService = inject(AuthService);

  /** Where registering one starts. */
  readonly registerLink = '/' + APP_ROUTES.FLEET_REGISTER;

  /**
   * Whether to offer registration at all.
   *
   * Signed in is the only condition checked here. Whether the switch is on
   * is the registration page's own answer, and asking it twice would mean
   * two places to keep in step — where offering a link that explains itself
   * costs a reader one click.
   *
   * @returns True when somebody is signed in.
   */
  get canRegister(): boolean {
    return this._authService.isLoggedIn();
  }

  readonly sortOptions = FLEET_SORTS_WITHOUT_FRESHNESS;

  readonly emptyMessage =
    'No Community answers to that. Anybody signed in can register one, and ' +
    'a Fleet does not need a Community to be listed here.';

  /**
   * Asks for one page of Communities.
   *
   * @param params - The query string.
   * @returns The page, turned into cards.
   */
  protected load(params: ParamMap): Observable<FleetDirectoryResults> {
    return this._directory
      .listCommunities({
        search: this.searchOf(params),
        status: this.statusOf(params),
        sort: this.sortOf(params),
        ...this.paging(params),
      })
      .pipe(
        map(page => ({
          cards: page.items.map(buildCommunityCardVm),
          total: page.total,
          page: page.page,
          pageSize: page.pageSize,
        })),
      );
  }
}
