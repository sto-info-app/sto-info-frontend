import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  CreateNewsPostRequest,
  NewsPost,
  NewsQuery,
  PaginatedNews,
  UpdateNewsPostRequest,
} from 'src/app/models/news.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Service for reading public news posts and (for admins) managing them.
 */
@Injectable({
  providedIn: 'root',
})
export class NewsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Lists published news posts.
   *
   * @param query - Optional pagination and category filter.
   * @returns An observable of the paginated published posts.
   */
  getPublishedNews(query: NewsQuery = {}): Observable<PaginatedNews> {
    return this.http.get<PaginatedNews>(API_URLS.NEWS, {
      params: this.buildQueryParams(query),
    });
  }

  /**
   * Fetches a single published post by its slug.
   *
   * @param slug - The post slug.
   * @returns An observable of the post.
   */
  getNewsBySlug(slug: string): Observable<NewsPost> {
    return this.http.get<NewsPost>(`${API_URLS.NEWS}/${slug}`);
  }

  // ----- Admin -----

  /**
   * Lists all posts including drafts (admin).
   *
   * @param query - Optional pagination and category filter.
   * @returns An observable of the paginated posts.
   */
  getAllNewsForAdmin(query: NewsQuery = {}): Observable<PaginatedNews> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<PaginatedNews>(API_URLS.NEWS_ADMIN, {
      ...httpOptions,
      params: this.buildQueryParams(query),
    });
  }

  /**
   * Fetches any post by ID including drafts (admin).
   *
   * @param id - The post ID.
   * @returns An observable of the post.
   */
  getNewsByIdForAdmin(id: string): Observable<NewsPost> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<NewsPost>(`${API_URLS.NEWS_ADMIN}/${id}`, httpOptions);
  }

  /**
   * Creates a post (admin).
   *
   * @param payload - The post data.
   * @returns An observable of the created post.
   */
  createNews(payload: CreateNewsPostRequest): Observable<NewsPost> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.post<NewsPost>(API_URLS.NEWS, payload, httpOptions);
  }

  /**
   * Updates a post (admin).
   *
   * @param id - The post ID.
   * @param payload - The partial update.
   * @returns An observable of the updated post.
   */
  updateNews(id: string, payload: UpdateNewsPostRequest): Observable<NewsPost> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.patch<NewsPost>(
      `${API_URLS.NEWS}/${id}`,
      payload,
      httpOptions,
    );
  }

  /**
   * Publishes a post immediately (admin).
   *
   * @param id - The post ID.
   * @returns An observable of the published post.
   */
  publishNews(id: string): Observable<NewsPost> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.post<NewsPost>(
      `${API_URLS.NEWS}/${id}/publish`,
      {},
      httpOptions,
    );
  }

  /**
   * Deletes a post (admin).
   *
   * @param id - The post ID.
   * @returns An observable that completes when deleted.
   */
  deleteNews(id: string): Observable<void> {
    const httpOptions = this.authService.getHttpOptionsWithAccessToken();
    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.delete<void>(`${API_URLS.NEWS}/${id}`, httpOptions);
  }

  /**
   * Builds query params for list endpoints, omitting undefined values.
   *
   * @param query - The query options.
   * @returns The HttpParams instance.
   */
  private buildQueryParams(query: NewsQuery): HttpParams {
    let params = new HttpParams();
    if (query.category) {
      params = params.set('category', query.category);
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
