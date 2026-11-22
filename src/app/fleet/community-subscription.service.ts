import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  CommunityFollowState,
  FollowedCommunity,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Following a Fleet Community.
 *
 * Both writes answer with the state rather than with nothing, so a page
 * redraws the control and the count from one response instead of following
 * a write with a read and showing a stale number in between.
 *
 * Nothing here decides whether following is allowed. A Community the caller
 * may not see answers 404 to the follow just as it does to the read, which
 * is the server's rule and not one worth keeping a second copy of.
 */
@Injectable({ providedIn: 'root' })
export class CommunitySubscriptionService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Follows a Community.
   *
   * @param communityId - The Community to follow.
   * @returns An observable of the state afterwards.
   */
  follow(communityId: string): Observable<CommunityFollowState> {
    return this._http.post<CommunityFollowState>(
      this.followUrl(communityId),
      {},
      this.options(),
    );
  }

  /**
   * Stops following a Community.
   *
   * @param communityId - The Community to stop following.
   * @returns An observable of the state afterwards.
   */
  unfollow(communityId: string): Observable<CommunityFollowState> {
    return this._http.delete<CommunityFollowState>(
      this.followUrl(communityId),
      this.options(),
    );
  }

  /**
   * Lists the Communities the caller follows, newest first.
   *
   * @returns An observable of what they follow and may still see.
   */
  listFollowed(): Observable<FollowedCommunity[]> {
    return this._http.get<FollowedCommunity[]>(
      `${API_URLS.FLEET_COMMUNITIES}/followed`,
      this.options(),
    );
  }

  /**
   * The address of one Community's follow state.
   *
   * @param communityId - The Community.
   * @returns The URL.
   */
  private followUrl(communityId: string): string {
    return `${API_URLS.FLEET_COMMUNITIES}/${communityId}/follow`;
  }

  /**
   * The caller's token, where they have one.
   *
   * @returns The request options.
   */
  private options(): object {
    return this._authService.getHttpOptionsWithAccessToken() ?? {};
  }
}
