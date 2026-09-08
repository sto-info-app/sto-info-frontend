import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  Collaborator,
  CollaboratorCapabilities,
  CrewCredit,
  CrewCreditRequest,
  CrewRole,
  InviteCollaboratorRequest,
} from 'src/app/models/storytime.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * Who helps write a Story, and who is credited for it.
 *
 * The two are separate everywhere, including here: inviting somebody hands
 * them the ability to change the Story, while crediting them is public thanks
 * that confers nothing.
 */
@Injectable({
  providedIn: 'root',
})
export class CrewService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  // ----- Reading -----

  /**
   * Lists the roles a credit may be given in.
   *
   * @returns An observable of the roles, in credits-roll order.
   */
  getRoles(): Observable<CrewRole[]> {
    return this._http.get<CrewRole[]>(API_URLS.STORYTIME_CREW_ROLES);
  }

  /**
   * Reads a published Story's credits.
   *
   * @param storySlug - The Story slug.
   * @returns An observable of the credits, in credits-roll order.
   */
  getCredits(storySlug: string): Observable<CrewCredit[]> {
    return this._http.get<CrewCredit[]>(
      `${API_URLS.STORYTIME_STORIES}/${encodeURIComponent(storySlug)}/credits`,
    );
  }

  // ----- Collaborators -----

  /**
   * Lists who is helping write a Story.
   *
   * @param storyId - The Story.
   * @returns An observable of the collaborators.
   */
  getCollaborators(storyId: string): Observable<Collaborator[]> {
    return this.authenticated(options =>
      this._http.get<Collaborator[]>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/collaborators`,
        options,
      ),
    );
  }

  /**
   * Lists the invitations waiting on the caller.
   *
   * @returns An observable of their unanswered invitations.
   */
  getMyInvitations(): Observable<Collaborator[]> {
    return this.authenticated(options =>
      this._http.get<Collaborator[]>(
        `${API_URLS.STORYTIME_MANAGE_COLLABORATIONS}/invitations`,
        options,
      ),
    );
  }

  /**
   * Invites somebody to help write a Story.
   *
   * @param storyId - The Story.
   * @param payload - Who to invite and what they may do.
   * @returns An observable of the invitation.
   */
  invite(
    storyId: string,
    payload: InviteCollaboratorRequest,
  ): Observable<Collaborator> {
    return this.authenticated(options =>
      this._http.post<Collaborator>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/collaborators`,
        payload,
        options,
      ),
    );
  }

  /**
   * Changes what a collaborator may do.
   *
   * @param collaboratorId - The collaboration.
   * @param capabilities - The capabilities to set.
   * @returns An observable of the collaboration after the change.
   */
  updateCollaborator(
    collaboratorId: string,
    capabilities: CollaboratorCapabilities,
  ): Observable<Collaborator> {
    return this.authenticated(options =>
      this._http.patch<Collaborator>(
        `${API_URLS.STORYTIME_MANAGE_COLLABORATORS}/${collaboratorId}`,
        capabilities,
        options,
      ),
    );
  }

  /**
   * Accepts an invitation.
   *
   * @param collaboratorId - The invitation.
   * @returns An observable of the accepted collaboration.
   */
  accept(collaboratorId: string): Observable<Collaborator> {
    return this.collaboratorAction(collaboratorId, 'accept');
  }

  /**
   * Declines an invitation.
   *
   * @param collaboratorId - The invitation.
   * @returns An observable of the declined collaboration.
   */
  decline(collaboratorId: string): Observable<Collaborator> {
    return this.collaboratorAction(collaboratorId, 'decline');
  }

  /**
   * Withdraws an invitation, removes a collaborator, or steps down.
   *
   * @param collaboratorId - The collaboration.
   * @returns An observable of the revoked collaboration.
   */
  revoke(collaboratorId: string): Observable<Collaborator> {
    return this.collaboratorAction(collaboratorId, 'revoke');
  }

  // ----- Credits -----

  /**
   * Credits somebody on a Story.
   *
   * @param storyId - The Story.
   * @param payload - The credit to add.
   * @returns An observable of the credit.
   */
  addCredit(
    storyId: string,
    payload: CrewCreditRequest,
  ): Observable<CrewCredit> {
    return this.authenticated(options =>
      this._http.post<CrewCredit>(
        `${API_URLS.STORYTIME_MANAGE_STORIES}/${storyId}/credits`,
        payload,
        options,
      ),
    );
  }

  /**
   * Rewords a credit.
   *
   * @param creditId - The credit.
   * @param payload - The wording and notes.
   * @returns An observable of the updated credit.
   */
  updateCredit(
    creditId: string,
    payload: { creditLabel?: string; notes?: string },
  ): Observable<CrewCredit> {
    return this.authenticated(options =>
      this._http.patch<CrewCredit>(
        `${API_URLS.STORYTIME_MANAGE_CREDITS}/${creditId}`,
        payload,
        options,
      ),
    );
  }

  /**
   * Removes a credit.
   *
   * @param creditId - The credit.
   * @returns An observable that completes when the credit is removed.
   */
  removeCredit(creditId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${API_URLS.STORYTIME_MANAGE_CREDITS}/${creditId}`,
        options,
      ),
    );
  }

  /**
   * Performs a state-changing action on a collaboration.
   *
   * @param collaboratorId - The collaboration.
   * @param action - The action path segment.
   * @returns An observable of the resulting collaboration.
   */
  private collaboratorAction(
    collaboratorId: string,
    action: string,
  ): Observable<Collaborator> {
    return this.authenticated(options =>
      this._http.post<Collaborator>(
        `${API_URLS.STORYTIME_MANAGE_COLLABORATORS}/${collaboratorId}/${action}`,
        {},
        options,
      ),
    );
  }

  /**
   * Runs a request with the access token attached.
   *
   * @param request - Builds the request from the authenticated options.
   * @returns The request's observable, or an error when there is no token.
   */
  private authenticated<T>(
    request: (options: { headers: HttpHeaders }) => Observable<T>,
  ): Observable<T> {
    const httpOptions = this._authService.getHttpOptionsWithAccessToken();

    if (!httpOptions) {
      return throwError(() => new Error('No token found'));
    }

    return request(httpOptions);
  }
}
