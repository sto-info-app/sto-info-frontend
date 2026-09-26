import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParamMap, RouterLink } from '@angular/router';

import { map, Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  APPLICATION_ACTION_LABELS,
  APPLICATION_ROUTE_LABELS,
  APPLICATION_STATUS_LABELS,
  APPLICATIONS_DECIDE_CAPABILITY,
  APPLICATIONS_VIEW_CAPABILITY,
  RECRUITMENT_LIMITS,
} from 'src/app/fleet/recruitment/recruitment.constants';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  ApplicationAnswer,
  FleetApplicationDetail,
  FleetApplicationStatus,
} from 'src/app/models/fleet-recruitment.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not read the application. */
export const FLEET_APPLICATION_NOT_PERMITTED =
  'Reading this Fleet’s applications is for its recruiters.';

/** What to say once a decision is recorded. */
export const APPLICATION_DECIDED = 'The decision is recorded.';

/** What to say when a decision failed for a reason the server did not give. */
export const APPLICATION_DECISION_FAILED =
  'The decision could not be recorded. Please try again.';

/** The application, and the Fleet it was made to. */
export interface FleetApplicationDetailData {
  readonly section: FleetSection;
  readonly application: FleetApplicationDetail;
}

/** A decision as the form holds it. */
export type ApplicationDecision = 'ACCEPT' | 'REJECT';

/**
 * One application to a Fleet, in full, for its recruiters (FC-021).
 *
 * The answers beside the questions as they were asked, what the Fleet's
 * roster says about the Character, and every step the application has been
 * through. A decider holding `applications.decide` accepts or rejects one
 * still waiting: a rejection needs a reason, which the applicant is shown,
 * and a decision made after somebody else's is refused rather than
 * overwriting it.
 */
@Component({
  selector: 'app-fleet-application-detail',
  templateUrl: './fleet-application-detail.component.html',
  styleUrls: ['./fleet-application-detail.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetApplicationDetailComponent extends FleetSectionPageDirective<FleetApplicationDetailData> {
  private readonly _recruitment = inject(FleetRecruitmentService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = FLEET_APPLICATION_NOT_PERMITTED;
  readonly statusLabels = APPLICATION_STATUS_LABELS;
  readonly routeLabels = APPLICATION_ROUTE_LABELS;
  readonly actionLabels = APPLICATION_ACTION_LABELS;
  readonly noteLimit = RECRUITMENT_LIMITS.DECISION_NOTE;

  protected readonly _requiredCapabilities = [APPLICATIONS_VIEW_CAPABILITY];

  protected override readonly _needsRoster = false;

  /** The decision chosen, if any yet. */
  readonly decision = signal<ApplicationDecision | null>(null);

  /** The reason or note typed. */
  readonly note = signal('');

  /** Whether a decision is under way. */
  readonly busy = signal(false);

  /** What the last decision came to, if it was refused or failed. */
  readonly decisionError = signal<string | null>(null);

  /** What the last decision came to, if it was recorded. */
  readonly decisionNotice = signal<string | null>(null);

  /**
   * Whether the reader may decide this application now.
   *
   * @param data - The page.
   * @returns True for a decider, on an application still waiting.
   */
  mayDecide(data: FleetApplicationDetailData): boolean {
    return (
      data.application.status === FleetApplicationStatus.PENDING &&
      data.section.tabs.capabilities.includes(APPLICATIONS_DECIDE_CAPABILITY)
    );
  }

  /**
   * Whether the decision chosen may be sent: one is chosen, a rejection has
   * its reason, and nothing is under way.
   *
   * @returns True when Record would send something the server could take.
   */
  canDecide(): boolean {
    const decision = this.decision();

    return (
      !this.busy() &&
      decision !== null &&
      (decision === 'ACCEPT' || this.note().trim() !== '')
    );
  }

  /**
   * How an answer reads.
   *
   * @param answer - The answer.
   * @returns Yes or No for a yes-or-no question, the text otherwise, and a
   *   dash where an optional question was left.
   */
  answerOf(answer: ApplicationAnswer): string {
    if (answer.value === null) {
      return 'Not answered';
    }

    if (typeof answer.value === 'boolean') {
      return answer.value ? 'Yes' : 'No';
    }

    return answer.value;
  }

  /**
   * Where the inbox is.
   *
   * @param data - The page.
   * @returns The router link.
   */
  applicationsLink(data: FleetApplicationDetailData): string[] {
    const { communitySlug, platformSegment, fleetSlug } = data.section.tabs;

    return FLEET_LINKS.fleetApplications(
      communitySlug,
      platformSegment,
      fleetSlug,
    );
  }

  /**
   * Chooses a decision.
   *
   * @param decision - Accept or reject.
   */
  onDecision(decision: ApplicationDecision): void {
    this.decision.set(decision);
  }

  /**
   * Records the decision chosen, when it may be sent. Pressing Enter in the
   * form submits it whatever the button says, so this asks again.
   *
   * @param data - The page, with the revision it read.
   */
  onSubmit(data: FleetApplicationDetailData): void {
    if (!this.canDecide()) {
      return;
    }

    const note = this.note().trim();

    this.busy.set(true);
    this.decisionError.set(null);
    this.decisionNotice.set(null);
    this._recruitment
      .decide(
        data.section.communityId,
        data.section.fleetId,
        data.application.id,
        {
          decision: this.decision() as ApplicationDecision,
          ...(note === '' ? {} : { note }),
          revision: data.application.revision,
        },
      )
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.decision.set(null);
          this.note.set('');
          this.decisionNotice.set(APPLICATION_DECIDED);
          this.reload();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.decisionError.set(
            recruitmentRefusalOf(error, APPLICATION_DECISION_FAILED),
          );

          // Decided or changed by somebody else meanwhile: what the page
          // shows is out of date, so it is read again beneath the message.
          if (
            error instanceof HttpErrorResponse &&
            error.status === HttpStatusCode.Conflict
          ) {
            this.reload();
          }
        },
      });
  }

  /**
   * Reads the application the address names.
   *
   * @param section - The Fleet.
   * @param _query - The address's query, unused.
   * @param params - The address, naming the application.
   * @returns The application, with the Fleet.
   */
  protected load(
    section: FleetSection,
    _query: ParamMap,
    params: ParamMap,
  ): Observable<FleetApplicationDetailData> {
    return this._recruitment
      .application(
        section.communityId,
        section.fleetId,
        params.get('applicationId') ?? '',
      )
      .pipe(map(application => ({ section, application })));
  }
}
