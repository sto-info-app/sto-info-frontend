import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import {
  BlockedMember,
  CommunitySummary,
  CreateBlockRequest,
  CreateFriendRequest,
  Friend,
  FriendRequest,
  FriendRequestDirection,
  FriendsQuery,
  PaginatedFriends,
} from './models/community.models';

/**
 * Friends, friend requests and blocking.
 *
 * Every endpoint here is authenticated — unlike {@link RegistryService}, whose
 * reads are public — so each call attaches the access token and fails fast when
 * there is none.
 *
 * Maintains a reactive summary stream so the friends page tab badges update
 * after an action without every consumer refetching.
 */
@Injectable({
  providedIn: 'root',
})
export class CommunityService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  private readonly _summarySubject = new BehaviorSubject<CommunitySummary>({
    friendCount: 0,
    incomingRequestCount: 0,
    outgoingRequestCount: 0,
    blockedCount: 0,
  });

  /** Emits the viewer's current friend, request and block counts. */
  public readonly summary$ = this._summarySubject.asObservable();

  // ----- Summary -----

  /**
   * Fetches the viewer's community counts and pushes them onto
   * {@link summary$}.
   *
   * @returns An observable of the counts.
   */
  getSummary(): Observable<CommunitySummary> {
    return this.authenticated<CommunitySummary>(options =>
      this._http
        .get<CommunitySummary>(API_URLS.COMMUNITY_SUMMARY, options)
        .pipe(tap(summary => this._summarySubject.next(summary))),
    );
  }

  // ----- Friends -----

  /**
   * Lists the viewer's friends.
   *
   * @param query - Optional search and pagination options.
   * @returns An observable of the paginated friends.
   */
  getFriends(query: FriendsQuery = {}): Observable<PaginatedFriends> {
    return this.authenticated<PaginatedFriends>(options =>
      this._http.get<PaginatedFriends>(API_URLS.COMMUNITY_FRIENDS, {
        ...options,
        params: this.buildFriendsParams(query),
      }),
    );
  }

  /**
   * Ends a friendship.
   *
   * @param friendshipId - The friendship to end.
   * @returns An observable that completes when the friendship is removed.
   */
  removeFriend(friendshipId: string): Observable<void> {
    return this.authenticated<void>(options =>
      this._http.delete<void>(
        `${API_URLS.COMMUNITY_FRIENDS}/${friendshipId}`,
        options,
      ),
    );
  }

  // ----- Friend requests -----

  /**
   * Lists the viewer's pending friend requests in one direction.
   *
   * @param direction - Whether to list requests received or sent.
   * @returns An observable of the pending requests.
   */
  getFriendRequests(
    direction: FriendRequestDirection,
  ): Observable<FriendRequest[]> {
    return this.authenticated<FriendRequest[]>(options =>
      this._http.get<FriendRequest[]>(API_URLS.COMMUNITY_FRIEND_REQUESTS, {
        ...options,
        params: new HttpParams().set('direction', direction),
      }),
    );
  }

  /**
   * Sends a friend request.
   *
   * The API answers with the resulting friendship instead of a request when
   * the recipient had already asked, which turns this into an acceptance.
   *
   * @param payload - The recipient's username.
   * @returns An observable of the request, or the resulting friendship.
   */
  sendFriendRequest(
    payload: CreateFriendRequest,
  ): Observable<FriendRequest | Friend> {
    return this.authenticated<FriendRequest | Friend>(options =>
      this._http.post<FriendRequest | Friend>(
        API_URLS.COMMUNITY_FRIEND_REQUESTS,
        payload,
        options,
      ),
    );
  }

  /**
   * Accepts a friend request addressed to the viewer.
   *
   * @param friendshipId - The request to accept.
   * @returns An observable of the resulting friendship.
   */
  acceptFriendRequest(friendshipId: string): Observable<Friend> {
    return this.authenticated<Friend>(options =>
      this._http.post<Friend>(
        `${API_URLS.COMMUNITY_FRIEND_REQUESTS}/${friendshipId}/accept`,
        {},
        options,
      ),
    );
  }

  /**
   * Declines a friend request addressed to the viewer.
   *
   * @param friendshipId - The request to decline.
   * @returns An observable that completes when the request is declined.
   */
  declineFriendRequest(friendshipId: string): Observable<void> {
    return this.authenticated<void>(options =>
      this._http.post<void>(
        `${API_URLS.COMMUNITY_FRIEND_REQUESTS}/${friendshipId}/decline`,
        {},
        options,
      ),
    );
  }

  /**
   * Withdraws a request the viewer sent.
   *
   * @param friendshipId - The request to withdraw.
   * @returns An observable that completes when the request is withdrawn.
   */
  cancelFriendRequest(friendshipId: string): Observable<void> {
    return this.authenticated<void>(options =>
      this._http.delete<void>(
        `${API_URLS.COMMUNITY_FRIEND_REQUESTS}/${friendshipId}`,
        options,
      ),
    );
  }

  // ----- Blocking -----

  /**
   * Lists the members the viewer has blocked.
   *
   * @returns An observable of the viewer's blocks.
   */
  getBlockedMembers(): Observable<BlockedMember[]> {
    return this.authenticated<BlockedMember[]>(options =>
      this._http.get<BlockedMember[]>(API_URLS.COMMUNITY_BLOCKS, options),
    );
  }

  /**
   * Blocks a member.
   *
   * @param payload - The member to block and an optional private note.
   * @returns An observable of the block.
   */
  blockMember(payload: CreateBlockRequest): Observable<BlockedMember> {
    return this.authenticated<BlockedMember>(options =>
      this._http.post<BlockedMember>(
        API_URLS.COMMUNITY_BLOCKS,
        payload,
        options,
      ),
    );
  }

  /**
   * Lifts a block.
   *
   * @param blockId - The block to lift.
   * @returns An observable that completes when the block is lifted.
   */
  unblockMember(blockId: string): Observable<void> {
    return this.authenticated<void>(options =>
      this._http.delete<void>(
        `${API_URLS.COMMUNITY_BLOCKS}/${blockId}`,
        options,
      ),
    );
  }

  /**
   * Runs a request with the access token attached, or fails when there is no
   * token to attach.
   *
   * @param request - Builds the request from the resolved HTTP options.
   * @returns The request's observable, or one that errors when signed out.
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

  /**
   * Builds the friend listing query string, omitting any unset value.
   *
   * @param query - The friends query.
   * @returns The HTTP params to send.
   */
  private buildFriendsParams(query: FriendsQuery): HttpParams {
    let params = new HttpParams();

    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('pageSize', String(query.pageSize));
    }

    return params;
  }
}
