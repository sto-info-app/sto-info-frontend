import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ArmadaHistoryPage,
  ArmadaRequestPage,
  ArmadaRequestStatus,
  ArmadaSlot,
  ArmadaView,
  CommunityStructure,
  FleetArmadaView,
  MoveArmadaFleetRequest,
  RemoveArmadaFleetRequest,
} from 'src/app/models/fleet-armada.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * How Fleets are arranged in Armadas: requests, placements, moves,
 * departures and their history (FC-024 to FC-026).
 *
 * Reading works signed out, and sends the access token when there is one so
 * a manager learns they may manage and a member sees who made each change.
 * Every change needs it, and is refused without.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetArmadaService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads a Community's Armadas, each with its shape, and its Fleets in none.
   *
   * @param communityId - The Community.
   * @returns An observable of the structure.
   */
  communityStructure(communityId: string): Observable<CommunityStructure> {
    return this._http.get<CommunityStructure>(
      `${this.communityUrl(communityId)}/structure`,
      this.readOptions(),
    );
  }

  /**
   * Reads an Armada's shape.
   *
   * @param communityId - The Community.
   * @param armadaId - The Armada.
   * @returns An observable of its shape, and what the reader may do.
   */
  view(communityId: string, armadaId: string): Observable<ArmadaView> {
    return this._http.get<ArmadaView>(
      `${this.armadaUrl(communityId, armadaId)}/structure`,
      this.readOptions(),
    );
  }

  /**
   * Reads a page of an Armada's history, newest change first.
   *
   * @param communityId - The Community.
   * @param armadaId - The Armada.
   * @param page - The page, from 1.
   * @returns An observable of the page.
   */
  history(
    communityId: string,
    armadaId: string,
    page: number,
  ): Observable<ArmadaHistoryPage> {
    return this._http.get<ArmadaHistoryPage>(
      `${this.armadaUrl(communityId, armadaId)}/history`,
      { ...this.readOptions(), params: new HttpParams().set('page', page) },
    );
  }

  /**
   * Lists an Armada's requests, for its managers.
   *
   * @param communityId - The Community.
   * @param armadaId - The Armada.
   * @param status - Which.
   * @param page - The page, from 1.
   * @returns An observable of the page.
   */
  requests(
    communityId: string,
    armadaId: string,
    status: ArmadaRequestStatus,
    page: number,
  ): Observable<ArmadaRequestPage> {
    return this.authenticated(options =>
      this._http.get<ArmadaRequestPage>(
        `${this.armadaUrl(communityId, armadaId)}/requests`,
        {
          ...options,
          params: new HttpParams().set('status', status).set('page', page),
        },
      ),
    );
  }

  /**
   * Approves a request, placing the Fleet.
   *
   * @param communityId - The Community.
   * @param armadaId - The Armada.
   * @param requestId - The request.
   * @param slot - Where the Fleet goes.
   * @returns An observable of the Armada's shape now.
   */
  approve(
    communityId: string,
    armadaId: string,
    requestId: string,
    slot: ArmadaSlot,
  ): Observable<ArmadaView> {
    return this.authenticated(options =>
      this._http.post<ArmadaView>(
        `${this.armadaUrl(communityId, armadaId)}/requests/${requestId}/approve`,
        slot,
        options,
      ),
    );
  }

  /**
   * Rejects a request, with a reason.
   *
   * @param communityId - The Community.
   * @param armadaId - The Armada.
   * @param requestId - The request.
   * @param reason - Why, which the requester is shown.
   * @returns An observable of the Armada's shape now.
   */
  reject(
    communityId: string,
    armadaId: string,
    requestId: string,
    reason: string,
  ): Observable<ArmadaView> {
    return this.authenticated(options =>
      this._http.post<ArmadaView>(
        `${this.armadaUrl(communityId, armadaId)}/requests/${requestId}/reject`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Moves a placed Fleet.
   *
   * @param communityId - The Community.
   * @param armadaId - The Armada.
   * @param fleetId - The Fleet.
   * @param request - Where, why, and what becomes of its Gammas.
   * @returns An observable of the Armada's shape now.
   */
  move(
    communityId: string,
    armadaId: string,
    fleetId: string,
    request: MoveArmadaFleetRequest,
  ): Observable<ArmadaView> {
    return this.authenticated(options =>
      this._http.post<ArmadaView>(
        `${this.armadaUrl(communityId, armadaId)}/placements/${fleetId}/move`,
        request,
        options,
      ),
    );
  }

  /**
   * Takes a Fleet out of an Armada, as its manager.
   *
   * @param communityId - The Community.
   * @param armadaId - The Armada.
   * @param fleetId - The Fleet.
   * @param request - Why, and what becomes of its Gammas.
   * @returns An observable of the Armada's shape now.
   */
  remove(
    communityId: string,
    armadaId: string,
    fleetId: string,
    request: RemoveArmadaFleetRequest,
  ): Observable<ArmadaView> {
    return this.authenticated(options =>
      this._http.post<ArmadaView>(
        `${this.armadaUrl(communityId, armadaId)}/placements/${fleetId}/remove`,
        request,
        options,
      ),
    );
  }

  /**
   * Reads a Fleet's Armada, for its page.
   *
   * @param communityId - The Community.
   * @param fleetId - The Fleet.
   * @returns An observable of where it sits, and what its managers may do.
   */
  fleetView(communityId: string, fleetId: string): Observable<FleetArmadaView> {
    return this._http.get<FleetArmadaView>(
      this.fleetUrl(communityId, fleetId),
      this.readOptions(),
    );
  }

  /**
   * Asks for a Fleet to join an Armada.
   *
   * @param communityId - The Community.
   * @param fleetId - The Fleet.
   * @param armadaId - The Armada.
   * @param message - Anything to say.
   * @returns An observable of the Fleet's Armada now.
   */
  request(
    communityId: string,
    fleetId: string,
    armadaId: string,
    message: string | null,
  ): Observable<FleetArmadaView> {
    return this.authenticated(options =>
      this._http.post<FleetArmadaView>(
        `${this.fleetUrl(communityId, fleetId)}/requests`,
        message === null ? { armadaId } : { armadaId, message },
        options,
      ),
    );
  }

  /**
   * Withdraws a Fleet's open request.
   *
   * @param communityId - The Community.
   * @param fleetId - The Fleet.
   * @param requestId - The request.
   * @returns An observable of the Fleet's Armada now.
   */
  withdraw(
    communityId: string,
    fleetId: string,
    requestId: string,
  ): Observable<FleetArmadaView> {
    return this.authenticated(options =>
      this._http.post<FleetArmadaView>(
        `${this.fleetUrl(communityId, fleetId)}/requests/${requestId}/withdraw`,
        {},
        options,
      ),
    );
  }

  /**
   * Takes a Fleet out of its Armada, as its own manager.
   *
   * @param communityId - The Community.
   * @param fleetId - The Fleet.
   * @param reason - Why.
   * @returns An observable of the Fleet's Armada now.
   */
  leave(
    communityId: string,
    fleetId: string,
    reason: string,
  ): Observable<FleetArmadaView> {
    return this.authenticated(options =>
      this._http.post<FleetArmadaView>(
        `${this.fleetUrl(communityId, fleetId)}/leave`,
        { reason },
        options,
      ),
    );
  }

  /**
   * The options a read is sent with: the token when there is one.
   *
   * @returns The options.
   */
  private readOptions(): { headers?: HttpHeaders } {
    return this._authService.getHttpOptionsWithAccessToken() ?? {};
  }

  /**
   * Runs a request with the access token attached, or fails without one.
   *
   * @param request - Builds the request from the options.
   * @returns The request's observable, or one that errors when signed out.
   */
  private authenticated<T>(
    request: (options: { headers: HttpHeaders }) => Observable<T>,
  ): Observable<T> {
    const options = this._authService.getHttpOptionsWithAccessToken();

    if (!options) {
      return throwError(() => new Error('No token found'));
    }

    return request(options);
  }

  /**
   * A Community's address.
   *
   * @param communityId - The Community.
   * @returns The address.
   */
  private communityUrl(communityId: string): string {
    return `${API_URLS.FLEET_COMMUNITIES}/${communityId}`;
  }

  /**
   * An Armada's address.
   *
   * @param communityId - The Community.
   * @param armadaId - The Armada.
   * @returns The address.
   */
  private armadaUrl(communityId: string, armadaId: string): string {
    return `${this.communityUrl(communityId)}/armadas/${armadaId}`;
  }

  /**
   * A Fleet's Armada address.
   *
   * @param communityId - The Community.
   * @param fleetId - The Fleet.
   * @returns The address.
   */
  private fleetUrl(communityId: string, fleetId: string): string {
    return `${this.communityUrl(communityId)}/fleets/${fleetId}/armada`;
  }
}
