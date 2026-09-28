import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { GovernanceTarget } from 'src/app/fleet/governance/fleet-governance.service';
import {
  FleetNewsDraft,
  FleetNewsPage,
  FleetNewsPost,
  FleetNewsPostView,
  FleetNewsQuery,
} from 'src/app/models/fleet-news.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * A Community's, a Fleet's or an Armada's news (FC-027).
 *
 * Reading goes with the access token when there is one and without it when
 * there is not: a public post is for signed-out readers too, and which posts
 * a reader is shown is the server's answer. Everything else needs the token
 * and is refused here without one.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetNewsService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads a page of the scope's posts the reader may see.
   *
   * @param target - The scope.
   * @param query - Which page, which words, and published or drafts.
   * @returns The page.
   */
  list(
    target: GovernanceTarget,
    query: FleetNewsQuery,
  ): Observable<FleetNewsPage> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params = params.set(key, value);
      }
    }

    return this._http.get<FleetNewsPage>(this.newsUrl(target), {
      ...(this._authService.getHttpOptionsWithAccessToken() ?? {}),
      params,
    });
  }

  /**
   * Reads one post.
   *
   * @param target - The scope.
   * @param slug - The post's address.
   * @returns The post, and what the reader may do.
   */
  read(target: GovernanceTarget, slug: string): Observable<FleetNewsPostView> {
    return this._http.get<FleetNewsPostView>(
      `${this.newsUrl(target)}/${encodeURIComponent(slug)}`,
      this._authService.getHttpOptionsWithAccessToken() ?? {},
    );
  }

  /**
   * Writes a new post, as a draft.
   *
   * @param target - The scope.
   * @param draft - The post.
   * @returns The draft.
   */
  create(
    target: GovernanceTarget,
    draft: FleetNewsDraft,
  ): Observable<FleetNewsPost> {
    return this.authenticated(options =>
      this._http.post<FleetNewsPost>(this.newsUrl(target), draft, options),
    );
  }

  /**
   * Changes a post.
   *
   * @param target - The scope.
   * @param postId - The post.
   * @param draft - The post as it should now be.
   * @returns The post as it now is.
   */
  update(
    target: GovernanceTarget,
    postId: string,
    draft: FleetNewsDraft,
  ): Observable<FleetNewsPost> {
    return this.authenticated(options =>
      this._http.patch<FleetNewsPost>(
        `${this.newsUrl(target)}/${postId}`,
        draft,
        options,
      ),
    );
  }

  /**
   * Publishes a post now.
   *
   * @param target - The scope.
   * @param postId - The post.
   * @returns The post as it now is.
   */
  publish(target: GovernanceTarget, postId: string): Observable<FleetNewsPost> {
    return this.authenticated(options =>
      this._http.post<FleetNewsPost>(
        `${this.newsUrl(target)}/${postId}/publish`,
        {},
        options,
      ),
    );
  }

  /**
   * Takes a post back to a draft.
   *
   * @param target - The scope.
   * @param postId - The post.
   * @returns The post as it now is.
   */
  unpublish(
    target: GovernanceTarget,
    postId: string,
  ): Observable<FleetNewsPost> {
    return this.authenticated(options =>
      this._http.post<FleetNewsPost>(
        `${this.newsUrl(target)}/${postId}/unpublish`,
        {},
        options,
      ),
    );
  }

  /**
   * Deletes a post.
   *
   * @param target - The scope.
   * @param postId - The post.
   * @returns Completes when it is gone.
   */
  remove(target: GovernanceTarget, postId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(`${this.newsUrl(target)}/${postId}`, options),
    );
  }

  /**
   * Takes a post back to a draft, as a site administrator.
   *
   * @param postId - The post.
   * @returns Completes when it is done.
   */
  unpublishAsSiteAdmin(postId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${API_URLS.FLEET_NEWS_ADMIN}/${postId}/unpublish`,
        {},
        options,
      ),
    );
  }

  /**
   * Deletes a post, as a site administrator.
   *
   * @param postId - The post.
   * @returns Completes when it is gone.
   */
  removeAsSiteAdmin(postId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${API_URLS.FLEET_NEWS_ADMIN}/${postId}`,
        options,
      ),
    );
  }

  /**
   * Where a scope's news is.
   *
   * @param target - The scope.
   * @returns The collection's URL.
   */
  private newsUrl(target: GovernanceTarget): string {
    const community = `${API_URLS.FLEET_COMMUNITIES}/${target.communityId}`;

    if (target.fleetId !== null) {
      return `${community}/fleets/${target.fleetId}/news`;
    }

    if (target.armadaId) {
      return `${community}/armadas/${target.armadaId}/news`;
    }

    return `${community}/news`;
  }

  /**
   * Sends a request that needs the access token, or refuses without one.
   *
   * @param request - The request, given the options carrying the token.
   * @returns Its response.
   */
  private authenticated<T>(
    request: (options: { headers: HttpHeaders }) => Observable<T>,
  ): Observable<T> {
    const options = this._authService.getHttpOptionsWithAccessToken();

    if (!options) {
      return throwError(() => new Error('No token found'));
    }

    return request(options);
  }
}
