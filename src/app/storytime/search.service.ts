import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreatorWork,
  SearchResults,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Searching Storytime, and reading what one member has published.
 *
 * Neither needs an account. Finding something to read is the least private
 * thing anybody does here, and a creator page shows only work its author chose
 * to list publicly.
 */
@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly _http = inject(HttpClient);

  /**
   * Searches published Stories, Chapters, Characters and Arcs.
   *
   * @param term - What the reader typed.
   * @param options - Which kinds to search, and which page to return.
   * @returns An observable of the results.
   */
  search(
    term: string,
    options: {
      types?: StorytimeTargetType[];
      page?: number;
      pageSize?: number;
    } = {},
  ): Observable<SearchResults> {
    let params = new HttpParams().set('q', term);

    if (options.types?.length) {
      params = params.set('types', options.types.join(','));
    }

    if (options.page) {
      params = params.set('page', options.page);
    }

    if (options.pageSize) {
      params = params.set('pageSize', options.pageSize);
    }

    return this._http.get<SearchResults>(API_URLS.STORYTIME_SEARCH, { params });
  }

  /**
   * Lists what one member has published.
   *
   * @param userId - The member.
   * @returns An observable of their Stories and Arcs.
   */
  getCreatorWork(userId: string): Observable<CreatorWork> {
    return this._http.get<CreatorWork>(
      `${API_URLS.STORYTIME_CREATORS}/${userId}`,
    );
  }
}
