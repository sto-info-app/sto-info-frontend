import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  CreateFleetCommunity,
  FleetCommunity,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Registers records into the Fleet directory.
 *
 * Separate from the service that reads it. Reading is anonymous and
 * cacheable; writing needs an account, changes what everybody else sees,
 * and fails in ways a reader never has to think about — and one service
 * doing both would have to explain, per method, which half it belonged to.
 */
@Injectable({ providedIn: 'root' })
export class FleetRegistrationService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Registers a Fleet Community.
   *
   * @param community - The name, and whatever else the registrant filled in.
   * @returns An observable of the Community as it was registered.
   */
  registerCommunity(
    community: CreateFleetCommunity,
  ): Observable<FleetCommunity> {
    return this._http.post<FleetCommunity>(
      API_URLS.FLEET_COMMUNITIES,
      community,
      this._authService.getHttpOptionsWithAccessToken() ?? {},
    );
  }
}
