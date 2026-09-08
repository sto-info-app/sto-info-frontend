import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { STORYTIME_AVAILABILITY_ENABLED } from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { StorytimeService } from './storytime.service';

/**
 * Route guard that blocks every Storytime route while the feature is out of
 * reach.
 *
 * Everybody turned away goes to the same place — the Storytime unavailable
 * page — which then says which of the two things happened: the master switch
 * in `app_setting` is off, or the backend holding that switch could not be
 * asked. Neither is a wrong address, so neither is answered with the not-found
 * page; a visitor told their address is wrong stops trying, and both of these
 * situations end.
 *
 * The guard does not decide the wording, because it cannot: the availability
 * it read is a moment old by the time anything is drawn, and the page re-reads
 * it so that a visitor arriving after a recovery is sent on to Storytime
 * rather than shown a notice about an outage that is over.
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
   * @returns An observable emitting true when Storytime is enabled, and
   *   otherwise a redirect to the Storytime unavailable page.
   */
  canActivate(): Observable<boolean | UrlTree> {
    return this._storytimeService
      .getAvailability()
      .pipe(
        map(availability =>
          availability === STORYTIME_AVAILABILITY_ENABLED
            ? true
            : this._router.parseUrl(`/${APP_ROUTES.STORYTIME_UNAVAILABLE}`),
        ),
      );
  }
}
