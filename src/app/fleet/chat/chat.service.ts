import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ChatChannel,
  ChatChannelInput,
  ChatConversation,
  ChatMessagePage,
  ChatPerson,
  ChatPlace,
  ChatReportInput,
  ChatScopeChannels,
  ChatScopeTarget,
  ChatTranscript,
  ChatTranscriptRequest,
} from 'src/app/models/fleet-chat.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Chat over HTTP (FC-031, FC-033): the reader's channels and conversations,
 * older messages, deleting, the mention list, and running a scope's custom
 * channels; and reports and transcripts (FC-035). What arrives live comes
 * through `ChatSocketService`.
 *
 * Every call needs the access token and is refused without one.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists every channel the reader may read, scope by scope.
   *
   * @returns Communities first, then Armadas, then Fleets.
   */
  channels(): Observable<ChatScopeChannels[]> {
    return this.authenticated(options =>
      this._http.get<ChatScopeChannels[]>(`${API_URLS.CHAT}/channels`, options),
    );
  }

  /**
   * Lists the reader's conversations with friends.
   *
   * @returns Each, by the friend's name.
   */
  conversations(): Observable<ChatConversation[]> {
    return this.authenticated(options =>
      this._http.get<ChatConversation[]>(`${API_URLS.CHAT}/direct`, options),
    );
  }

  /**
   * Opens the conversation with a friend, named by their ID or, from a
   * profile that names no ID, by the friendship.
   *
   * @param friend - The friend, or the friendship.
   * @returns The conversation.
   */
  open(
    friend: { userId: string } | { friendshipId: string },
  ): Observable<ChatConversation> {
    return this.authenticated(options =>
      this._http.post<ChatConversation>(
        `${API_URLS.CHAT}/direct`,
        friend,
        options,
      ),
    );
  }

  /**
   * Reads the page before a cursor.
   *
   * @param place - The channel or conversation.
   * @param before - Where the page before starts.
   * @returns The page, oldest first.
   */
  older(place: ChatPlace, before: string): Observable<ChatMessagePage> {
    const url =
      place.channelId === undefined
        ? `${API_URLS.CHAT}/direct/${place.conversationId}/messages`
        : `${API_URLS.CHAT}/channels/${place.channelId}/messages`;

    return this.authenticated(options =>
      this._http.get<ChatMessagePage>(url, {
        ...options,
        params: new HttpParams().set('before', before),
      }),
    );
  }

  /**
   * Deletes a message: the reader's own, or one a moderator removes with a
   * reason.
   *
   * @param messageId - The message.
   * @param reason - Why, for somebody else's.
   * @returns When it is done.
   */
  remove(messageId: string, reason?: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(`${API_URLS.CHAT}/messages/${messageId}`, {
        ...options,
        body: reason === undefined ? {} : { reason },
      }),
    );
  }

  /**
   * Finds people who can read a channel, for a mention.
   *
   * @param channelId - The channel.
   * @param q - The start of their username.
   * @returns Up to ten.
   */
  people(channelId: string, q: string): Observable<ChatPerson[]> {
    return this.authenticated(options =>
      this._http.get<ChatPerson[]>(
        `${API_URLS.CHAT}/channels/${channelId}/people`,
        { ...options, params: new HttpParams().set('q', q) },
      ),
    );
  }

  /**
   * Reports a message to the site's admins (FC-035). Nothing comes back: the
   * reporter is never told the outcome.
   *
   * @param messageId - The message.
   * @param input - Why.
   * @returns When it is received.
   */
  report(messageId: string, input: ChatReportInput): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${API_URLS.CHAT}/messages/${messageId}/report`,
        input,
        options,
      ),
    );
  }

  /**
   * Asks for a transcript of a channel (FC-035).
   *
   * @param channelId - The channel.
   * @param request - The range and the purpose.
   * @returns The transcript, waiting to be written.
   */
  requestTranscript(
    channelId: string,
    request: ChatTranscriptRequest,
  ): Observable<ChatTranscript> {
    return this.authenticated(options =>
      this._http.post<ChatTranscript>(
        `${API_URLS.CHAT}/channels/${channelId}/transcripts`,
        request,
        options,
      ),
    );
  }

  /**
   * Lists the transcripts the reader asked for in the last day (FC-035).
   *
   * @returns Each, newest first.
   */
  transcripts(): Observable<ChatTranscript[]> {
    return this.authenticated(options =>
      this._http.get<ChatTranscript[]>(`${API_URLS.CHAT}/transcripts`, options),
    );
  }

  /**
   * Fetches a written transcript, which a plain link could not, since it
   * needs the reader's token (FC-035).
   *
   * @param transcriptId - The transcript.
   * @returns Its text.
   */
  downloadTranscript(transcriptId: string): Observable<Blob> {
    return this.authenticated(options =>
      this._http.get(`${API_URLS.CHAT}/transcripts/${transcriptId}/download`, {
        ...options,
        responseType: 'blob',
      }),
    );
  }

  /**
   * Adds a custom channel.
   *
   * @param target - The scope.
   * @param input - Its name, and who may read and post.
   * @returns The channel.
   */
  create(
    target: ChatScopeTarget,
    input: ChatChannelInput,
  ): Observable<ChatChannel> {
    return this.authenticated(options =>
      this._http.post<ChatChannel>(this.channelsUrl(target), input, options),
    );
  }

  /**
   * Renames a custom channel, or changes who may read and post.
   *
   * @param target - The scope.
   * @param channelId - The channel.
   * @param input - Its name, and who may read and post.
   * @returns The channel.
   */
  update(
    target: ChatScopeTarget,
    channelId: string,
    input: ChatChannelInput,
  ): Observable<ChatChannel> {
    return this.authenticated(options =>
      this._http.patch<ChatChannel>(
        `${this.channelsUrl(target)}/${channelId}`,
        input,
        options,
      ),
    );
  }

  /**
   * Archives a custom channel.
   *
   * @param target - The scope.
   * @param channelId - The channel.
   * @returns When it is done.
   */
  archive(target: ChatScopeTarget, channelId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.channelsUrl(target)}/${channelId}/archive`,
        {},
        options,
      ),
    );
  }

  /**
   * Where a scope's channels are.
   *
   * @param target - The scope.
   * @returns Its URL.
   */
  private channelsUrl(target: ChatScopeTarget): string {
    const community = `${API_URLS.FLEET_COMMUNITIES}/${target.communityId}`;

    if (target.fleetId !== null) {
      return `${community}/fleets/${target.fleetId}/chat/channels`;
    }

    if (target.armadaId !== null) {
      return `${community}/armadas/${target.armadaId}/chat/channels`;
    }

    return `${community}/chat/channels`;
  }

  /**
   * Runs a request with the access token, or refuses without one.
   *
   * @param request - The request.
   * @returns Its answer.
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
