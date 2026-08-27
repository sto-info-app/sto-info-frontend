import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ReadingList,
  ReadingListDetail,
  ReadingListRequest,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Reading lists: things a reader has gathered, in the order they mean them.
 *
 * Your own lists need sign-in, private ones included. Somebody else's public
 * lists hang off their creator page and need no account, which is what makes a
 * public list worth sharing.
 */
@Injectable({
  providedIn: 'root',
})
export class ReadingListService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists the reader's own lists, private ones included.
   *
   * @returns An observable of their lists, most recently touched first.
   */
  getMyLists(): Observable<ReadingList[]> {
    return this.authenticated(options =>
      this._http.get<ReadingList[]>(API_URLS.STORYTIME_READING_LISTS, options),
    );
  }

  /**
   * Reads one of the reader's own lists, and what is on it.
   *
   * @param listId - The list.
   * @returns An observable of the list with its items.
   */
  getList(listId: string): Observable<ReadingListDetail> {
    return this.authenticated(options =>
      this._http.get<ReadingListDetail>(
        `${API_URLS.STORYTIME_READING_LISTS}/${listId}`,
        options,
      ),
    );
  }

  /**
   * Reports which of the reader's lists already hold something.
   *
   * Lets a page show where a Story already sits, rather than letting somebody
   * discover it by adding it again.
   *
   * @param targetType - Whether it is a Story or an Arc.
   * @param targetId - The thing.
   * @returns An observable of the identifiers of the lists holding it.
   */
  getListsHolding(
    targetType: StorytimeTargetType,
    targetId: string,
  ): Observable<string[]> {
    return this.authenticated(options =>
      this._http.get<string[]>(`${API_URLS.STORYTIME_READING_LISTS}/holding`, {
        ...options,
        params: new HttpParams()
          .set('targetType', targetType)
          .set('targetId', targetId),
      }),
    );
  }

  /**
   * Makes a list.
   *
   * @param payload - What it is called, and whether anybody may read it.
   * @returns An observable of the list.
   */
  createList(payload: ReadingListRequest): Observable<ReadingList> {
    return this.authenticated(options =>
      this._http.post<ReadingList>(
        API_URLS.STORYTIME_READING_LISTS,
        payload,
        options,
      ),
    );
  }

  /**
   * Changes a list.
   *
   * Renaming re-addresses it, because a list is reached from its owner's page
   * rather than from links pasted years ago.
   *
   * @param listId - The list.
   * @param payload - What to change.
   * @returns An observable of the list as it now stands.
   */
  updateList(
    listId: string,
    payload: ReadingListRequest,
  ): Observable<ReadingList> {
    return this.authenticated(options =>
      this._http.patch<ReadingList>(
        `${API_URLS.STORYTIME_READING_LISTS}/${listId}`,
        payload,
        options,
      ),
    );
  }

  /**
   * Deletes a list.
   *
   * @param listId - The list.
   * @returns An observable that completes when the list is deleted.
   */
  deleteList(listId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${API_URLS.STORYTIME_READING_LISTS}/${listId}`,
        options,
      ),
    );
  }

  /**
   * Puts something on a list.
   *
   * @param listId - The list.
   * @param targetType - Whether it is a Story or an Arc.
   * @param targetId - The thing.
   * @param note - Why it is on the list.
   * @returns An observable of the list with its items.
   */
  addItem(
    listId: string,
    targetType: StorytimeTargetType,
    targetId: string,
    note?: string,
  ): Observable<ReadingListDetail> {
    return this.authenticated(options =>
      this._http.post<ReadingListDetail>(
        `${API_URLS.STORYTIME_READING_LISTS}/${listId}/items`,
        { targetType, targetId, note },
        options,
      ),
    );
  }

  /**
   * Takes something off a list.
   *
   * @param listId - The list.
   * @param itemId - The item.
   * @returns An observable of the list with what remains.
   */
  removeItem(listId: string, itemId: string): Observable<ReadingListDetail> {
    return this.authenticated(options =>
      this._http.delete<ReadingListDetail>(
        `${API_URLS.STORYTIME_READING_LISTS}/${listId}/items/${itemId}`,
        options,
      ),
    );
  }

  /**
   * Puts a list in a given order.
   *
   * The whole order is sent rather than one move at a time: the page already
   * knows the order it wants, and sending it outright cannot half-apply.
   *
   * @param listId - The list.
   * @param itemIds - Every item on the list, in the order wanted.
   * @returns An observable of the list in its new order.
   */
  reorder(listId: string, itemIds: string[]): Observable<ReadingListDetail> {
    return this.authenticated(options =>
      this._http.patch<ReadingListDetail>(
        `${API_URLS.STORYTIME_READING_LISTS}/${listId}/order`,
        { itemIds },
        options,
      ),
    );
  }

  /**
   * Lists the public lists somebody keeps.
   *
   * @param userId - The member.
   * @returns An observable of their public lists.
   */
  getPublicLists(userId: string): Observable<ReadingList[]> {
    return this._http.get<ReadingList[]>(
      `${API_URLS.STORYTIME_CREATORS}/${userId}/reading-lists`,
    );
  }

  /**
   * Reads one public list.
   *
   * @param userId - Who keeps it.
   * @param slug - Its address.
   * @returns An observable of the list and what is on it.
   */
  getPublicList(userId: string, slug: string): Observable<ReadingListDetail> {
    return this._http.get<ReadingListDetail>(
      `${API_URLS.STORYTIME_CREATORS}/${userId}/reading-lists/${slug}`,
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
