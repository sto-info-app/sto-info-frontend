import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { HealthService } from './health.service';

@Injectable()
export class ApiHealthInterceptor implements HttpInterceptor {
  private readonly health = inject(HealthService);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    const isApiCall = req.url.startsWith(API_URLS.ROOT);

    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (isApiCall) {
          // Network error / 5xx = likely API trouble.
          if (err.status === 0 || (err.status >= 500 && err.status <= 599)) {
            this.health.markDown();
          }
        }
        return throwError(() => err);
      }),
    );
  }
}
