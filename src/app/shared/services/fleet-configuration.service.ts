import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { catchError, map, Observable, of, shareReplay, startWith } from 'rxjs';

import {
  FLEET_FEATURES_DISABLED,
  FleetConfiguration,
  FleetFeatureState,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Whether Fleet Community is switched on, and what its published figures are.
 *
 * Unauthenticated and cached for the lifetime of the application: the answer
 * changes when an administrator throws a switch, not between two components
 * rendering, and asking once is what keeps this cheap enough for any component
 * to depend on.
 *
 * A failed request reports everything off. That errs towards hiding a control
 * the server would refuse rather than offering one that does not work — the
 * opposite of the Storytime navigation entry, which stays put on a failure so
 * that following it reaches the notice explaining the outage. The difference is
 * what the control does: a settings toggle that cannot be saved has nothing to
 * explain.
 */
@Injectable({ providedIn: 'root' })
export class FleetConfigurationService {
  private readonly _http = inject(HttpClient);

  private _configuration$: Observable<FleetConfiguration | null> | null = null;

  /**
   * Reports which parts of Fleet Community are switched on.
   *
   * Emits the everything-off state immediately so a template has an answer on
   * its first render, then the server's answer when it arrives.
   *
   * @returns An observable of the feature state.
   */
  getFeatures(): Observable<FleetFeatureState> {
    return this.getConfiguration().pipe(
      map(configuration => configuration?.features ?? FLEET_FEATURES_DISABLED),
      startWith(FLEET_FEATURES_DISABLED),
    );
  }

  /**
   * Reads the configuration, once, and shares it.
   *
   * @returns An observable of the configuration, or null when it cannot be read.
   */
  getConfiguration(): Observable<FleetConfiguration | null> {
    this._configuration$ ??= this._http
      .get<FleetConfiguration>(API_URLS.FLEET_CONFIGURATION)
      .pipe(
        catchError(() => of(null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this._configuration$;
  }
}
