import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { AcceptedAsset } from 'src/app/shared/services/asset-scan.service';

import { FLEET_IMAGE_SPECS, FleetImageSlot } from './fleet-image.constants';

/** Which record's artwork is being changed. */
export type FleetArtworkTarget =
  | { readonly kind: 'COMMUNITY'; readonly communityId: string }
  | {
      readonly kind: 'FLEET';
      readonly communityId: string;
      readonly fleetId: string;
    }
  | {
      readonly kind: 'ARMADA';
      readonly communityId: string;
      readonly armadaId: string;
    }
  /**
   * A Fleet no Community has registered.
   *
   * Its own kind rather than a `FLEET` with a null Community, because it is
   * reached by a different route under a different rule. Making it a variant
   * the type system can tell apart is what stops a record under the lenient
   * rule being addressed as though it were under the strict one.
   */
  | { readonly kind: 'STANDALONE_FLEET'; readonly fleetId: string };

/**
 * Setting and removing the banner and emblem a Fleet scope shows.
 *
 * One service for all four kinds of record, because they differ only in
 * where they post to.
 *
 * **An upload does not answer with the record.** The picture is held
 * privately and scanned before anything points at it, so the answer is an
 * asset to ask about and the scope goes on showing whatever it had until the
 * verdict is in — FC-012. Removal is immediate, and answers with nothing.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetImageService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Uploads a cropped picture into one of a record's artwork slots.
   *
   * The description travels with the picture rather than following in a
   * later save, so a record can never briefly show artwork nobody has
   * described.
   *
   * @param target - Whose artwork is being set.
   * @param slot - The banner or the emblem.
   * @param image - The cropped picture.
   * @param altText - What it shows.
   * @returns An observable of the upload to ask about.
   */
  upload(
    target: FleetArtworkTarget,
    slot: FleetImageSlot,
    image: Blob,
    altText: string,
  ): Observable<AcceptedAsset> {
    const spec = FLEET_IMAGE_SPECS[slot];
    const formData = new FormData();

    formData.append('image', image, `${spec.endpoint}.${spec.outputFormat}`);
    formData.append('altText', altText);

    return this.authenticated(options =>
      this._http.post<AcceptedAsset>(
        this.urlFor(target, slot),
        formData,
        options,
      ),
    );
  }

  /**
   * Takes the picture out of one of a record's artwork slots.
   *
   * @param target - Whose artwork is being removed.
   * @param slot - The banner or the emblem.
   * @returns An observable that completes when it has gone.
   */
  remove(target: FleetArtworkTarget, slot: FleetImageSlot): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(this.urlFor(target, slot), options),
    );
  }

  /**
   * Builds the address of one record's artwork slot.
   *
   * @param target - Whose artwork it is.
   * @param slot - The banner or the emblem.
   * @returns The endpoint to call.
   */
  private urlFor(target: FleetArtworkTarget, slot: FleetImageSlot): string {
    return `${this.recordUrlFor(target)}/${FLEET_IMAGE_SPECS[slot].endpoint}`;
  }

  /**
   * Builds the address of the record itself.
   *
   * Every branch is named rather than defaulted, so a fifth kind of record
   * is a compile error here instead of a Community's artwork quietly being
   * written.
   *
   * @param target - Whose artwork it is.
   * @returns The record's address.
   */
  private recordUrlFor(target: FleetArtworkTarget): string {
    const communities = API_URLS.FLEET_COMMUNITIES;

    switch (target.kind) {
      case 'COMMUNITY':
        return `${communities}/${target.communityId}`;
      case 'FLEET':
        return `${communities}/${target.communityId}/fleets/${target.fleetId}`;
      case 'ARMADA':
        return `${communities}/${target.communityId}/armadas/${target.armadaId}`;
      // Outside the Community collection entirely, because there is no
      // Community to nest it under and the rule it is held to is a different
      // one.
      case 'STANDALONE_FLEET':
        return `${API_URLS.FLEETS}/${target.fleetId}`;
    }
  }

  /**
   * Runs a request with the access token attached.
   *
   * @param request - Builds the request from the authenticated options.
   * @returns The request's observable, or an error when there is no token.
   */
  private authenticated<T>(
    request: (options: { headers: HttpHeaders }) => Observable<T>,
  ): Observable<T> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return request(httpOptions);
  }
}
