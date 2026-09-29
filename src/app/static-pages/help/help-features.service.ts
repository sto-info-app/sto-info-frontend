import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { FleetConfiguration } from 'src/app/models/fleet.models';
import { StorytimeAvailability } from 'src/app/models/storytime.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import { StorytimeService } from 'src/app/storytime/storytime.service';

import { HelpFeatures } from './help.models';

/**
 * Where the switches Help waits on stand (FC-049).
 *
 * Storytime's answer is its own. Fleet Community's and Fleet chat's come from
 * the Fleet configuration, read the way Storytime's is: a configuration that
 * could not be read is `UNAVAILABLE`, never off, so help is only taken away
 * when the server has said a feature is switched off. Chat is part of Fleet
 * Community, so it is off whenever Fleet Community is.
 */
@Injectable({ providedIn: 'root' })
export class HelpFeaturesService {
  private readonly _storytime = inject(StorytimeService);
  private readonly _fleet = inject(FleetConfigurationService);

  /**
   * Where each switch stands.
   *
   * @returns An observable of the three switches.
   */
  features(): Observable<HelpFeatures> {
    return combineLatest([
      this._storytime.getAvailability(),
      this._fleet.getConfiguration(),
    ]).pipe(
      map(([storytime, fleet]) => ({
        STORYTIME: storytime,
        FLEET: stateOf(
          fleet,
          configuration => configuration.features.isEnabled,
        ),
        CHAT: stateOf(
          fleet,
          configuration =>
            configuration.features.isEnabled &&
            configuration.features.chatEnabled,
        ),
      })),
    );
  }
}

/**
 * Reads one Fleet switch.
 *
 * @param configuration The Fleet configuration, or null when it could not be
 *   read.
 * @param isOn Whether the switch is on in it.
 * @returns On, off, or unknown.
 */
function stateOf(
  configuration: FleetConfiguration | null,
  isOn: (configuration: FleetConfiguration) => boolean,
): StorytimeAvailability {
  if (configuration === null) {
    return 'UNAVAILABLE';
  }

  return isOn(configuration) ? 'ENABLED' : 'DISABLED';
}
