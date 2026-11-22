import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import {
  CharacterFleetMembership,
  CharacterFleetProposal,
  FleetAudience,
  RecordCharacterFleet,
} from 'src/app/models/fleet.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * What a user says about their own Characters' Fleets, and what has been
 * suggested to them.
 *
 * Every call here is about the caller's own records, so every one carries
 * their token and none of them takes a Community or a Fleet address: the
 * Character is the only thing being asked about, and the server proves
 * ownership of it before doing anything.
 */
@Injectable({ providedIn: 'root' })
export class CharacterFleetService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads a Character's own Fleet history.
   *
   * @param characterId - The Character to read.
   * @returns Every membership, current and past, newest first.
   */
  history(characterId: string): Observable<CharacterFleetMembership[]> {
    return this._http.get<CharacterFleetMembership[]>(
      this.fleetsUrl(characterId),
      this.options(),
    );
  }

  /**
   * Records that a Character is, or was, in a Fleet.
   *
   * @param characterId - The Character being recorded against.
   * @param record - The Fleet, the interval and the audience.
   * @returns The membership that was written.
   */
  record(
    characterId: string,
    record: RecordCharacterFleet,
  ): Observable<CharacterFleetMembership> {
    return this._http.post<CharacterFleetMembership>(
      this.fleetsUrl(characterId),
      record,
      this.options(),
    );
  }

  /**
   * Records that a Character has left their Fleet.
   *
   * Sends no instant, which the server reads as now. Somebody recording a
   * departure has almost always just made it.
   *
   * @param characterId - The Character leaving.
   * @returns The membership as it now stands, closed.
   */
  leave(characterId: string): Observable<CharacterFleetMembership> {
    return this._http.patch<CharacterFleetMembership>(
      `${this.fleetsUrl(characterId)}/current`,
      {},
      this.options(),
    );
  }

  /**
   * Changes who may see one membership.
   *
   * @param characterId - The Character it was recorded against.
   * @param membershipId - The membership to change.
   * @param visibility - The audience it should have.
   * @returns The membership as it now stands.
   */
  setVisibility(
    characterId: string,
    membershipId: string,
    visibility: FleetAudience,
  ): Observable<CharacterFleetMembership> {
    return this._http.patch<CharacterFleetMembership>(
      `${this.fleetsUrl(characterId)}/${membershipId}/visibility`,
      { visibility },
      this.options(),
    );
  }

  /**
   * Withdraws a membership that should never have been recorded.
   *
   * Not the same thing as leaving a Fleet, which keeps the record. This one
   * takes it out of the history, for the association that did not happen.
   *
   * @param characterId - The Character it was recorded against.
   * @param membershipId - The membership to withdraw.
   * @returns Nothing, on success.
   */
  retract(characterId: string, membershipId: string): Observable<void> {
    return this._http.delete<void>(
      `${this.fleetsUrl(characterId)}/${membershipId}`,
      this.options(),
    );
  }

  /**
   * Reads the proposals raised about a Character.
   *
   * @param characterId - The Character to read.
   * @returns Every proposal, newest first, with expiry already worked out.
   */
  proposals(characterId: string): Observable<CharacterFleetProposal[]> {
    return this._http.get<CharacterFleetProposal[]>(
      this.proposalsUrl(characterId),
      this.options(),
    );
  }

  /**
   * Accepts a proposal, which records the membership it proposed.
   *
   * @param characterId - The Character the proposal is about.
   * @param proposalId - The proposal being accepted.
   * @param visibility - Who may see the membership it opens.
   * @returns The membership the acceptance opened.
   */
  accept(
    characterId: string,
    proposalId: string,
    visibility?: FleetAudience,
  ): Observable<CharacterFleetMembership> {
    return this._http.post<CharacterFleetMembership>(
      `${this.proposalsUrl(characterId)}/${proposalId}/accept`,
      visibility === undefined ? {} : { visibility },
      this.options(),
    );
  }

  /**
   * Declines a proposal, and only that proposal.
   *
   * @param characterId - The Character the proposal is about.
   * @param proposalId - The proposal being declined.
   * @returns The proposal as it now stands.
   */
  decline(
    characterId: string,
    proposalId: string,
  ): Observable<CharacterFleetProposal> {
    return this._http.post<CharacterFleetProposal>(
      `${this.proposalsUrl(characterId)}/${proposalId}/decline`,
      {},
      this.options(),
    );
  }

  /**
   * Where a Character's memberships live.
   *
   * @param characterId - The Character.
   * @returns The collection address.
   */
  private fleetsUrl(characterId: string): string {
    return `${API_URLS.CHARACTER}/${encodeURIComponent(characterId)}/fleets`;
  }

  /**
   * Where a Character's proposals live.
   *
   * @param characterId - The Character.
   * @returns The collection address.
   */
  private proposalsUrl(characterId: string): string {
    return (
      `${API_URLS.CHARACTER}/${encodeURIComponent(characterId)}` +
      '/fleet-proposals'
    );
  }

  /**
   * The request options carrying the caller's access token.
   *
   * @returns The auth headers, or an empty bag when there is no token — in
   *   which case the server answers 401, which is the honest outcome.
   */
  private options(): Record<string, unknown> {
    return this._authService.getHttpOptionsWithAccessToken() ?? {};
  }
}
