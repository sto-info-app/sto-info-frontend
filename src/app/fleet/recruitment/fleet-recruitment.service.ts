import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  DecideFleetApplicationRequest,
  FleetApplicationDetail,
  FleetApplicationPage,
  FleetApplicationStatus,
  FleetInvitation,
  FleetMember,
  FleetRecruitmentView,
  MyFleetApplication,
  MyFleetInvitation,
  RecruitmentSettings,
  SubmitFleetApplicationRequest,
  UpdateRecruitmentSettingsRequest,
} from 'src/app/models/fleet-recruitment.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** Which applications an inbox page asks for. */
export interface FleetApplicationQuery {
  readonly status?: FleetApplicationStatus;
  readonly page?: number;
  readonly pageSize?: number;
}

/**
 * A Fleet's recruitment: how it takes members, and the applications,
 * invitations and members that follow (FC-021).
 *
 * Reading how a Fleet recruits works signed out, as the Fleet's own page
 * does. Everything else needs the access token and is refused without one.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetRecruitmentService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads how a Fleet recruits, and where the viewer stands.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns An observable of the view.
   */
  view(communityId: string, fleetId: string): Observable<FleetRecruitmentView> {
    return this._http.get<FleetRecruitmentView>(
      this.recruitmentUrl(communityId, fleetId),
      this._authService.getHttpOptionsWithAccessToken() ?? {},
    );
  }

  /**
   * Saves a new version of how a Fleet recruits.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param request - The state, requirements and questions.
   * @returns An observable of the settings now.
   */
  saveSettings(
    communityId: string,
    fleetId: string,
    request: UpdateRecruitmentSettingsRequest,
  ): Observable<RecruitmentSettings> {
    return this.authenticated(options =>
      this._http.put<RecruitmentSettings>(
        `${this.recruitmentUrl(communityId, fleetId)}/settings`,
        request,
        options,
      ),
    );
  }

  /**
   * Joins an OPEN Fleet with one of the viewer's Characters.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param characterId - The Character.
   * @returns An observable of the record of the join.
   */
  join(
    communityId: string,
    fleetId: string,
    characterId: string,
  ): Observable<MyFleetApplication> {
    return this.authenticated(options =>
      this._http.post<MyFleetApplication>(
        `${this.recruitmentUrl(communityId, fleetId)}/join`,
        { characterId },
        options,
      ),
    );
  }

  /**
   * Leaves a Fleet.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns An observable that completes when they have left.
   */
  leave(communityId: string, fleetId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.recruitmentUrl(communityId, fleetId)}/leave`,
        {},
        options,
      ),
    );
  }

  /**
   * Applies to a Fleet.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param request - The Character, the form version seen and the answers.
   * @returns An observable of the application.
   */
  apply(
    communityId: string,
    fleetId: string,
    request: SubmitFleetApplicationRequest,
  ): Observable<MyFleetApplication> {
    return this.authenticated(options =>
      this._http.post<MyFleetApplication>(
        `${this.recruitmentUrl(communityId, fleetId)}/applications`,
        request,
        options,
      ),
    );
  }

  /**
   * Lists a Fleet's applications.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param query - The status and page.
   * @returns An observable of the page.
   */
  applications(
    communityId: string,
    fleetId: string,
    query: FleetApplicationQuery,
  ): Observable<FleetApplicationPage> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params = params.set(key, String(value));
      }
    }

    return this.authenticated(options =>
      this._http.get<FleetApplicationPage>(
        `${this.recruitmentUrl(communityId, fleetId)}/applications`,
        { ...options, params },
      ),
    );
  }

  /**
   * Reads one application in full.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param applicationId - The application.
   * @returns An observable of the application.
   */
  application(
    communityId: string,
    fleetId: string,
    applicationId: string,
  ): Observable<FleetApplicationDetail> {
    return this.authenticated(options =>
      this._http.get<FleetApplicationDetail>(
        `${this.recruitmentUrl(communityId, fleetId)}/applications/${applicationId}`,
        options,
      ),
    );
  }

  /**
   * Accepts or rejects an application.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param applicationId - The application.
   * @param request - The decision, reason or note, and revision seen.
   * @returns An observable of the application in full.
   */
  decide(
    communityId: string,
    fleetId: string,
    applicationId: string,
    request: DecideFleetApplicationRequest,
  ): Observable<FleetApplicationDetail> {
    return this.authenticated(options =>
      this._http.post<FleetApplicationDetail>(
        `${this.recruitmentUrl(communityId, fleetId)}/applications/${applicationId}/decision`,
        request,
        options,
      ),
    );
  }

  /**
   * Lists a Fleet's invitations.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns An observable of the invitations, newest first.
   */
  invitations(
    communityId: string,
    fleetId: string,
  ): Observable<FleetInvitation[]> {
    return this.authenticated(options =>
      this._http.get<FleetInvitation[]>(
        `${this.recruitmentUrl(communityId, fleetId)}/invitations`,
        options,
      ),
    );
  }

  /**
   * Invites somebody by username.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param username - The invitee's STO Info username.
   * @returns An observable of the invitation.
   */
  invite(
    communityId: string,
    fleetId: string,
    username: string,
  ): Observable<FleetInvitation> {
    return this.authenticated(options =>
      this._http.post<FleetInvitation>(
        `${this.recruitmentUrl(communityId, fleetId)}/invitations`,
        { username },
        options,
      ),
    );
  }

  /**
   * Takes back an invitation.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param invitationId - The invitation.
   * @returns An observable of the invitation.
   */
  withdrawInvitation(
    communityId: string,
    fleetId: string,
    invitationId: string,
  ): Observable<FleetInvitation> {
    return this.authenticated(options =>
      this._http.post<FleetInvitation>(
        `${this.recruitmentUrl(communityId, fleetId)}/invitations/${invitationId}/withdraw`,
        {},
        options,
      ),
    );
  }

  /**
   * Lists a Fleet's members.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns An observable of the members.
   */
  members(communityId: string, fleetId: string): Observable<FleetMember[]> {
    return this.authenticated(options =>
      this._http.get<FleetMember[]>(
        `${this.recruitmentUrl(communityId, fleetId)}/members`,
        options,
      ),
    );
  }

  /**
   * Suspends or reinstates a member, with a reason (FC-036).
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param membershipId - The membership.
   * @param action - Which.
   * @param reason - Why.
   * @returns An observable that completes when it is done.
   */
  changeMember(
    communityId: string,
    fleetId: string,
    membershipId: string,
    action: 'suspend' | 'reinstate',
    reason: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.recruitmentUrl(communityId, fleetId)}/members/${membershipId}/${action}`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Removes a member, with a reason.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @param membershipId - The membership.
   * @param reason - Why.
   * @returns An observable that completes when they are removed.
   */
  removeMember(
    communityId: string,
    fleetId: string,
    membershipId: string,
    reason: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.recruitmentUrl(communityId, fleetId)}/members/${membershipId}/remove`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Lists the viewer's own applications and joins.
   *
   * @returns An observable of them, newest first.
   */
  myApplications(): Observable<MyFleetApplication[]> {
    return this.authenticated(options =>
      this._http.get<MyFleetApplication[]>(
        `${API_URLS.FLEET_RECRUITMENT}/applications`,
        options,
      ),
    );
  }

  /**
   * Takes back one of the viewer's pending applications.
   *
   * @param applicationId - The application.
   * @returns An observable of the application.
   */
  withdrawApplication(applicationId: string): Observable<MyFleetApplication> {
    return this.authenticated(options =>
      this._http.post<MyFleetApplication>(
        `${API_URLS.FLEET_RECRUITMENT}/applications/${applicationId}/withdraw`,
        {},
        options,
      ),
    );
  }

  /**
   * Lists the viewer's open invitations.
   *
   * @returns An observable of them, newest first.
   */
  myInvitations(): Observable<MyFleetInvitation[]> {
    return this.authenticated(options =>
      this._http.get<MyFleetInvitation[]>(
        `${API_URLS.FLEET_RECRUITMENT}/invitations`,
        options,
      ),
    );
  }

  /**
   * Accepts an invitation with one of the viewer's Characters.
   *
   * @param invitationId - The invitation.
   * @param characterId - The Character.
   * @returns An observable of the record of how they came in.
   */
  acceptInvitation(
    invitationId: string,
    characterId: string,
  ): Observable<MyFleetApplication> {
    return this.authenticated(options =>
      this._http.post<MyFleetApplication>(
        `${API_URLS.FLEET_RECRUITMENT}/invitations/${invitationId}/accept`,
        { characterId },
        options,
      ),
    );
  }

  /**
   * Declines an invitation.
   *
   * @param invitationId - The invitation.
   * @returns An observable that completes when it is declined.
   */
  declineInvitation(invitationId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${API_URLS.FLEET_RECRUITMENT}/invitations/${invitationId}/decline`,
        {},
        options,
      ),
    );
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
   * The address of a Fleet's recruitment.
   *
   * @param communityId - The Community holding the Fleet.
   * @param fleetId - The Fleet.
   * @returns The address.
   */
  private recruitmentUrl(communityId: string, fleetId: string): string {
    return `${API_URLS.FLEET_COMMUNITIES}/${communityId}/fleets/${fleetId}/recruitment`;
  }
}
