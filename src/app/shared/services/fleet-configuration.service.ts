import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  catchError,
  distinctUntilChanged,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
} from 'rxjs';

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
   * Whether to offer Fleet Community in the navigation.
   *
   * Asks whether the section should be offered rather than whether it is
   * switched on, so a backend that could not be reached leaves the
   * navigation alone: the entry stays, and following it reaches the notice
   * explaining the outage. Only the server saying the feature is off takes
   * an entry away.
   *
   * That is the opposite reading of the same failure from `getFeatures`,
   * which reports everything off, and deliberately so. A control that
   * writes has nothing to explain when the write would be refused; a link
   * has a page behind it that explains itself.
   *
   * Starts hidden so an entry never flickers into view before the answer is
   * known — a link that appears and then disappears is worse than one that
   * arrives a moment late. The answer is cached for the lifetime of the
   * application, so only the first page of a visit waits for it.
   *
   * @returns An observable of whether to offer the section.
   */
  isOffered(): Observable<boolean> {
    return this.getConfiguration().pipe(
      map(
        configuration =>
          configuration === null || configuration.features.isEnabled,
      ),
      startWith(false),
      distinctUntilChanged(),
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
