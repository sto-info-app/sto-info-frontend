import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { HealthService } from './health.service';

export const apiHealthInterceptor: HttpInterceptorFn = (req, next) => {
  const health = inject(HealthService);
  const isApiCall = req.url.startsWith(API_URLS.ROOT);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isApiCall) {
        // Network error / 5xx = likely API trouble.
        if (err.status === 0 || (err.status >= 500 && err.status <= 599)) {
          health.markDown();
        }
      }
      return throwError(() => err);
    }),
  );
};
