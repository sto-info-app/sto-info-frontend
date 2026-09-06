import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { CustomTrackingConfiguration } from 'src/app/models/custom-tracking.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * What the server says about Custom Tracking, fetched once per visit.
 *
 * Shared rather than owned by Settings, because the detail pages need it too:
 * a colour recorded by name is painted through the custom property the palette
 * publishes, and a picture is fetched through the delivery variant the server
 * names for its shape. Both of those are statements the server makes, and the
 * one thing that must never happen is a second copy of either living in the
 * frontend — a variant name that has drifted produces a broken picture and no
 * error anywhere.
 *
 * The request needs no token: the configuration describes the feature rather
 * than anybody's data, and an anonymous visitor reading somebody's public page
 * needs the same palette the owner does.
 */
@Injectable({ providedIn: 'root' })
export class CustomTrackingConfigurationService {
  private readonly _http = inject(HttpClient);

  private _configuration?: Observable<CustomTrackingConfiguration>;

  /**
   * Describes the feature: capabilities, field types, palette, limits and the
   * shapes a picture may be cropped to.
   *
   * Cached with `refCount: false`, so a page that unsubscribes before the next
   * one subscribes still gets the answer already fetched rather than asking
   * again.
   *
   * @returns An observable of the configuration, shared between callers.
   */
  getConfiguration(): Observable<CustomTrackingConfiguration> {
    this._configuration ??= this._http
      .get<CustomTrackingConfiguration>(API_URLS.CUSTOM_TRACKING_CONFIGURATION)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    return this._configuration;
  }
}
