import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { GovernanceTarget } from 'src/app/fleet/governance/fleet-governance.service';
import {
  FleetAttendanceSheet,
  FleetEventAction,
  FleetEventCalendar,
  FleetEventDefinition,
  FleetEventDetail,
  FleetEventPreview,
  FleetMyAnswer,
  FleetOccurrenceDetail,
  FleetReminderLead,
  FleetRsvpResponse,
  FleetUpcoming,
} from 'src/app/models/fleet-events.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/**
 * A Community's, a Fleet's and an Armada's events (FC-028, FC-030).
 *
 * Reading goes with the access token when there is one and without it when
 * there is not: which events and answers a reader sees is the server's
 * answer, asked afresh each time. Anything that changes an event, an answer
 * or a reminder needs the token.
 */
@Injectable({
  providedIn: 'root',
})
export class FleetEventsService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Reads a stretch of a scope's calendar.
   *
   * @param target - The scope.
   * @param from - From, an ISO instant.
   * @param to - To, an ISO instant, at most 93 days on.
   * @returns The occurrences in it, soonest first.
   */
  calendar(
    target: GovernanceTarget,
    from: string,
    to: string,
  ): Observable<FleetEventCalendar> {
    return this._http.get<FleetEventCalendar>(this.eventsUrl(target), {
      ...(this._authService.getHttpOptionsWithAccessToken() ?? {}),
      params: new HttpParams().set('from', from).set('to', to),
    });
  }

  /**
   * Reads an event, its rule and what lies ahead.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @returns The event.
   */
  detail(
    target: GovernanceTarget,
    eventId: string,
  ): Observable<FleetEventDetail> {
    return this._http.get<FleetEventDetail>(
      `${this.eventsUrl(target)}/${eventId}`,
      this._authService.getHttpOptionsWithAccessToken() ?? {},
    );
  }

  /**
   * Reads one occurrence, and who answered where the reader may know.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param occurrenceId - The occurrence.
   * @returns The occurrence.
   */
  occurrence(
    target: GovernanceTarget,
    eventId: string,
    occurrenceId: string,
  ): Observable<FleetOccurrenceDetail> {
    return this._http.get<FleetOccurrenceDetail>(
      this.occurrenceUrl(target, eventId, occurrenceId),
      this._authService.getHttpOptionsWithAccessToken() ?? {},
    );
  }

  /**
   * Reads the signed-in person's own upcoming occurrences: those they
   * answered, are waiting for, or asked to be reminded of.
   *
   * @returns Their next thirty days, soonest first.
   */
  mine(): Observable<FleetUpcoming> {
    return this.authenticated(options =>
      this._http.get<FleetUpcoming>(`${API_URLS.FLEET_EVENTS}/mine`, options),
    );
  }

  /**
   * Shows what a rule would come to, before saving it.
   *
   * @param target - The scope.
   * @param definition - The event as written so far.
   * @returns Its occurrences over the next year, and any months skipped.
   */
  preview(
    target: GovernanceTarget,
    definition: FleetEventDefinition,
  ): Observable<FleetEventPreview> {
    return this.authenticated(options =>
      this._http.post<FleetEventPreview>(
        `${this.eventsUrl(target)}/preview`,
        definition,
        options,
      ),
    );
  }

  /**
   * Creates an event.
   *
   * @param target - The scope.
   * @param definition - The event.
   * @returns The event as saved.
   */
  create(
    target: GovernanceTarget,
    definition: FleetEventDefinition,
  ): Observable<FleetEventDetail> {
    return this.authenticated(options =>
      this._http.post<FleetEventDetail>(
        this.eventsUrl(target),
        definition,
        options,
      ),
    );
  }

  /**
   * Changes an event from now on.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param definition - The event as it should now be.
   * @returns The event as saved.
   */
  update(
    target: GovernanceTarget,
    eventId: string,
    definition: FleetEventDefinition,
  ): Observable<FleetEventDetail> {
    return this.authenticated(options =>
      this._http.put<FleetEventDetail>(
        `${this.eventsUrl(target)}/${eventId}`,
        definition,
        options,
      ),
    );
  }

  /**
   * Cancels an event: everything of it still to come.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @returns Completes once cancelled.
   */
  cancel(target: GovernanceTarget, eventId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.eventsUrl(target)}/${eventId}/cancel`,
        {},
        options,
      ),
    );
  }

  /**
   * Reads an event's change log, newest first.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @returns Each change.
   */
  history(
    target: GovernanceTarget,
    eventId: string,
  ): Observable<FleetEventAction[]> {
    return this.authenticated(options =>
      this._http.get<FleetEventAction[]>(
        `${this.eventsUrl(target)}/${eventId}/history`,
        options,
      ),
    );
  }

  /**
   * Asks to be reminded of an event, or changes how long before.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param leadMinutes - How long before each occurrence.
   * @returns The leads now in force.
   */
  remind(
    target: GovernanceTarget,
    eventId: string,
    leadMinutes: readonly FleetReminderLead[],
  ): Observable<FleetReminderLead[]> {
    return this.authenticated(options =>
      this._http.put<FleetReminderLead[]>(
        `${this.eventsUrl(target)}/${eventId}/reminders`,
        { leadMinutes },
        options,
      ),
    );
  }

  /**
   * Stops reminding of an event.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @returns Completes once stopped.
   */
  stopReminding(target: GovernanceTarget, eventId: string): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${this.eventsUrl(target)}/${eventId}/reminders`,
        options,
      ),
    );
  }

  /**
   * Cancels one occurrence.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param occurrenceId - The occurrence.
   * @returns Completes once cancelled.
   */
  cancelOccurrence(
    target: GovernanceTarget,
    eventId: string,
    occurrenceId: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.occurrenceUrl(target, eventId, occurrenceId)}/cancel`,
        {},
        options,
      ),
    );
  }

  /**
   * Moves one occurrence to another day or time on the event's clock.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param occurrenceId - The occurrence.
   * @param date - Its new day, YYYY-MM-DD.
   * @param time - Its new start, HH:mm.
   * @returns Completes once moved.
   */
  moveOccurrence(
    target: GovernanceTarget,
    eventId: string,
    occurrenceId: string,
    date: string,
    time: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.post<void>(
        `${this.occurrenceUrl(target, eventId, occurrenceId)}/move`,
        { date, time },
        options,
      ),
    );
  }

  /**
   * Answers an occurrence.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param occurrenceId - The occurrence.
   * @param response - Going, Maybe or Can't go.
   * @param characterId - One of the answerer's own Characters, if any.
   * @returns The answer as it stands, with any place on the waitlist.
   */
  answer(
    target: GovernanceTarget,
    eventId: string,
    occurrenceId: string,
    response: FleetRsvpResponse,
    characterId: string | null,
  ): Observable<FleetMyAnswer> {
    return this.authenticated(options =>
      this._http.put<FleetMyAnswer>(
        `${this.occurrenceUrl(target, eventId, occurrenceId)}/rsvp`,
        { response, characterId },
        options,
      ),
    );
  }

  /**
   * Takes an answer back.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param occurrenceId - The occurrence.
   * @returns Completes once taken back.
   */
  withdraw(
    target: GovernanceTarget,
    eventId: string,
    occurrenceId: string,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.delete<void>(
        `${this.occurrenceUrl(target, eventId, occurrenceId)}/rsvp`,
        options,
      ),
    );
  }

  /**
   * Reads who a manager recorded came, and whom they may still record.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param occurrenceId - The occurrence.
   * @returns Each record, and the people who may be recorded.
   */
  attendance(
    target: GovernanceTarget,
    eventId: string,
    occurrenceId: string,
  ): Observable<FleetAttendanceSheet> {
    return this.authenticated(options =>
      this._http.get<FleetAttendanceSheet>(
        `${this.occurrenceUrl(target, eventId, occurrenceId)}/attendance`,
        options,
      ),
    );
  }

  /**
   * Records whether somebody came.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param occurrenceId - The occurrence.
   * @param userId - Who.
   * @param attended - Whether they came.
   * @returns Completes once recorded.
   */
  recordAttendance(
    target: GovernanceTarget,
    eventId: string,
    occurrenceId: string,
    userId: string,
    attended: boolean,
  ): Observable<void> {
    return this.authenticated(options =>
      this._http.put<void>(
        `${this.occurrenceUrl(target, eventId, occurrenceId)}/attendance`,
        { userId, attended },
        options,
      ),
    );
  }

  /**
   * Where a scope's events are.
   *
   * @param target - The scope.
   * @returns The collection's URL.
   */
  private eventsUrl(target: GovernanceTarget): string {
    const community = `${API_URLS.FLEET_COMMUNITIES}/${target.communityId}`;

    if (target.fleetId !== null) {
      return `${community}/fleets/${target.fleetId}/events`;
    }

    if (target.armadaId) {
      return `${community}/armadas/${target.armadaId}/events`;
    }

    return `${community}/events`;
  }

  /**
   * Where one occurrence is.
   *
   * @param target - The scope.
   * @param eventId - The event.
   * @param occurrenceId - The occurrence.
   * @returns Its URL.
   */
  private occurrenceUrl(
    target: GovernanceTarget,
    eventId: string,
    occurrenceId: string,
  ): string {
    return `${this.eventsUrl(target)}/${eventId}/occurrences/${occurrenceId}`;
  }

  /**
   * Sends a request that needs the access token, or refuses without one.
   *
   * @param request - The request, given the options carrying the token.
   * @returns Its response.
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
}
