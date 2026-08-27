import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ContentRating,
  STORYTIME_DISABLED_STATE,
  StorytimeConfiguration,
  StorytimeFeatureState,
  StorytimeLanguage,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * The Storytime client configuration: which parts of the feature are switched
 * on, and the languages and ratings the server will accept.
 *
 * Loaded once and shared, because the navigation, the route guard and every
 * editor need the same answer and none of them should trigger its own request.
 *
 * A failed load is treated as "Storytime is unavailable" rather than an error.
 * A client that cannot confirm the feature is on must not advertise it, since
 * showing routes that then fail is worse than showing nothing.
 */
@Injectable({
  providedIn: 'root',
})
export class StorytimeService {
  private readonly _http = inject(HttpClient);

  /** The in-flight or completed configuration request. */
  private _configuration$: Observable<StorytimeConfiguration> | null = null;

  /**
   * Loads the Storytime configuration.
   *
   * @returns An observable of the configuration.
   */
  getConfiguration(): Observable<StorytimeConfiguration> {
    this._configuration$ ??= this.loadConfiguration();
    return this._configuration$;
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
   * @returns An observable emitting true when the feature is enabled.
   */
  isEnabled(): Observable<boolean> {
    return this.getFeatureState().pipe(map(features => features.isEnabled));
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
   * Requests the configuration from the API.
   *
   * @returns An observable of the configuration.
   */
  private loadConfiguration(): Observable<StorytimeConfiguration> {
    return this._http
      .get<StorytimeConfiguration>(API_URLS.STORYTIME_CONFIGURATION)
      .pipe(
        catchError(() =>
          of<StorytimeConfiguration>({
            features: STORYTIME_DISABLED_STATE,
            languages: [],
            defaultLanguageCode: 'en',
            contentRatings: [ContentRating.GENERAL],
          }),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
  }
}
