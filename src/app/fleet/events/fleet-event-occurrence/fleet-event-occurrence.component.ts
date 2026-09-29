import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import {
  FleetEventAnswer,
  FleetEventAnswerComponent,
} from 'src/app/fleet/events/fleet-event-answer/fleet-event-answer.component';
import { FleetEventWhenComponent } from 'src/app/fleet/events/fleet-event-when/fleet-event-when.component';
import {
  eventCharactersOf,
  FLEET_ADJUSTMENT_NOTES,
  FLEET_RSVP_LABELS,
} from 'src/app/fleet/events/fleet-events.constants';
import { FleetEventsPageDirective } from 'src/app/fleet/events/fleet-events-page.directive';
import { GovernanceScopeVm } from 'src/app/fleet/governance/governance-page.directive';
import { RecruitmentCharacterOption } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetAttendance,
  FleetAttendanceCandidate,
  FleetAttendanceSheet,
  FleetOccurrenceDetail,
  FleetOccurrencePerson,
} from 'src/app/models/fleet-events.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** How the people who answered are grouped. */
type AnswerGroup = 'GOING' | 'WAITING' | 'MAYBE' | 'NOT_GOING';

/** The groups, in the order they are listed. */
const ANSWER_GROUPS: readonly { key: AnswerGroup; label: string }[] = [
  { key: 'GOING', label: 'Going' },
  { key: 'WAITING', label: 'Waiting for a place, in order' },
  { key: 'MAYBE', label: 'Maybe' },
  { key: 'NOT_GOING', label: 'Can’t go' },
];

/** One occurrence, the reader's Characters, and a manager's sheet. */
export interface FleetEventOccurrenceData {
  readonly detail: FleetOccurrenceDetail;
  readonly characters: readonly RecruitmentCharacterOption[];
  /** For its managers once it has started; null otherwise. */
  readonly sheet: FleetAttendanceSheet | null;
}

/**
 * One occurrence of an event (FC-030).
 *
 * Anybody it is shown to sees when it is and how many are going; the
 * scope's members and managers see who. The reader answers it until it
 * starts, and sees what was recorded of their own attendance. Once it has
 * started, its managers record who came: everybody who answered, then the
 * scope's members who did not, found by name.
 */
@Component({
  selector: 'app-fleet-event-occurrence',
  templateUrl: './fleet-event-occurrence.component.html',
  styleUrls: ['../fleet-events.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    RouterLink,
    ArmadaTabsComponent,
    FleetEventAnswerComponent,
    FleetEventWhenComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetEventOccurrenceComponent extends FleetEventsPageDirective<FleetEventOccurrenceData> {
  private readonly _accounts = inject(StoAccountService);

  readonly responseLabels = FLEET_RSVP_LABELS;
  readonly adjustmentNotes = FLEET_ADJUSTMENT_NOTES;
  readonly groups = ANSWER_GROUPS;

  /** The name the sheet is filtered by. */
  readonly filter = signal('');

  /**
   * Whether the occurrence may still be answered.
   *
   * @param detail - The occurrence.
   * @returns True while it is going ahead and has not started.
   */
  isAhead(detail: FleetOccurrenceDetail): boolean {
    return (
      detail.event.status === 'ACTIVE' &&
      detail.occurrence.status === 'SCHEDULED' &&
      new Date(detail.occurrence.startsAt) > new Date()
    );
  }

  /**
   * The people who answered one way.
   *
   * @param detail - The occurrence.
   * @param group - Going with a place, waiting, Maybe or Can't go.
   * @returns Them, in the server's order.
   */
  peopleIn(
    detail: FleetOccurrenceDetail,
    group: AnswerGroup,
  ): FleetOccurrencePerson[] {
    return detail.people.filter(person =>
      group === 'WAITING'
        ? person.waitlisted
        : !person.waitlisted && person.response === group,
    );
  }

  /**
   * Names somebody who answered, with their Character.
   *
   * @param person - Who.
   * @returns Such as "Kira, as Kira@kira#1234".
   */
  personLine(person: FleetOccurrencePerson): string {
    const name = person.username ?? 'Somebody';

    return person.characterName ? `${name}, as ${person.characterName}` : name;
  }

  /**
   * Says what was recorded of the reader.
   *
   * @param mine - Their record.
   * @returns The sentence.
   */
  attendanceLine(mine: FleetAttendance): string {
    const came = mine.attended ? 'having come' : 'not having come';

    return mine.characterName
      ? `You were recorded as ${came}, as ${mine.characterName}.`
      : `You were recorded as ${came}.`;
  }

  /**
   * The people on the sheet, filtered by name.
   *
   * @param sheet - The sheet.
   * @returns Those whose username holds the filter.
   */
  candidatesOf(sheet: FleetAttendanceSheet): FleetAttendanceCandidate[] {
    const wanted = this.filter().trim().toLowerCase();

    return sheet.candidates.filter(
      candidate =>
        wanted === '' ||
        (candidate.username ?? '').toLowerCase().includes(wanted),
    );
  }

  /**
   * What was recorded of somebody.
   *
   * @param sheet - The sheet.
   * @param userId - Who.
   * @returns Their record, or null.
   */
  recordOf(
    sheet: FleetAttendanceSheet,
    userId: string,
  ): FleetAttendance | null {
    return sheet.records.find(record => record.userId === userId) ?? null;
  }

  /**
   * Answers the occurrence.
   *
   * @param scope - The scope.
   * @param detail - The occurrence.
   * @param answer - The answer.
   */
  onAnswer(
    scope: GovernanceScopeVm,
    detail: FleetOccurrenceDetail,
    answer: FleetEventAnswer,
  ): void {
    this.run(
      this._events.answer(
        scope.target,
        detail.event.id,
        detail.occurrence.id,
        answer.response,
        answer.characterId,
      ),
      () => this.reload(),
    );
  }

  /**
   * Takes the answer back.
   *
   * @param scope - The scope.
   * @param detail - The occurrence.
   */
  onWithdraw(scope: GovernanceScopeVm, detail: FleetOccurrenceDetail): void {
    this.run(
      this._events.withdraw(
        scope.target,
        detail.event.id,
        detail.occurrence.id,
      ),
      () => this.reload(),
    );
  }

  /**
   * Records whether somebody came.
   *
   * @param scope - The scope.
   * @param detail - The occurrence.
   * @param userId - Who.
   * @param attended - Whether they came.
   */
  onRecord(
    scope: GovernanceScopeVm,
    detail: FleetOccurrenceDetail,
    userId: string,
    attended: boolean,
  ): void {
    this.run(
      this._events.recordAttendance(
        scope.target,
        detail.event.id,
        detail.occurrence.id,
        userId,
        attended,
      ),
      () => this.reload(),
    );
  }

  /**
   * Reads the occurrence, the reader's Characters where they may answer,
   * and the sheet where they run its events and it has started.
   *
   * @param scope - The scope.
   * @returns All three.
   */
  protected load(
    scope: GovernanceScopeVm,
  ): Observable<FleetEventOccurrenceData> {
    const params = this._route.snapshot.paramMap;
    const eventId = params.get('eventId') as string;
    const occurrenceId = params.get('occurrenceId') as string;

    return this._events.occurrence(scope.target, eventId, occurrenceId).pipe(
      switchMap(detail =>
        forkJoin({
          characters:
            detail.mayAnswer && this.isAhead(detail)
              ? this._accounts.getSwitcherList().pipe(
                  map(eventCharactersOf),
                  // Answering without a Character is always open.
                  catchError(() => of([])),
                )
              : of([]),
          sheet:
            detail.mayManage &&
            detail.occurrence.status === 'SCHEDULED' &&
            new Date(detail.occurrence.startsAt) <= new Date()
              ? this._events.attendance(scope.target, eventId, occurrenceId)
              : of(null),
        }).pipe(map(rest => ({ detail, ...rest }))),
      ),
    );
  }
}
