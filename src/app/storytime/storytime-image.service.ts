import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
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
 * Each call returns the work as the server now holds it, so the editor that
 * asked can show the new picture without guessing at the URL Cloudflare will
 * serve it from.
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
   * @returns An observable of the work, carrying its new artwork.
   */
  upload<T>(
    slot: StorytimeImageSlot,
    targetId: string,
    image: Blob,
    altText: string,
  ): Observable<T> {
    const spec = STORYTIME_IMAGE_SPECS[slot];
    const formData = new FormData();

    formData.append('image', image, `${spec.endpoint}.${spec.outputFormat}`);
    formData.append('altText', altText);

    return this.authenticated(options =>
      this._http.post<T>(this.urlFor(slot, targetId), formData, options),
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
    return `${SLOT_COLLECTIONS[slot]}/${targetId}/${STORYTIME_IMAGE_SPECS[slot].endpoint}`;
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
