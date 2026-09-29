import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { catchError, map, Observable, of, switchMap, timer } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { ChatPresence } from 'src/app/models/fleet-chat.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

/** How often presence is read again while shown, in milliseconds. */
export const CHAT_PRESENCE_POLL_MS = 60_000;

/** The most usernames one request asks about, as the server allows. */
const PER_REQUEST = 50;

/**
 * Who is online, as the reader may know it (FC-034), for the places that
 * show it: chat's direct messages, the friends list, and a member's profile.
 *
 * The server answers only for the people the reader may see, and says nobody
 * else is online, so a page never learns more than a dot. Read again every
 * minute while shown, since somebody drops off a minute after their last
 * heartbeat.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatPresenceService {
  private readonly _http = inject(HttpClient);
  private readonly _auth = inject(AuthService);
  private readonly _configuration = inject(FleetConfigurationService);

  /**
   * Who of some people is online now, and again every minute.
   *
   * @param usernames - The people.
   * @returns The usernames online, each time it is read; none on a failure,
   *   or while chat is off.
   */
  watch(usernames: readonly string[]): Observable<ReadonlySet<string>> {
    return this._configuration
      .getFeatures()
      .pipe(
        switchMap(features =>
          features.chatEnabled
            ? timer(0, CHAT_PRESENCE_POLL_MS).pipe(
                switchMap(() => this.online(usernames)),
              )
            : of(new Set<string>()),
        ),
      );
  }

  /**
   * Who of some people is online now.
   *
   * @param usernames - The people.
   * @returns The usernames online; none on a failure or signed out.
   */
  online(usernames: readonly string[]): Observable<ReadonlySet<string>> {
    const options = this._auth.getHttpOptionsWithAccessToken();
    const asked = [...new Set(usernames)].slice(0, PER_REQUEST);

    if (options === null || asked.length === 0) {
      return of(new Set<string>());
    }

    return this._http
      .get<ChatPresence[]>(`${API_URLS.CHAT}/presence`, {
        ...options,
        params: new HttpParams().set('usernames', asked.join(',')),
      })
      .pipe(
        map(
          answers =>
            new Set(
              answers
                .filter(answer => answer.online)
                .map(answer => answer.username),
            ) as ReadonlySet<string>,
        ),
        catchError(() => of(new Set<string>())),
      );
  }
}
