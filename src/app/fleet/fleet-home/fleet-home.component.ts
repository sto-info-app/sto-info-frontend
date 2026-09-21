import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { map, Observable, startWith } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetShellTab } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.model';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FeatureUnavailableComponent } from 'src/app/shared/components/feature-unavailable/feature-unavailable.component';
import {
  FEATURE_UNAVAILABLE_DISABLED,
  FEATURE_UNAVAILABLE_OFFLINE,
  FeatureUnavailableReason,
} from 'src/app/shared/constants/feature-availability.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

/** What the section is able to show. */
export type FleetHomeState = 'LOADING' | 'OFFLINE' | 'DISABLED' | 'ENABLED';

/** The feature's name, worded as the rest of the site words it. */
export const FLEET_FEATURE_NAME = 'Fleet Community';

/** The three listings, in the order the strip offers them. */
export const FLEET_DIRECTORY_TABS: readonly FleetShellTab[] = [
  // Exact, because `/fleets` is the prefix of both of the others and would
  // otherwise stay lit while the reader is on one of them.
  {
    link: FLEET_LINKS.fleetDirectory().join('/'),
    label: 'Fleets',
    exact: true,
  },
  {
    link: FLEET_LINKS.communityDirectory().join('/'),
    label: 'Communities',
    // Not exact, so the tab stays lit while the reader drills into a
    // Community, and into a Fleet or Armada beneath it.
    exact: false,
  },
  {
    link: FLEET_LINKS.armadaDirectory().join('/'),
    label: 'Armadas',
    exact: false,
  },
];

/**
 * The chrome the whole Fleet directory sits in.
 *
 * It answers one question — is this feature there at all — and then gets out
 * of the way. The three listings below it are routes rather than a tab
 * component's state, which is what makes each one bookmarkable, shareable and
 * reachable with the back button, and it is why the question is asked here
 * rather than three times over.
 *
 * Switched off and unreachable are told apart rather than collapsed into one
 * notice, because they are different facts. With the backend not answering
 * nobody knows what the switch says, and saying it is off would be a guess.
 *
 * A feature that is not ready says it is resting rather than answering as a
 * wrong address: somebody told an address is wrong stops trying.
 */
@Component({
  selector: 'app-fleet-home',
  templateUrl: './fleet-home.component.html',
  styleUrls: ['./fleet-home.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterOutlet,
    FleetPageShellComponent,
    FeatureUnavailableComponent,
  ],
})
export class FleetHomeComponent {
  private readonly _fleetConfiguration = inject(FleetConfigurationService);

  /** The feature's name, for the notice that says it is not there. */
  readonly featureName = FLEET_FEATURE_NAME;

  /**
   * Which of the four states the section is in.
   *
   * Starts as loading rather than as one of the answers: guessing while the
   * request is in flight means showing a notice and then replacing it, which
   * reads as the site changing its mind.
   */
  readonly state$: Observable<FleetHomeState> = this._fleetConfiguration
    .getConfiguration()
    .pipe(
      map((configuration): FleetHomeState => {
        if (configuration === null) {
          return 'OFFLINE';
        }

        return configuration.features.isEnabled ? 'ENABLED' : 'DISABLED';
      }),
      startWith<FleetHomeState>('LOADING'),
    );

  /**
   * The tab strip, which is only worth drawing over something.
   *
   * @param state - The state the section is in.
   * @returns The tabs, or an empty strip.
   */
  tabsFor(state: FleetHomeState): readonly FleetShellTab[] {
    return state === 'ENABLED' ? FLEET_DIRECTORY_TABS : [];
  }

  /**
   * Turns a state into the reason the unavailable notice should give.
   *
   * @param state - The state the section is in.
   * @returns The reason to show.
   */
  reasonFor(state: FleetHomeState): FeatureUnavailableReason {
    return state === 'OFFLINE'
      ? FEATURE_UNAVAILABLE_OFFLINE
      : FEATURE_UNAVAILABLE_DISABLED;
  }
}
