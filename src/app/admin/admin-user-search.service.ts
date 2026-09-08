import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { UserSearchPage } from 'src/app/models/notification.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** Default number of results per page for admin user search. */
const USER_SEARCH_PAGE_SIZE = 5;

/**
 * Searches for registered users by username or real name.
 *
 * Admin-only: the endpoint requires the ADMIN role. It neither searches nor
 * returns email addresses — a site notification is read where it was written,
 * and an address on the screen that picks its reader only suggested otherwise.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminUserSearchService {
  private readonly _http = inject(HttpClient);

  /**
   * Searches for users matching the given term.
   *
   * @param q - Part of a username or of a member's real name.
   * @param page - The result page to fetch (1-based).
   * @param pageSize - How many results per page.
   * @returns An observable of the paginated results.
   */
  search(
    q: string,
    page = 1,
    pageSize = USER_SEARCH_PAGE_SIZE,
  ): Observable<UserSearchPage> {
    const params = new HttpParams()
      .set('q', q)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this._http.get<UserSearchPage>(
      `${API_URLS.NOTIFICATIONS_ADMIN}/users/search`,
      { params },
    );
  }
}
