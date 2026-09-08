import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { AuthService } from './auth.service';

/**
 * The auth endpoints that must not be retried through a refresh: refreshing is
 * how the retry works, so sending it back through here would loop, and the
 * others answer 401 for reasons a new access token would not mend.
 */
const NON_RETRYABLE_URLS = [
  API_URLS.AUTH_LOGIN,
  API_URLS.AUTH_REFRESH,
  API_URLS.AUTH_LOGOUT,
  API_URLS.AUTH_REGISTER,
];

/**
 * Replaces a rejected access token and retries the request once.
 *
 * A login session now outlives any single access token: it runs to the user's
 * chosen inactivity window, while the access token is deliberately short-lived
 * and swapped out as the session goes on. Activity normally replaces the token
 * before it lapses, but a tab that was left in the background, or a clock that
 * drifted, can still put a request on the wire with a token the API has
 * finished with. While the session itself is alive that is worth one quiet
 * retry rather than an error the user has to see.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isRetryable =
    req.url.startsWith(API_URLS.ROOT) &&
    !NON_RETRYABLE_URLS.some(url => req.url.startsWith(url));

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !isRetryable || !authService.isTokenValid()) {
        return throwError(() => error);
      }

      return authService.ensureFreshAccessToken().pipe(
        switchMap(accessToken =>
          next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${accessToken}` },
            }),
          ),
        ),
        // A refresh that fails has already sent the user to the login page;
        // report the original failure rather than the refresh's.
        catchError(() => throwError(() => error)),
      );
    }),
  );
};
