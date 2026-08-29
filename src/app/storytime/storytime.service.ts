import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ContentRating,
  STORYTIME_AVAILABILITY_DISABLED,
  STORYTIME_AVAILABILITY_ENABLED,
  STORYTIME_AVAILABILITY_UNAVAILABLE,
  STORYTIME_DISABLED_STATE,
  StorytimeAvailability,
  StorytimeConfiguration,
  StorytimeFeatureState,
  StorytimeLanguage,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * One configuration load, together with whether the server actually answered.
 *
 * The fallback configuration is indistinguishable from a real one that happens
 * to have everything switched off, so whether the answer came from the server
 * is carried alongside it rather than inferred from its contents.
 */
interface StorytimeConfigurationResult {
  configuration: StorytimeConfiguration;
  isAvailable: boolean;
}

/**
 * The Storytime client configuration: which parts of the feature are switched
 * on, and the languages and ratings the server will accept.
 *
 * Loaded once and shared, because the navigation, the route guard and every
 * editor need the same answer and none of them should trigger its own request.
 *
 * A failed load is treated as "Storytime is unavailable" rather than an error.
 * A client that cannot confirm the feature is on must not advertise it, since
 * showing routes that then fail is worse than showing nothing. A failure is
 * deliberately not cached: an outage that lasted one request would otherwise
 * keep Storytime switched off for the rest of the visit.
 */
@Injectable({
  providedIn: 'root',
})
export class StorytimeService {
  private readonly _http = inject(HttpClient);

  /** The in-flight or completed configuration request. */
  private _configuration$: Observable<StorytimeConfigurationResult> | null =
    null;

  /**
   * Loads the Storytime configuration.
   *
   * @returns An observable of the configuration.
   */
  getConfiguration(): Observable<StorytimeConfiguration> {
    return this.getConfigurationResult().pipe(
      map(result => result.configuration),
    );
  }

  /**
   * Reports which parts of Storytime are switched on.
   *
   * @returns An observable of the feature state.
   */
  getFeatureState(): Observable<StorytimeFeatureState> {
    return this.getConfiguration().pipe(
      map(configuration => configuration.features),
    );
  }

  /**
   * Determines whether Storytime is available at all.
   *
   * Answers false both when the server says the feature is off and when the
   * server could not be asked, which is what navigation wants: neither case
   * should advertise the feature. Callers that must tell the two apart — a
   * route guard choosing between a not-found page and a service interruption
   * page — should use {@link getAvailability} instead.
   *
   * @returns An observable emitting true when the feature is enabled.
   */
  isEnabled(): Observable<boolean> {
    return this.getFeatureState().pipe(map(features => features.isEnabled));
  }

  /**
   * Reports whether Storytime may be reached, and why not when it may not.
   *
   * @returns An observable of the availability.
   */
  getAvailability(): Observable<StorytimeAvailability> {
    return this.getConfigurationResult().pipe(
      map(result => {
        if (!result.isAvailable) {
          return STORYTIME_AVAILABILITY_UNAVAILABLE;
        }

        return result.configuration.features.isEnabled
          ? STORYTIME_AVAILABILITY_ENABLED
          : STORYTIME_AVAILABILITY_DISABLED;
      }),
    );
  }

  /**
   * Lists the languages a creator may choose from.
   *
   * @returns An observable of the available languages.
   */
  getLanguages(): Observable<StorytimeLanguage[]> {
    return this.getConfiguration().pipe(
      map(configuration => configuration.languages),
    );
  }

  /**
   * Discards the cached configuration so the next request reloads it.
   *
   * Call after an administrator changes the feature switches, so the change is
   * visible without a page reload.
   */
  refresh(): void {
    this._configuration$ = null;
  }

  /**
   * Returns the shared configuration load, starting one if none has run.
   *
   * @returns An observable of the configuration and whether the server answered.
   */
  private getConfigurationResult(): Observable<StorytimeConfigurationResult> {
    this._configuration$ ??= this.loadConfiguration();
    return this._configuration$;
  }

  /**
   * Requests the configuration from the API.
   *
   * @returns An observable of the configuration and whether the server answered.
   */
  private loadConfiguration(): Observable<StorytimeConfigurationResult> {
    return this._http
      .get<StorytimeConfiguration>(API_URLS.STORYTIME_CONFIGURATION)
      .pipe(
        map(configuration => ({ configuration, isAvailable: true })),
        catchError(() => {
          // Drop the cache so the next caller asks again. Callers already
          // subscribed still receive the fallback below; only the next one
          // pays for a fresh request, so a brief outage does not switch
          // Storytime off for the rest of the visit.
          this._configuration$ = null;

          return of<StorytimeConfigurationResult>({
            configuration: {
              features: STORYTIME_DISABLED_STATE,
              languages: [],
              defaultLanguageCode: 'en',
              contentRatings: [ContentRating.GENERAL],
            },
            isAvailable: false,
          });
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
  }
}
