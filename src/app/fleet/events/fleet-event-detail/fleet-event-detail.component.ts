import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { catchError, forkJoin, map, Observable, of } from 'rxjs';

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
  fleetEventActionLabel,
  FLEET_ADJUSTMENT_NOTES,
  FLEET_REMINDER_LABELS,
  fleetEventRuleOf,
} from 'src/app/fleet/events/fleet-events.constants';
import { FleetEventsPageDirective } from 'src/app/fleet/events/fleet-events-page.directive';
import { GovernanceScopeVm } from 'src/app/fleet/governance/governance-page.directive';
import { RecruitmentCharacterOption } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetEventAction,
  FleetEventDetail,
  FleetOccurrenceSummary,
  FLEET_REMINDER_LEADS,
  FleetReminderLead,
} from 'src/app/models/fleet-events.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';

/** An event, and the reader's Characters to answer as. */
export interface FleetEventDetailData {
  readonly event: FleetEventDetail;
  readonly characters: readonly RecruitmentCharacterOption[];
}

/**
 * One event (FC-030): what it is, who it is for, how it repeats, and what
 * lies ahead of it.
 *
 * Anybody it is shown to may answer each occurrence ahead, as one of their
 * own Characters if they choose, and ask to be reminded. Its event managers
 * change it from now on, cancel it, cancel or move one occurrence, and read
 * its change log. Every change is made by the server, which says why when it
 * refuses.
 */
@Component({
  selector: 'app-fleet-event-detail',
  templateUrl: './fleet-event-detail.component.html',
  styleUrls: ['../fleet-events.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    MarkdownPipe,
    RouterLink,
    ArmadaTabsComponent,
    FleetEventAnswerComponent,
    FleetEventWhenComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetEventDetailComponent extends FleetEventsPageDirective<FleetEventDetailData> {
  private readonly _accounts = inject(StoAccountService);

  readonly leads = FLEET_REMINDER_LEADS;
  readonly leadLabels = FLEET_REMINDER_LABELS;
  readonly adjustmentNotes = FLEET_ADJUSTMENT_NOTES;

  /** The leads ticked, before they are saved. */
  readonly chosenLeads = signal<readonly FleetReminderLead[]>([]);

  /** The occurrence being moved, if any. */
  readonly moving = signal<string | null>(null);

  /** Where it is being moved to. */
  readonly moveDate = signal('');
  readonly moveTime = signal('');

  /** The change log, once asked for. */
  readonly history = signal<readonly FleetEventAction[] | null>(null);

  /**
   * Says what a change-log line records.
   *
   * @param action - The line.
   * @returns What was done.
   */
  actionLabel(action: FleetEventAction): string {
    return fleetEventActionLabel(action);
  }

  /**
   * Whether the reader is signed in, and so may answer and be reminded.
   *
   * @returns True when signed in.
   */
  isSignedIn(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * How the event repeats, in a sentence.
   *
   * @param event - The event.
   * @returns The rule.
   */
  ruleOf(event: FleetEventDetail): string {
    return fleetEventRuleOf(event);
  }

  /**
   * Whether an occurrence may still be answered or changed.
   *
   * @param event - The event.
   * @param occurrence - The occurrence.
   * @returns True while both are going ahead.
   */
  isAhead(
    event: FleetEventDetail,
    occurrence: FleetOccurrenceSummary,
  ): boolean {
    return event.status === 'ACTIVE' && occurrence.status === 'SCHEDULED';
  }

  /**
   * Whether a lead is ticked.
   *
   * @param lead - The lead.
   * @returns True when ticked.
   */
  isChosen(lead: FleetReminderLead): boolean {
    return this.chosenLeads().includes(lead);
  }

  /**
   * Ticks or unticks a lead.
   *
   * @param lead - The lead.
   * @param checked - Whether it is now ticked.
   */
  onLead(lead: FleetReminderLead, checked: boolean): void {
    const others = this.chosenLeads().filter(each => each !== lead);

    this.chosenLeads.set(
      checked ? [...others, lead].sort((a, b) => a - b) : others,
    );
  }

  /**
   * Saves the reminders ticked, or stops them when none is.
   *
   * @param scope - The scope.
   * @param event - The event.
   */
  onSaveReminders(scope: GovernanceScopeVm, event: FleetEventDetail): void {
    const leads = this.chosenLeads();

    this.run(
      leads.length === 0
        ? this._events.stopReminding(scope.target, event.id)
        : this._events.remind(scope.target, event.id, leads),
      () => this.reload(),
    );
  }

  /**
   * Answers an occurrence.
   *
   * @param scope - The scope.
   * @param event - The event.
   * @param occurrence - The occurrence.
   * @param answer - The answer.
   */
  onAnswer(
    scope: GovernanceScopeVm,
    event: FleetEventDetail,
    occurrence: FleetOccurrenceSummary,
    answer: FleetEventAnswer,
  ): void {
    this.run(
      this._events.answer(
        scope.target,
        event.id,
        occurrence.id,
        answer.response,
        answer.characterId,
      ),
      () => this.reload(),
    );
  }

  /**
   * Takes an answer back.
   *
   * @param scope - The scope.
   * @param event - The event.
   * @param occurrence - The occurrence.
   */
  onWithdraw(
    scope: GovernanceScopeVm,
    event: FleetEventDetail,
    occurrence: FleetOccurrenceSummary,
  ): void {
    this.run(this._events.withdraw(scope.target, event.id, occurrence.id), () =>
      this.reload(),
    );
  }

  /**
   * Cancels the event, once asked.
   *
   * @param scope - The scope.
   * @param event - The event.
   */
  onCancel(scope: GovernanceScopeVm, event: FleetEventDetail): void {
    this.confirmThen(
      this._confirm.askToDestroy({
        title: 'Cancel this event?',
        question: 'Cancel every occurrence of this event still to come?',
        subject: event.title,
        consequence:
          'Whoever asked to be reminded is told. What has happened stays.',
        confirmText: 'Cancel the event',
        cancelText: 'Keep it',
      }),
      () => this._events.cancel(scope.target, event.id),
      () => this.reload(),
    );
  }

  /**
   * Cancels one occurrence, once asked.
   *
   * @param scope - The scope.
   * @param event - The event.
   * @param occurrence - The occurrence.
   */
  onCancelOccurrence(
    scope: GovernanceScopeVm,
    event: FleetEventDetail,
    occurrence: FleetOccurrenceSummary,
  ): void {
    this.confirmThen(
      this._confirm.askToDestroy({
        title: 'Cancel this occurrence?',
        question: 'Cancel this one occurrence, leaving the rest?',
        subject: `${event.title}, ${occurrence.localStart.replace('T', ' ')}`,
        consequence: 'Whoever asked to be reminded is told.',
        confirmText: 'Cancel it',
        cancelText: 'Keep it',
      }),
      () =>
        this._events.cancelOccurrence(scope.target, event.id, occurrence.id),
      () => this.reload(),
    );
  }

  /**
   * Opens the form to move an occurrence, starting from where it is.
   *
   * @param occurrence - The occurrence.
   */
  onStartMove(occurrence: FleetOccurrenceSummary): void {
    this.moving.set(occurrence.id);
    this.moveDate.set(occurrence.localStart.slice(0, 10));
    this.moveTime.set(occurrence.localStart.slice(11, 16));
  }

  /** Closes the form to move an occurrence. */
  onCancelMove(): void {
    this.moving.set(null);
  }

  /**
   * Moves an occurrence to the day and time chosen, on the event's clock.
   *
   * @param scope - The scope.
   * @param event - The event.
   * @param occurrence - The occurrence.
   */
  onMove(
    scope: GovernanceScopeVm,
    event: FleetEventDetail,
    occurrence: FleetOccurrenceSummary,
  ): void {
    this.run(
      this._events.moveOccurrence(
        scope.target,
        event.id,
        occurrence.id,
        this.moveDate(),
        this.moveTime(),
      ),
      () => {
        this.moving.set(null);
        this.reload();
      },
    );
  }

  /**
   * Reads the change log.
   *
   * @param scope - The scope.
   * @param event - The event.
   */
  onHistory(scope: GovernanceScopeVm, event: FleetEventDetail): void {
    this.run(
      this._events
        .history(scope.target, event.id)
        .pipe(map(actions => this.history.set(actions))),
      () => undefined,
    );
  }

  /**
   * Reads the event, and the reader's Characters where they may answer.
   *
   * @param scope - The scope.
   * @returns Both.
   */
  protected load(scope: GovernanceScopeVm): Observable<FleetEventDetailData> {
    const eventId = this._route.snapshot.paramMap.get('eventId') as string;

    return forkJoin({
      event: this._events.detail(scope.target, eventId),
      characters: this.isSignedIn()
        ? this._accounts.getSwitcherList().pipe(
            map(eventCharactersOf),
            // Answering without a Character is always open.
            catchError(() => of([])),
          )
        : of([]),
    }).pipe(
      map(data => {
        this.chosenLeads.set([...data.event.myReminders]);
        this.history.set(null);

        return data;
      }),
    );
  }
}
