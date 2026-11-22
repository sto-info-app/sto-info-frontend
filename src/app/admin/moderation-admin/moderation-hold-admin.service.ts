import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { ChatPerson, ChatReportPlace } from 'src/app/models/fleet-chat.models';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';

/** What a hold keeps (FC-036). */
export type ModerationHoldKind = 'CHAT_REPORT' | 'MEMBER_MESSAGES';

/** A site admins' hold on chat evidence. */
export interface ModerationHold {
  readonly id: string;
  readonly kind: ModerationHoldKind;
  readonly chatReportId: string | null;
  /** Whose messages are kept, or whose reported message. */
  readonly subject: ChatPerson | null;
  readonly reason: string;
  readonly owner: ChatPerson | null;
  readonly reviewAt: string;
  /** Whether its review date has come. */
  readonly reviewDue: boolean;
  /**
   * When STO Info releases it unless somebody extends it first; null once
   * released (FC-037).
   */
  readonly releasesAt: string | null;
  readonly createdAt: string;
  readonly releasedAt: string | null;
  readonly releasedBy: ChatPerson | null;
  readonly releaseReason: string | null;
}

/** One entry in a hold's log. */
export interface ModerationHoldAction {
  readonly action:
    | 'PLACED'
    | 'EXTENDED'
    | 'RELEASED'
    | 'READ'
    | 'REVIEW_DUE'
    | 'RELEASE_WARNED';
  readonly actor: ChatPerson | null;
  /** Whether STO Info did it, at a review date, not a site admin (FC-037). */
  readonly automatic: boolean;
  /** Why, or for a reading, its purpose. */
  readonly reason: string;
  readonly createdAt: string;
}

/** A hold with its log, newest first. */
export interface ModerationHoldDetail extends ModerationHold {
  readonly actions: ModerationHoldAction[];
}

/** One kept message. */
export interface HeldMessage {
  readonly id: string;
  readonly place: ChatReportPlace;
  /** The other side, for a direct message. */
  readonly with: ChatPerson | null;
  readonly author: ChatPerson | null;
  /** What it said, even once deleted. */
  readonly body: string | null;
  readonly deleted: boolean;
  readonly sentAt: string;
}

/** A page of kept messages, newest first. */
export interface HeldMessagePage {
  readonly messages: HeldMessage[];
  /** Where the page before starts, or null at the start. */
  readonly before: string | null;
}

/** Placing a hold. */
export type ModerationHoldRequest =
  | {
      readonly kind: 'CHAT_REPORT';
      readonly chatReportId: string;
      readonly reason: string;
    }
  | {
      readonly kind: 'MEMBER_MESSAGES';
      readonly subjectUserId: string;
      readonly reason: string;
    };

/** What still waits on an administrator (FC-036). */
export interface OpenReportCounts {
  readonly userReports: number;
  readonly chatReports: number;
  readonly total: number;
}

/**
 * The site admins' holds on chat evidence, and the combined open count of
 * both report queues (FC-036). The server refuses all of it without the
 * ADMIN role, whatever the client believes.
 */
@Injectable({
  providedIn: 'root',
})
export class ModerationHoldAdminService {
  private readonly _http = inject(HttpClient);
  private readonly _authService = inject(AuthService);

  /**
   * Lists holds, those due for review first.
   *
   * @param active - Only those in force, only those released, or all.
   * @returns Each.
   */
  list(active?: boolean): Observable<ModerationHold[]> {
    const params =
      active === undefined
        ? new HttpParams()
        : new HttpParams().set('active', String(active));

    return this.authenticated(options =>
      this._http.get<ModerationHold[]>(API_URLS.MODERATION_HOLDS_ADMIN, {
        ...options,
        params,
      }),
    );
  }

  /**
   * Places a hold, reviewed in 180 days.
   *
   * @param request - What, and why.
   * @returns The hold.
   */
  place(request: ModerationHoldRequest): Observable<ModerationHoldDetail> {
    return this.authenticated(options =>
      this._http.post<ModerationHoldDetail>(
        API_URLS.MODERATION_HOLDS_ADMIN,
        request,
        options,
      ),
    );
  }

  /**
   * Reads a hold and its log.
   *
   * @param holdId - The hold.
   * @returns It.
   */
  detail(holdId: string): Observable<ModerationHoldDetail> {
    return this.authenticated(options =>
      this._http.get<ModerationHoldDetail>(
        `${API_URLS.MODERATION_HOLDS_ADMIN}/${holdId}`,
        options,
      ),
    );
  }

  /**
   * Moves a hold's review date, with a reason.
   *
   * @param holdId - The hold.
   * @param reviewAt - The new date, as ISO 8601.
   * @param reason - Why.
   * @returns The hold.
   */
  extend(
    holdId: string,
    reviewAt: string,
    reason: string,
  ): Observable<ModerationHoldDetail> {
    return this.authenticated(options =>
      this._http.post<ModerationHoldDetail>(
        `${API_URLS.MODERATION_HOLDS_ADMIN}/${holdId}/extend`,
        { reviewAt, reason },
        options,
      ),
    );
  }

  /**
   * Releases a hold, with a reason.
   *
   * @param holdId - The hold.
   * @param reason - Why.
   * @returns The hold.
   */
  release(holdId: string, reason: string): Observable<ModerationHoldDetail> {
    return this.authenticated(options =>
      this._http.post<ModerationHoldDetail>(
        `${API_URLS.MODERATION_HOLDS_ADMIN}/${holdId}/release`,
        { reason },
        options,
      ),
    );
  }

  /**
   * Reads what a hold keeps, with a purpose. Every reading is logged.
   *
   * @param holdId - The hold.
   * @param purpose - Why.
   * @param before - Where to carry on from, if anywhere.
   * @returns A page, newest first.
   */
  read(
    holdId: string,
    purpose: string,
    before?: string,
  ): Observable<HeldMessagePage> {
    return this.authenticated(options =>
      this._http.post<HeldMessagePage>(
        `${API_URLS.MODERATION_HOLDS_ADMIN}/${holdId}/read`,
        before === undefined ? { purpose } : { purpose, before },
        options,
      ),
    );
  }

  /**
   * Counts what still waits on an administrator, in both report queues.
   *
   * @returns Both counts, and their total.
   */
  openCounts(): Observable<OpenReportCounts> {
    return this.authenticated(options =>
      this._http.get<OpenReportCounts>(
        API_URLS.MODERATION_ADMIN_OPEN_COUNTS,
        options,
      ),
    );
  }

  /**
   * Runs a request with the access token, or refuses without one.
   *
   * @param request - The request.
   * @returns Its answer.
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
