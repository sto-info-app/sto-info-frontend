import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ArmadaDuplicate,
  CreateFleetCommunity,
  CreateStoArmada,
  CreateStoFleet,
  CreateUnregisteredFleet,
  FleetCommunity,
  FleetDuplicate,
  RegisteredStoArmada,
  RegisteredStoFleet,
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
      this.callerOptions(),
    );
  }

  /**
   * Registers a Fleet under a Community.
   *
   * @param communityId - The Community registering it.
   * @param fleet - The exact game name, the platform and the rest.
   * @returns The Fleet, and anything that already answered to its name.
   */
  registerFleet(
    communityId: string,
    fleet: CreateStoFleet,
  ): Observable<RegisteredStoFleet> {
    return this._http.post<RegisteredStoFleet>(
      this.childUrl(communityId, 'fleets'),
      fleet,
      this.callerOptions(),
    );
  }

  /**
   * Registers an Armada under a Community.
   *
   * @param communityId - The Community registering it.
   * @param armada - The exact game name, the platform and the rest.
   * @returns The Armada, and anything that already answered to its name.
   */
  registerArmada(
    communityId: string,
    armada: CreateStoArmada,
  ): Observable<RegisteredStoArmada> {
    return this._http.post<RegisteredStoArmada>(
      this.childUrl(communityId, 'armadas'),
      armada,
      this.callerOptions(),
    );
  }

  /**
   * Confirms a Fleet that belongs to no Community.
   *
   * Needs an account and nothing else: there is no scope to hold a
   * capability at, and no owner to hold one either, which is the whole
   * nature of the record.
   *
   * @param fleet - The name, the platform and the caller's confirmation.
   * @returns The record, and anything that already answered to its name.
   */
  confirmStandaloneFleet(
    fleet: CreateUnregisteredFleet,
  ): Observable<RegisteredStoFleet> {
    return this._http.post<RegisteredStoFleet>(
      `${API_URLS.FLEETS}/unregistered`,
      fleet,
      this.callerOptions(),
    );
  }

  /**
   * Asks what already answers to a Fleet name on a platform.
   *
   * Asked before anything is written, so somebody about to register a
   * second record for a Fleet already in the directory finds out while
   * they can still change their mind. The same matches come back on the
   * registration itself, because this answer can be stale by the time the
   * form is sent and the warning has to be true of what was saved.
   *
   * @param communityId - The Community the registrant is acting in.
   * @param platformId - The platform to look on.
   * @param name - The name being registered, exactly as it was typed.
   * @returns An observable of the matches, freshest first.
   */
  findFleetDuplicates(
    communityId: string,
    platformId: string,
    name: string,
  ): Observable<FleetDuplicate[]> {
    return this._http.get<FleetDuplicate[]>(
      `${this.childUrl(communityId, 'fleets')}/duplicates`,
      {
        ...this.callerOptions(),
        params: this.duplicateParams(platformId, name),
      },
    );
  }

  /**
   * Asks what already answers to an Armada name on a platform.
   *
   * @param communityId - The Community the registrant is acting in.
   * @param platformId - The platform to look on.
   * @param name - The name being registered, exactly as it was typed.
   * @returns An observable of the matches.
   */
  findArmadaDuplicates(
    communityId: string,
    platformId: string,
    name: string,
  ): Observable<ArmadaDuplicate[]> {
    return this._http.get<ArmadaDuplicate[]>(
      `${this.childUrl(communityId, 'armadas')}/duplicates`,
      {
        ...this.callerOptions(),
        params: this.duplicateParams(platformId, name),
      },
    );
  }

  /**
   * Builds the address of a Community's collection of Fleets or Armadas.
   *
   * @param communityId - The Community.
   * @param collection - Which of its collections.
   * @returns The URL.
   */
  private childUrl(communityId: string, collection: string): string {
    return `${API_URLS.FLEET_COMMUNITIES}/${encodeURIComponent(communityId)}/${collection}`;
  }

  /**
   * Builds the duplicate question.
   *
   * The name is sent exactly as it was typed. Matching folds case and
   * nothing else — an edge space is a real difference between two in-game
   * names, and trimming here would report a duplicate that is not one,
   * which is the failure that stops people trusting the warning at all.
   *
   * @param platformId - The platform to look on.
   * @param name - The name being registered.
   * @returns The HTTP parameters to send.
   */
  private duplicateParams(platformId: string, name: string): HttpParams {
    return new HttpParams().set('platformId', platformId).set('name', name);
  }

  /**
   * The request options carrying the caller's access token.
   *
   * @returns The auth headers, or an empty options bag when signed out.
   */
  private callerOptions(): Record<string, unknown> {
    return this._authService.getHttpOptionsWithAccessToken() ?? {};
  }
}
