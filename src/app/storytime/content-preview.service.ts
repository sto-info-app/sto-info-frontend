import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** The server's answer to a preview request. */
interface ContentPreview {
  /** The rendered, sanitised HTML. */
  html: string;
}

/**
 * Rendering a creator's Markdown the way a reader will receive it.
 *
 * The server renders rather than the client, because Storytime's Markdown is
 * not a general implementation: it demotes headings, anchors every block and
 * drops any link that leaves the site. A renderer in the browser would be a
 * second implementation of those rules, and the first time the two disagreed a
 * writer would be shown a document their readers never get — which is worse
 * than no preview at all.
 *
 * One call serves every field that takes Markdown, since one renderer produces
 * all of them.
 */
@Injectable({
  providedIn: 'root',
})
export class ContentPreviewService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Renders Markdown source without saving it.
   *
   * @param contentSource - The Markdown the creator has written.
   * @returns An observable of the rendered HTML.
   */
  render(contentSource: string): Observable<string> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return this.post(contentSource, httpOptions).pipe(
      map(preview => preview.html),
    );
  }

  /**
   * Posts the source to the preview endpoint.
   *
   * @param contentSource - The Markdown to render.
   * @param options - The authenticated request options.
   * @returns An observable of the server's answer.
   */
  private post(
    contentSource: string,
    options: { headers: HttpHeaders },
  ): Observable<ContentPreview> {
    return this._http.post<ContentPreview>(
      API_URLS.STORYTIME_MANAGE_CONTENT_PREVIEW,
      { contentSource },
      options,
    );
  }
}
