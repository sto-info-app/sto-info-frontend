import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  STORYTIME_AVAILABILITY_ENABLED,
  STORYTIME_AVAILABILITY_UNAVAILABLE,
} from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { StorytimeService } from './storytime.service';

/**
 * Route guard that blocks every Storytime route while the feature is switched
 * off.
 *
 * Sends blocked visitors to the page-not-found route rather than showing a
 * "coming soon" message, matching how the server answers: a feature that is
 * off should be indistinguishable from one that does not exist, so a staged
 * rollout does not advertise what is coming.
 *
 * A configuration that could not be loaded at all is a different matter and is
 * sent to the service interruption page instead: the feature was never said to
 * be off, the backend simply could not be asked, and answering an outage with
 * a 404 tells the visitor their address is wrong when it is not.
 *
 * This is presentation only. The server independently refuses Storytime
 * requests while the feature is disabled, whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class StorytimeEnabledGuard implements CanActivate {
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _router = inject(Router);

  /**
   * Determines whether a Storytime route can be activated.
   *
   * @returns An observable emitting true when Storytime is enabled.
   */
  canActivate(): Observable<boolean> {
    return this._storytimeService.getAvailability().pipe(
      map(availability => {
        if (availability === STORYTIME_AVAILABILITY_ENABLED) {
          return true;
        }

        const target =
          availability === STORYTIME_AVAILABILITY_UNAVAILABLE
            ? APP_ROUTES.SERVICE_INTERRUPTION
            : APP_ROUTES.PAGE_NOT_FOUND;

        void this._router.navigate([`/${target}`]);
        return false;
      }),
    );
  }
}
