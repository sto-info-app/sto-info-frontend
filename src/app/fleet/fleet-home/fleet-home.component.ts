import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { map, Observable, startWith } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FeatureUnavailableComponent } from 'src/app/shared/components/feature-unavailable/feature-unavailable.component';
import {
  FEATURE_UNAVAILABLE_DISABLED,
  FEATURE_UNAVAILABLE_OFFLINE,
  FeatureUnavailableReason,
} from 'src/app/shared/constants/feature-availability.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

/** What the page is able to show. */
export type FleetHomeState = 'LOADING' | 'OFFLINE' | 'DISABLED' | 'EMPTY';

/** The feature's name, worded as the rest of the site words it. */
export const FLEET_FEATURE_NAME = 'Fleet Community';

/**
 * The Fleet directory's landing page.
 *
 * The directory itself is not built yet — that is its own ticket — so what
 * this page does today is be the address `/fleets` resolves to, and say which
 * of three things is true: nobody could be asked, somebody has switched the
 * feature off, or it is on and nothing has been registered in it.
 *
 * It is here now rather than arriving with the directory because the shared
 * Fleet patterns need somewhere real to be looked at. A layout nobody has
 * rendered is a layout nobody has checked on a narrow screen, with a keyboard,
 * or against a Font Awesome kit that silently drops an icon it was not
 * subsetted with.
 *
 * The switch is off in every environment, so the notice is what a visitor
 * actually sees, and deliberately so: a feature that is not ready says it is
 * resting rather than answering as a wrong address. Somebody told an address
 * is wrong stops trying.
 *
 * Switched off and unreachable are told apart rather than collapsed into one
 * notice, because they are different facts. With the backend not answering
 * nobody knows what the switch says, and saying it is off would be a guess.
 *
 * No tab strip yet. There is one section, and a strip of one tab is a strip
 * that says nothing; it arrives with the second section.
 */
@Component({
  selector: 'app-fleet-home',
  templateUrl: './fleet-home.component.html',
  styleUrls: ['./fleet-home.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, FleetPageShellComponent, FeatureUnavailableComponent],
})
export class FleetHomeComponent {
  private readonly _fleetConfiguration = inject(FleetConfigurationService);

  /** The feature's name, for the notice that says it is not there. */
  readonly featureName = FLEET_FEATURE_NAME;

  /**
   * Which of the four states the page is in.
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

        return configuration.features.isEnabled ? 'EMPTY' : 'DISABLED';
      }),
      startWith<FleetHomeState>('LOADING'),
    );

  /**
   * Turns a state into the reason the unavailable notice should give.
   *
   * @param state - The state the page is in.
   * @returns The reason to show.
   */
  reasonFor(state: FleetHomeState): FeatureUnavailableReason {
    return state === 'OFFLINE'
      ? FEATURE_UNAVAILABLE_OFFLINE
      : FEATURE_UNAVAILABLE_DISABLED;
  }
}
