import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  Arc,
  ArcMembership,
  ArcRequest,
  ArcWithStories,
  ManagedArc,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Arcs: reading orders curated across several Stories.
 *
 * Curating one needs sign-in but no creator permission, so the managed calls
 * here are available to anybody with an account — an Arc is a reading order,
 * not a claim on anything.
 */
@Injectable({
  providedIn: 'root',
})
export class ArcService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  // ----- Reading -----

  /**
   * Lists the Arcs anybody may discover.
   *
   * @returns An observable of the public Arcs.
   */
  getArcs(): Observable<Arc[]> {
    return this._http.get<Arc[]>(API_URLS.STORYTIME_ARCS);
  }

  /**
   * Reads one Arc, with the Stories a reader can follow through it.
   *
   * @param arcSlug - The Arc slug.
   * @returns An observable of the Arc and its readable Stories.
   */
  getArc(arcSlug: string): Observable<ArcWithStories> {
    return this._http.get<ArcWithStories>(
      `${API_URLS.STORYTIME_ARCS}/${encodeURIComponent(arcSlug)}`,
    );
  }

  // ----- Curating -----

  /**
   * Lists the Arcs the caller curates.
   *
   * @returns An observable of their Arcs.
   */
  getMyArcs(): Observable<ManagedArc[]> {
    return this.authenticated(options =>
      this._http.get<ManagedArc[]>(API_URLS.STORYTIME_MANAGE_ARCS, options),
    );
  }

  /**
   * Retrieves an Arc for editing.
   *
   * @param arcId - The Arc.
   * @returns An observable of the Arc.
   */
  getMyArc(arcId: string): Observable<ManagedArc> {
    return this.authenticated(options =>
      this._http.get<ManagedArc>(this.manageUrl(arcId), options),
    );
  }

  /**
   * Creates an Arc.
   *
   * @param payload - The Arc to create.
   * @returns An observable of the created Arc.
   */
  createArc(payload: ArcRequest): Observable<ManagedArc> {
    return this.authenticated(options =>
      this._http.post<ManagedArc>(
        API_URLS.STORYTIME_MANAGE_ARCS,
        payload,
        options,
      ),
    );
  }

  /**
   * Updates an Arc.
   *
   * @param arcId - The Arc.
   * @param payload - The changes, including the version last seen.
   * @returns An observable of the updated Arc.
   */
  updateArc(arcId: string, payload: ArcRequest): Observable<ManagedArc> {
    return this.authenticated(options =>
      this._http.patch<ManagedArc>(this.manageUrl(arcId), payload, options),
    );
  }

  /**
   * Publishes an Arc.
   *
   * @param arcId - The Arc.
   * @returns An observable of the published Arc.
   */
  publishArc(arcId: string): Observable<ManagedArc> {
    return this.arcAction(arcId, 'publish');
  }

  /**
   * Withdraws an Arc from publication.
   *
   * @param arcId - The Arc.
   * @returns An observable of the unpublished Arc.
   */
  unpublishArc(arcId: string): Observable<ManagedArc> {
    return this.arcAction(arcId, 'unpublish');
  }

  /**
   * Deletes an Arc.
   *
   * @param arcId - The Arc.
   * @returns An observable that completes when the Arc is deleted.
   */
  deleteArc(arcId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(this.manageUrl(arcId), options),
    );
  }

  // ----- Membership -----

  /**
   * Lists everything in an Arc the caller curates.
   *
   * @param arcId - The Arc.
   * @returns An observable of the memberships, answered or not.
   */
  getArcStories(arcId: string): Observable<ArcMembership[]> {
    return this.authenticated(options =>
      this._http.get<ArcMembership[]>(
        `${this.manageUrl(arcId)}/stories`,
        options,
      ),
    );
  }

  /**
   * Invites a Story into an Arc the caller curates.
   *
   * @param arcId - The Arc.
   * @param storyId - The Story.
   * @returns An observable of the invitation.
   */
  inviteStory(arcId: string, storyId: string): Observable<ArcMembership[]> {
    return this.authenticated(options =>
      this._http.post<ArcMembership[]>(
        `${this.manageUrl(arcId)}/stories`,
        { storyId },
        options,
      ),
    );
  }

  /**
   * Reorders an Arc's reading order.
   *
   * @param arcId - The Arc.
   * @param membershipIds - Every agreed membership, in reading order.
   * @returns An observable of the memberships in their new order.
   */
  reorderArcStories(
    arcId: string,
    membershipIds: string[],
  ): Observable<ArcMembership[]> {
    return this.authenticated(options =>
      this._http.post<ArcMembership[]>(
        `${this.manageUrl(arcId)}/stories/reorder`,
        { membershipIds },
        options,
      ),
    );
  }

  /**
   * Lists the Arc decisions waiting on the caller.
   *
   * Both directions at once: invitations to their Stories and requests to
   * their Arcs are the same kind of thing to the person answering.
   *
   * @returns An observable of the memberships waiting on them.
   */
  getPendingMemberships(): Observable<ArcMembership[]> {
    return this.authenticated(options =>
      this._http.get<ArcMembership[]>(
        `${API_URLS.STORYTIME_ARC_MEMBERSHIPS}/pending`,
        options,
      ),
    );
  }

  /**
   * Offers one of the caller's Stories to an Arc.
   *
   * @param arcId - The Arc.
   * @param storyId - The Story.
   * @returns An observable of the request.
   */
  requestToJoin(arcId: string, storyId: string): Observable<ArcMembership[]> {
    return this.authenticated(options =>
      this._http.post<ArcMembership[]>(
        `${API_URLS.STORYTIME_ARC_MEMBERSHIPS}/arcs/${arcId}/request`,
        { storyId },
        options,
      ),
    );
  }

  /**
   * Agrees to a pending membership.
   *
   * @param membershipId - The membership.
   * @returns An observable of the approved membership.
   */
  approveMembership(membershipId: string): Observable<ArcMembership[]> {
    return this.membershipAction(membershipId, 'approve');
  }

  /**
   * Turns down a pending membership.
   *
   * @param membershipId - The membership.
   * @returns An observable of the declined membership.
   */
  declineMembership(membershipId: string): Observable<ArcMembership[]> {
    return this.membershipAction(membershipId, 'decline');
  }

  /**
   * Takes a Story out of an Arc, from whichever side the caller is on.
   *
   * @param membershipId - The membership.
   * @returns An observable of the ended membership.
   */
  leaveArc(membershipId: string): Observable<ArcMembership[]> {
    return this.membershipAction(membershipId, 'leave');
  }

  /**
   * Builds the curator URL for an Arc.
   *
   * @param arcId - The Arc.
   * @returns The URL.
   */
  private manageUrl(arcId: string): string {
    return `${API_URLS.STORYTIME_MANAGE_ARCS}/${arcId}`;
  }

  /**
   * Performs a state-changing action on an Arc.
   *
   * @param arcId - The Arc.
   * @param action - The action path segment.
   * @returns An observable of the resulting Arc.
   */
  private arcAction(arcId: string, action: string): Observable<ManagedArc> {
    return this.authenticated(options =>
      this._http.post<ManagedArc>(
        `${this.manageUrl(arcId)}/${action}`,
        {},
        options,
      ),
    );
  }

  /**
   * Performs a state-changing action on a membership.
   *
   * @param membershipId - The membership.
   * @param action - The action path segment.
   * @returns An observable of the resulting membership.
   */
  private membershipAction(
    membershipId: string,
    action: string,
  ): Observable<ArcMembership[]> {
    return this.authenticated(options =>
      this._http.post<ArcMembership[]>(
        `${API_URLS.STORYTIME_ARC_MEMBERSHIPS}/${membershipId}/${action}`,
        {},
        options,
      ),
    );
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
