import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  AssignScopeRoleRequest,
  CommunityDisputeView,
  FleetInvestigation,
  FleetInvestigationPage,
  OwnershipStanding,
  OwnershipTransfer,
  ScopeGovernanceAction,
  ScopeRoles,
  SetPersonalCapabilityRequest,
} from 'src/app/models/fleet-governance.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** The Community, or the Fleet in it, whose governance is meant. */
export interface GovernanceTarget {
  readonly communityId: string;
  /** Null for the Community itself, or an Armada. */
  readonly fleetId: string | null;
  /** The Armada, when the target is one (FC-025). */
  readonly armadaId?: string | null;
}

/**
 * Who governs a Community or Fleet: roles, delegation, ownership and closure
 * (FC-022).
 *
 * Every call needs the access token and is refused without one. The server
 * decides what the caller may do; nothing here assumes it.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetGovernanceService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads who governs a scope.
   *
   * @param target - The scope.
   * @returns An observable of its roles and delegations.
   */
  roles(target: GovernanceTarget): Observable<ScopeRoles> {
    return this.authenticated(options =>
      this._http.get<ScopeRoles>(`${this.url(target)}/roles`, options),
    );
  }

  /**
   * Gives somebody a role.
   *
   * @param target - The scope.
   * @param request - Who, which role, and optionally why.
   * @returns An observable that completes when it is given.
   */
  assign(
    target: GovernanceTarget,
    request: AssignScopeRoleRequest,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(`${this.url(target)}/roles`, request, options),
    );
  }

  /**
   * Takes a role away.
   *
   * @param target - The scope.
   * @param assignmentId - The role held.
   * @param reason - Why.
   * @returns An observable that completes when it is withdrawn.
   */
  withdraw(
    target: GovernanceTarget,
    assignmentId: string,
    reason: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.url(target)}/roles/${assignmentId}/withdraw`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Sets what every Officer holds.
   *
   * @param target - The scope.
   * @param capabilities - Every capability they should hold.
   * @param reason - Why, required when any is taken away.
   * @returns An observable that completes when it is saved.
   */
  setOfficerCapabilities(
    target: GovernanceTarget,
    capabilities: readonly string[],
    reason?: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.put<void>(
        `${this.url(target)}/officer-capabilities`,
        { capabilities, ...(reason ? { reason } : {}) },
        options,
      ),
    );
  }

  /**
   * Grants or denies one capability to one person.
   *
   * @param target - The scope.
   * @param request - Who, what, which way, and why.
   * @returns An observable that completes when it is saved.
   */
  setPersonal(
    target: GovernanceTarget,
    request: SetPersonalCapabilityRequest,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.put<void>(
        `${this.url(target)}/personal-capabilities`,
        request,
        options,
      ),
    );
  }

  /**
   * Clears one person's grant or denial.
   *
   * @param target - The scope.
   * @param grantId - The grant or denial.
   * @param reason - Why, required when a grant is cleared.
   * @returns An observable that completes when it is cleared.
   */
  clearPersonal(
    target: GovernanceTarget,
    grantId: string,
    reason?: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.url(target)}/personal-capabilities/${grantId}/clear`,
        reason ? { reason } : {},
        options,
      ),
    );
  }

  /**
   * Reads a scope's recent governance history.
   *
   * @param target - The scope.
   * @returns An observable of the newest changes first.
   */
  history(target: GovernanceTarget): Observable<ScopeGovernanceAction[]> {
    return this.authenticated(options =>
      this._http.get<ScopeGovernanceAction[]>(
        `${this.url(target)}/history`,
        options,
      ),
    );
  }

  /**
   * Closes a scope.
   *
   * @param target - The scope.
   * @param reason - Why.
   * @returns An observable that completes when it is closed.
   */
  close(target: GovernanceTarget, reason: string): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(`${this.url(target)}/close`, { reason }, options),
    );
  }

  /**
   * Reads where a Community's ownership stands.
   *
   * @param communityId - The Community.
   * @returns An observable of the open offer, and whom the Owner may offer
   *   it to.
   */
  ownership(communityId: string): Observable<OwnershipStanding> {
    return this.authenticated(options =>
      this._http.get<OwnershipStanding>(
        `${this.communityUrl(communityId)}/ownership`,
        options,
      ),
    );
  }

  /**
   * Offers a Community to one of its Admins.
   *
   * @param communityId - The Community.
   * @param toUserId - The Admin.
   * @returns An observable of the offer.
   */
  offerOwnership(
    communityId: string,
    toUserId: string,
  ): Observable<OwnershipTransfer> {
    return this.authenticated(options =>
      this._http.post<OwnershipTransfer>(
        `${this.communityUrl(communityId)}/ownership`,
        { toUserId },
        options,
      ),
    );
  }

  /**
   * Answers or takes back an offer.
   *
   * @param communityId - The Community.
   * @param transferId - The offer.
   * @param answer - Cancel, as the Owner; accept or decline, as the Admin.
   * @returns An observable that completes when it is answered.
   */
  answerOwnership(
    communityId: string,
    transferId: string,
    answer: 'cancel' | 'accept' | 'decline',
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.communityUrl(communityId)}/ownership/${transferId}/${answer}`,
        {},
        options,
      ),
    );
  }

  /**
   * Reads a Community for a site administrator's dispute action.
   *
   * @param communityId - The Community.
   * @returns An observable of its Owner, Admins and any open offer.
   */
  disputeView(communityId: string): Observable<CommunityDisputeView> {
    return this.authenticated(options =>
      this._http.get<CommunityDisputeView>(
        `${this.adminUrl(communityId)}/dispute`,
        options,
      ),
    );
  }

  /**
   * Moves a Community's ownership, as a site administrator.
   *
   * @param communityId - The Community.
   * @param toUserId - The Admin who becomes the Owner.
   * @param reason - Why.
   * @returns An observable that completes when it has moved.
   */
  reassignOwnership(
    communityId: string,
    toUserId: string,
    reason: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.adminUrl(communityId)}/owner`,
        { toUserId, reason },
        options,
      ),
    );
  }

  /**
   * Closes a Community, as a site administrator.
   *
   * @param communityId - The Community.
   * @param reason - Why.
   * @returns An observable that completes when it is closed.
   */
  closeAsSiteAdmin(communityId: string, reason: string): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.adminUrl(communityId)}/close`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Suspends, reinstates or closes a Community, or one of its Fleets or
   * Armadas, as a site administrator (FC-036).
   *
   * @param communityId - The Community.
   * @param scope - The Community itself, or one of its Fleets or Armadas.
   * @param action - What to do.
   * @param reason - Why.
   * @returns An observable that completes when it is done.
   */
  actAsSiteAdmin(
    communityId: string,
    scope: { readonly kind: 'FLEET' | 'ARMADA'; readonly id: string } | null,
    action: 'suspend' | 'reinstate' | 'close',
    reason: string,
  ): Observable<void> {
    const where =
      scope === null
        ? ''
        : `/${scope.kind === 'FLEET' ? 'fleets' : 'armadas'}/${scope.id}`;

    return this.authenticated(options =>
      this._http.post<void>(
        `${this.adminUrl(communityId)}${where}/${action}`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Opens a site administrator's read-only look into a Fleet's imports, for
   * 24 hours (FC-036).
   *
   * @param communityId - The Community.
   * @param fleetId - The Fleet.
   * @param purpose - Why, 10 to 500 characters.
   * @returns The look.
   */
  investigate(
    communityId: string,
    fleetId: string,
    purpose: string,
  ): Observable<FleetInvestigation> {
    return this.authenticated(options =>
      this._http.post<FleetInvestigation>(
        `${this.adminUrl(communityId)}/fleets/${fleetId}/investigations`,
        { purpose },
        options,
      ),
    );
  }

  /**
   * Lists site administrators' looks into Fleets, newest first (FC-036).
   *
   * @param page - Which page.
   * @returns The page.
   */
  investigations(page = 1): Observable<FleetInvestigationPage> {
    return this.authenticated(options =>
      this._http.get<FleetInvestigationPage>(
        API_URLS.FLEET_INVESTIGATIONS_ADMIN,
        { ...options, params: { page: String(page) } },
      ),
    );
  }

  /**
   * Sends a request with the access token, or refuses without one.
   *
   * @param request - The request, given the options.
   * @returns Its observable.
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
   * A scope's governance address.
   *
   * @param target - The scope.
   * @returns The address.
   */
  private url(target: GovernanceTarget): string {
    if (target.armadaId) {
      return `${API_URLS.FLEET_COMMUNITIES}/${target.communityId}/armadas/${target.armadaId}/governance`;
    }

    return target.fleetId === null
      ? this.communityUrl(target.communityId)
      : `${API_URLS.FLEET_COMMUNITIES}/${target.communityId}/fleets/${target.fleetId}/governance`;
  }

  /**
   * A Community's governance address.
   *
   * @param communityId - The Community.
   * @returns The address.
   */
  private communityUrl(communityId: string): string {
    return `${API_URLS.FLEET_COMMUNITIES}/${communityId}/governance`;
  }

  /**
   * A Community's site administrator address.
   *
   * @param communityId - The Community.
   * @returns The address.
   */
  private adminUrl(communityId: string): string {
    return `${API_URLS.FLEET_COMMUNITIES_ADMIN}/${communityId}`;
  }
}
