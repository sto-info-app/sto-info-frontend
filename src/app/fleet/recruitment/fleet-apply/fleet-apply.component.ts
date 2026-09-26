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
import { RouterLink } from '@angular/router';

import { forkJoin, map, Observable, tap } from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  IN_GAME_INVITE_NOTE,
  RECRUITMENT_LIMITS,
} from 'src/app/fleet/recruitment/recruitment.constants';
import {
  RecruitmentCharacterOption,
  recruitmentCharactersOf,
  recruitmentRefusalOf,
} from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  ApplicationAnswerInput,
  ApplicationQuestionKind,
  FleetRecruitmentView,
  RecruitmentQuestion,
  ScopeMembershipStatus,
} from 'src/app/models/fleet-recruitment.models';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';

/** Never shown: anybody who can see the Fleet may open the page. */
export const FLEET_APPLY_NOT_PERMITTED = '';

/** What to say once the application is sent. */
export const APPLICATION_SENT =
  'Your application is sent. You will find the decision, and any reason ' +
  'given, on your Fleet applications page.';

/** What to say when sending failed for a reason the server did not give. */
export const APPLICATION_SEND_FAILED =
  'Your application could not be sent. Please try again.';

/** How a Fleet recruits, the reader's Characters there, and the Fleet. */
export interface FleetApplyData {
  readonly section: FleetSection;
  readonly view: FleetRecruitmentView;
  readonly characters: readonly RecruitmentCharacterOption[];
}

/**
 * Applying to a Fleet that takes applications (FC-021).
 *
 * The reader chooses one of their own Characters on the Fleet's platform,
 * reads the requirements and answers the form. The answers are sent with
 * the version of the form they answered; if the Fleet has changed it since,
 * the server refuses, and the page reads the form again. Whoever cannot
 * apply — a member, the Owner, somebody with an invitation waiting, or
 * anybody when the Fleet is not taking applications — is told why instead.
 */
@Component({
  selector: 'app-fleet-apply',
  templateUrl: './fleet-apply.component.html',
  styleUrls: ['./fleet-apply.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    RouterLink,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetApplyComponent extends FleetSectionPageDirective<FleetApplyData> {
  private readonly _recruitment = inject(FleetRecruitmentService);
  private readonly _accounts = inject(StoAccountService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = FLEET_APPLY_NOT_PERMITTED;
  readonly inGameNote = IN_GAME_INVITE_NOTE;
  readonly sentMessage = APPLICATION_SENT;
  readonly myApplicationsLink = FLEET_LINKS.myApplications();
  readonly kinds = ApplicationQuestionKind;

  protected readonly _requiredCapabilities: readonly string[] = [];

  protected override readonly _needsRoster = false;

  /** The Character chosen. */
  readonly characterId = signal('');

  /** The answers given, by question. */
  readonly answers = signal<Readonly<Record<string, string | boolean>>>({});

  /** Whether the application is being sent. */
  readonly busy = signal(false);

  /** Set once it has been sent. */
  readonly sent = signal(false);

  /** What the last attempt came to, if it was refused or failed. */
  readonly sendError = signal<string | null>(null);

  /**
   * Why the reader cannot apply, where they cannot.
   *
   * @param data - The page.
   * @returns The reason, or null when they may.
   */
  whyNot(data: FleetApplyData): string | null {
    const { settings, viewer } = data.view;

    if (viewer === null) {
      return 'Sign in to apply.';
    }

    if (viewer.isOwner) {
      return 'You own this Fleet’s Community, so you have its access already.';
    }

    if (viewer.membershipStatus === ScopeMembershipStatus.APPROVED) {
      return 'You are already a member of this Fleet.';
    }

    if (viewer.membershipStatus === ScopeMembershipStatus.SUSPENDED) {
      return 'Your membership of this Fleet is suspended.';
    }

    if (viewer.openInvitation) {
      return 'You have been invited to this Fleet. Answer the invitation on its page instead.';
    }

    if (settings.recruitmentState !== FleetRecruitmentState.APPLICATION) {
      return 'This Fleet is not taking applications.';
    }

    return null;
  }

  /**
   * Where the Fleet's own page is.
   *
   * @param data - The page.
   * @returns The router link.
   */
  fleetLink(data: FleetApplyData): string[] {
    const { communitySlug, platformSegment, fleetSlug } = data.section.tabs;

    return FLEET_LINKS.fleet(communitySlug, platformSegment, fleetSlug);
  }

  /**
   * The most an answer to a question may say.
   *
   * @param question - The question.
   * @returns The limit.
   */
  limitOf(question: RecruitmentQuestion): number {
    return question.kind === ApplicationQuestionKind.LONG_TEXT
      ? RECRUITMENT_LIMITS.LONG_ANSWER
      : RECRUITMENT_LIMITS.SHORT_ANSWER;
  }

  /**
   * Records an answer.
   *
   * @param questionId - The question.
   * @param value - The answer.
   */
  onAnswer(questionId: string, value: string | boolean): void {
    this.answers.update(answers => ({ ...answers, [questionId]: value }));
  }

  /**
   * The answer given to a question.
   *
   * @param questionId - The question.
   * @returns It, or undefined.
   */
  answerTo(questionId: string): string | boolean | undefined {
    return this.answers()[questionId];
  }

  /**
   * The answers to send: each text trimmed, and a question left blank left
   * out, as the server expects of an optional one.
   *
   * @param data - The page.
   * @returns The answers.
   */
  answersOf(data: FleetApplyData): ApplicationAnswerInput[] {
    const answers = this.answers();

    return data.view.settings.questions
      .map(question => ({
        questionId: question.id,
        value:
          typeof answers[question.id] === 'string'
            ? (answers[question.id] as string).trim()
            : answers[question.id],
      }))
      .filter(
        (answer): answer is ApplicationAnswerInput =>
          answer.value !== undefined && answer.value !== '',
      );
  }

  /**
   * Whether the form may be sent: a Character chosen and every required
   * question answered.
   *
   * @param data - The page.
   * @returns True when Send would send something the server could take.
   */
  canSend(data: FleetApplyData): boolean {
    const answered = new Set(
      this.answersOf(data).map(answer => answer.questionId),
    );

    return (
      !this.busy() &&
      this.characterId() !== '' &&
      data.view.settings.questions.every(
        question => !question.required || answered.has(question.id),
      )
    );
  }

  /**
   * Sends the application, when it may be sent. Pressing Enter submits the
   * form whatever the button says, so this checks again.
   *
   * @param data - The page, with the form version it read.
   */
  onSubmit(data: FleetApplyData): void {
    if (!this.canSend(data)) {
      return;
    }

    this.busy.set(true);
    this.sendError.set(null);
    this._recruitment
      .apply(data.section.communityId, data.section.fleetId, {
        characterId: this.characterId(),
        settingsVersion: data.view.settings.version,
        answers: this.answersOf(data),
      })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.sent.set(true);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.sendError.set(
            recruitmentRefusalOf(error, APPLICATION_SEND_FAILED),
          );

          // The form has changed since it was read: read it again, keeping
          // what can be kept.
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
   * Reads how the Fleet recruits and the reader's Characters there.
   *
   * @param section - The Fleet.
   * @returns Both, with the Fleet.
   */
  protected load(section: FleetSection): Observable<FleetApplyData> {
    const platformName = section.resolved.fleet.platformName;

    return forkJoin({
      view: this._recruitment.view(section.communityId, section.fleetId),
      accounts: this._accounts.getSwitcherList(),
    }).pipe(
      map(({ view, accounts }) => ({
        section,
        view,
        characters: recruitmentCharactersOf(accounts, platformName),
      })),
      tap(data => {
        if (data.characters.length === 1) {
          this.characterId.set(data.characters[0].id);
        }
      }),
    );
  }
}
