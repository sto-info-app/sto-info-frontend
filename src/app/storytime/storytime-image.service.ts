import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { AcceptedAsset } from 'src/app/shared/services/asset-scan.service';
import {
  STORYTIME_IMAGE_SPECS,
  StorytimeImageSlot,
} from './storytime-image.constants';

/**
 * Where each kind of work's artwork endpoints live.
 *
 * Kept beside the slot rather than derived from what is being edited, because
 * a Chapter cover and a Story banner are managed from different collections
 * and the component setting one has no reason to know which.
 */
const SLOT_COLLECTIONS: Record<StorytimeImageSlot, string> = {
  [StorytimeImageSlot.STORY_BANNER]: API_URLS.STORYTIME_MANAGE_STORIES,
  [StorytimeImageSlot.STORY_PROFILE]: API_URLS.STORYTIME_MANAGE_STORIES,
  [StorytimeImageSlot.CHAPTER_COVER]: API_URLS.STORYTIME_MANAGE_CHAPTERS,
  [StorytimeImageSlot.CHARACTER_PORTRAIT]: API_URLS.STORYTIME_MANAGE_CHARACTERS,
  [StorytimeImageSlot.ARC_BANNER]: API_URLS.STORYTIME_MANAGE_ARCS,
  [StorytimeImageSlot.ARC_PROFILE]: API_URLS.STORYTIME_MANAGE_ARCS,
  [StorytimeImageSlot.SPOTLIGHT_OVERRIDE]: API_URLS.STORYTIME_ADMIN_SPOTLIGHT,
};

/**
 * Setting and removing the artwork on Storytime works.
 *
 * One service for every slot, because they differ only in where they post to.
 *
 * **An upload no longer answers with the work.** Since FC-012 a picture is
 * held privately and scanned before anything points at it, so the answer is
 * an asset to ask about; the work is fetched again once the scan clears,
 * which is what {@link reload} is for. Removal still answers with the work,
 * because taking a picture away happens immediately.
 */
@Injectable({
  providedIn: 'root',
})
export class StorytimeImageService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Uploads a cropped image into one of a work's artwork slots.
   *
   * The description travels with the picture rather than following in a later
   * save, so a work can never briefly hold artwork nobody has described.
   *
   * @param slot - Which piece of artwork is being set.
   * @param targetId - The work the artwork belongs to.
   * @param image - The cropped image.
   * @param altText - What the image shows.
   * @returns An observable of the upload to ask about.
   */
  upload(
    slot: StorytimeImageSlot,
    targetId: string,
    image: Blob,
    altText: string,
  ): Observable<AcceptedAsset> {
    const spec = STORYTIME_IMAGE_SPECS[slot];
    const formData = new FormData();

    formData.append('image', image, `${spec.endpoint}.${spec.outputFormat}`);
    formData.append('altText', altText);

    return this.authenticated(options =>
      this._http.post<AcceptedAsset>(
        this.urlFor(slot, targetId),
        formData,
        options,
      ),
    );
  }

  /**
   * Fetches the work as the server now holds it.
   *
   * Asked once a scanner has cleared an upload, because that is the moment
   * the work acquired the picture and nothing on this side knows what
   * address Cloudflare gave it.
   *
   * @param slot - Which slot was set, which says where the work lives.
   * @param targetId - The work.
   * @returns An observable of the work.
   */
  reload<T>(slot: StorytimeImageSlot, targetId: string): Observable<T> {
    return this.authenticated(options =>
      this._http.get<T>(this.workUrlFor(slot, targetId), options),
    );
  }

  /**
   * Removes the artwork from one of a work's slots.
   *
   * @param slot - Which piece of artwork is being removed.
   * @param targetId - The work the artwork belongs to.
   * @returns An observable of the work, without that artwork.
   */
  remove<T>(slot: StorytimeImageSlot, targetId: string): Observable<T> {
    return this.authenticated(options =>
      this._http.delete<T>(this.urlFor(slot, targetId), options),
    );
  }

  /**
   * Builds the address of a work's artwork slot.
   *
   * @param slot - The slot.
   * @param targetId - The work.
   * @returns The endpoint to call.
   */
  private urlFor(slot: StorytimeImageSlot, targetId: string): string {
    return `${this.workUrlFor(slot, targetId)}/${STORYTIME_IMAGE_SPECS[slot].endpoint}`;
  }

  /**
   * Builds the address of the work itself.
   *
   * @param slot - The slot, which says which collection the work is in.
   * @param targetId - The work.
   * @returns The endpoint to call.
   */
  private workUrlFor(slot: StorytimeImageSlot, targetId: string): string {
    return `${SLOT_COLLECTIONS[slot]}/${targetId}`;
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
