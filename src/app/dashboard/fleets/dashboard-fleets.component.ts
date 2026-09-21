import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';

import { CommunitySubscriptionService } from 'src/app/fleet/community-subscription.service';
import { FleetScopeCardComponent } from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.component';
import { FleetScopeCardVm } from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.model';
import { FLEET_FEATURE_NAME } from 'src/app/fleet/constants/fleet-feature.constants';
import { buildCommunityCardVm } from 'src/app/fleet/fleet-card.builders';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FeatureUnavailableComponent } from 'src/app/shared/components/feature-unavailable/feature-unavailable.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  FEATURE_UNAVAILABLE_DISABLED,
  FEATURE_UNAVAILABLE_OFFLINE,
  FeatureUnavailableReason,
} from 'src/app/shared/constants/feature-availability.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

/** What the page has to show. */
export type DashboardFleetsState =
  | { kind: 'LOADING' }
  | { kind: 'UNAVAILABLE'; reason: FeatureUnavailableReason }
  | { kind: 'ERROR' }
  | { kind: 'READY'; cards: FleetScopeCardVm[] };

/**
 * The Communities a member follows.
 *
 * Named for what it lists. "Your Fleets" would be shorter and would say
 * something the rest of the section spends three paragraphs denying: following
 * a Community is not membership of it, and nothing here is evidence that the
 * reader flies with anybody.
 *
 * It lists rather than chooses. A member who follows six Communities is shown
 * six cards and picks one; a dashboard that jumped to whichever came back
 * first would be picking for them, and would lead somewhere different each
 * visit.
 *
 * The cards are the directory's cards, built by the same builder from the same
 * record, so a Community a member followed looks the same here as it did where
 * they found it. Nothing here follows or unfollows: that control lives on the
 * Community's own page, beside the count it changes.
 *
 * Switched off and unreachable are told apart, as they are on the section's
 * landing page. With the backend not answering nobody knows what the switch
 * says, and the list cannot be read either, so the honest answer is the notice
 * rather than an empty page that reads as "you follow nothing".
 */
@Component({
  selector: 'app-dashboard-fleets',
  templateUrl: './dashboard-fleets.component.html',
  styleUrls: ['./dashboard-fleets.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    FleetScopeCardComponent,
    FeatureUnavailableComponent,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
  ],
})
export class DashboardFleetsComponent {
  private readonly _fleetConfiguration = inject(FleetConfigurationService);
  private readonly _subscriptions = inject(CommunitySubscriptionService);

  /** The feature's name, for the notice that says it is not there. */
  readonly featureName = FLEET_FEATURE_NAME;

  /** What is said when the list itself could not be read. */
  readonly errorMessage =
    'What you follow could not be read just now. Nothing has been ' +
    'lost — please try again shortly.';

  /** The three listings, for a reader who follows nothing yet. */
  readonly fleetDirectoryLink = FLEET_LINKS.fleetDirectory();
  readonly communityDirectoryLink = FLEET_LINKS.communityDirectory();
  readonly armadaDirectoryLink = FLEET_LINKS.armadaDirectory();

  /** Registering one of their own, which anybody signed in may do. */
  readonly registerLink = '/' + APP_ROUTES.FLEET_REGISTER;

  /**
   * Whichever of loading, unavailable, failed or a list the page is showing.
   *
   * The switch is read before the list, and not alongside it: asking for
   * somebody's follows while the feature is off would be a request whose
   * answer could not be drawn either way.
   *
   * Starts as loading rather than as an answer. Guessing while the request is
   * in flight means drawing a notice and then replacing it, which reads as the
   * site changing its mind.
   */
  readonly state$: Observable<DashboardFleetsState> = this._fleetConfiguration
    .getConfiguration()
    .pipe(
      switchMap((configuration): Observable<DashboardFleetsState> => {
        if (configuration === null) {
          return of({
            kind: 'UNAVAILABLE',
            reason: FEATURE_UNAVAILABLE_OFFLINE,
          });
        }

        if (!configuration.features.isEnabled) {
          return of({
            kind: 'UNAVAILABLE',
            reason: FEATURE_UNAVAILABLE_DISABLED,
          });
        }

        return this._subscriptions.listFollowed().pipe(
          map((followed): DashboardFleetsState => {
            return {
              kind: 'READY',
              cards: followed.map(entry =>
                buildCommunityCardVm(entry.community),
              ),
            };
          }),
          catchError(() => of<DashboardFleetsState>({ kind: 'ERROR' })),
        );
      }),
      startWith<DashboardFleetsState>({ kind: 'LOADING' }),
    );
}
