import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { forkJoin, map, Observable, tap } from 'rxjs';

import { Faction } from 'src/app/dashboard/models/character.model';
import { CharacterLookupService } from 'src/app/dashboard/services/character-lookup.service';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  QUESTION_KIND_LABELS,
  RECRUITMENT_LIMITS,
  RECRUITMENT_MANAGE_CAPABILITY,
} from 'src/app/fleet/recruitment/recruitment.constants';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  ApplicationQuestionKind,
  RecruitmentSettings,
} from 'src/app/models/fleet-recruitment.models';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import {
  draftOf,
  isSaveable,
  problemsOf,
  QuestionDraft,
  questionKey,
  requestOf,
  SettingsDraft,
  SettingsProblems,
} from './recruitment-settings.draft';

/** What to say to somebody who may not change how the Fleet recruits. */
export const FLEET_RECRUITMENT_SETTINGS_NOT_PERMITTED =
  'Changing how this Fleet recruits is for whoever the Owner trusts with it.';

/** What to say once the settings are saved. */
export const RECRUITMENT_SETTINGS_SAVED = 'Saved.';

/** What to say when nothing was changed. */
export const RECRUITMENT_SETTINGS_UNCHANGED = 'Nothing has changed to save.';

/** What to say when a save failed for a reason the server did not give. */
export const RECRUITMENT_SETTINGS_SAVE_FAILED =
  'The settings could not be saved. Please try again.';

/** The recruitment states, in the order they are offered. */
export const RECRUITMENT_STATE_OPTIONS: readonly {
  readonly value: FleetRecruitmentState;
  readonly label: string;
}[] = [
  {
    value: FleetRecruitmentState.OPEN,
    label: 'Open: anybody who meets the requirements joins at once',
  },
  {
    value: FleetRecruitmentState.APPLICATION,
    label: 'Applications: somebody here decides each one',
  },
  {
    value: FleetRecruitmentState.INVITE_ONLY,
    label: 'By invitation only',
  },
  { value: FleetRecruitmentState.CLOSED, label: 'Closed: not recruiting' },
];

/** The kinds of question, in the order they are offered. */
export const QUESTION_KINDS: readonly ApplicationQuestionKind[] = [
  ApplicationQuestionKind.SHORT_TEXT,
  ApplicationQuestionKind.LONG_TEXT,
  ApplicationQuestionKind.SINGLE_CHOICE,
  ApplicationQuestionKind.YES_NO,
];

/** How the Fleet recruits, the factions to choose from, and the Fleet. */
export interface RecruitmentSettingsData {
  readonly section: FleetSection;
  readonly settings: RecruitmentSettings;
  readonly factions: readonly Faction[];
}

/**
 * How a Fleet recruits, for whoever holds `recruitment.manage` (FC-021).
 *
 * The state, the requirements — a minimum level, the factions allowed and a
 * paragraph in the Fleet's own words — and the application form. Each save
 * is a new version: an application already sent keeps the answers to the
 * form it was sent against, and one sent against an older form is refused so
 * the applicant answers the form that is there. A save made after somebody
 * else's is refused rather than overwriting it.
 */
@Component({
  selector: 'app-fleet-recruitment-settings',
  templateUrl: './fleet-recruitment-settings.component.html',
  styleUrls: ['./fleet-recruitment-settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetRecruitmentSettingsComponent extends FleetSectionPageDirective<RecruitmentSettingsData> {
  private readonly _recruitment = inject(FleetRecruitmentService);
  private readonly _lookup = inject(CharacterLookupService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = FLEET_RECRUITMENT_SETTINGS_NOT_PERMITTED;
  readonly stateOptions = RECRUITMENT_STATE_OPTIONS;
  readonly questionKinds = QUESTION_KINDS;
  readonly kindLabels = QUESTION_KIND_LABELS;
  readonly limits = RECRUITMENT_LIMITS;
  readonly singleChoice = ApplicationQuestionKind.SINGLE_CHOICE;

  protected readonly _requiredCapabilities = [RECRUITMENT_MANAGE_CAPABILITY];

  protected override readonly _needsRoster = false;

  /** The editor's copy, replaced whenever the settings are read. */
  readonly draft = signal<SettingsDraft | null>(null);

  /** What is wrong with the draft. */
  readonly problems = computed<SettingsProblems | null>(() => {
    const draft = this.draft();

    return draft === null ? null : problemsOf(draft);
  });

  /** Whether a save is under way. */
  readonly busy = signal(false);

  /** What the last save came to, if it was refused or failed. */
  readonly saveError = signal<string | null>(null);

  /** What the last save came to, if it was made or not needed. */
  readonly saveNotice = signal<string | null>(null);

  /**
   * Whether the draft may be saved.
   *
   * @returns True when nothing is wrong with it and nothing is under way.
   */
  canSave(): boolean {
    const problems = this.problems();

    return !this.busy() && problems !== null && isSaveable(problems);
  }

  /**
   * Changes part of the draft.
   *
   * @param change - The fields to change.
   */
  patch(change: Partial<SettingsDraft>): void {
    this.draft.update(draft =>
      draft === null ? draft : { ...draft, ...change },
    );
  }

  /**
   * Allows or stops allowing a faction.
   *
   * @param factionId - The faction.
   * @param allowed - Whether it is allowed now.
   */
  onFaction(factionId: string, allowed: boolean): void {
    const current = this.draft()?.factionIds ?? [];

    this.patch({
      factionIds: allowed
        ? [...current.filter(id => id !== factionId), factionId]
        : current.filter(id => id !== factionId),
    });
  }

  /**
   * Whether a faction is allowed in the draft.
   *
   * @param factionId - The faction.
   * @returns True when it is.
   */
  isAllowed(factionId: string): boolean {
    return this.draft()?.factionIds.includes(factionId) ?? false;
  }

  /** Adds a question, at the end. */
  onAddQuestion(): void {
    const questions = this.draft()?.questions ?? [];

    if (questions.length >= RECRUITMENT_LIMITS.QUESTIONS) {
      return;
    }

    this.patch({
      questions: [
        ...questions,
        {
          key: questionKey(),
          kind: ApplicationQuestionKind.SHORT_TEXT,
          prompt: '',
          required: true,
          options: '',
        },
      ],
    });
  }

  /**
   * Changes part of a question.
   *
   * @param key - The question.
   * @param change - The fields to change.
   */
  onQuestion(key: number, change: Partial<QuestionDraft>): void {
    this.patch({
      questions: (this.draft()?.questions ?? []).map(question =>
        question.key === key ? { ...question, ...change } : question,
      ),
    });
  }

  /**
   * Takes a question off the form.
   *
   * @param key - The question.
   */
  onRemoveQuestion(key: number): void {
    this.patch({
      questions: (this.draft()?.questions ?? []).filter(
        question => question.key !== key,
      ),
    });
  }

  /**
   * Moves a question up or down one place.
   *
   * @param index - Where it is.
   * @param by - -1 for up, 1 for down.
   */
  onMoveQuestion(index: number, by: -1 | 1): void {
    const questions = [...(this.draft()?.questions ?? [])];
    const target = index + by;

    if (target < 0 || target >= questions.length) {
      return;
    }

    [questions[index], questions[target]] = [
      questions[target],
      questions[index],
    ];
    this.patch({ questions });
  }

  /**
   * Saves the draft, when it may be saved. Pressing Enter in a field submits
   * the form whatever the button says, so this checks again.
   *
   * @param data - The page, with the version it read.
   */
  onSubmit(data: RecruitmentSettingsData): void {
    const draft = this.draft();

    if (draft === null || !this.canSave()) {
      return;
    }

    this.busy.set(true);
    this.saveError.set(null);
    this.saveNotice.set(null);
    this._recruitment
      .saveSettings(
        data.section.communityId,
        data.section.fleetId,
        requestOf(draft, data.settings.version),
      )
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: saved => {
          this.busy.set(false);
          this.saveNotice.set(
            saved.version === data.settings.version
              ? RECRUITMENT_SETTINGS_UNCHANGED
              : RECRUITMENT_SETTINGS_SAVED,
          );
          this.reload();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.saveError.set(
            recruitmentRefusalOf(error, RECRUITMENT_SETTINGS_SAVE_FAILED),
          );

          // Changed by somebody else meanwhile: the page is read again, and
          // the draft with it.
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
   * Reads how the Fleet recruits and the factions there are, and starts the
   * draft from them.
   *
   * @param section - The Fleet.
   * @returns The settings and factions, with the Fleet.
   */
  protected load(section: FleetSection): Observable<RecruitmentSettingsData> {
    return forkJoin({
      view: this._recruitment.view(section.communityId, section.fleetId),
      factions: this._lookup.getFactions(),
    }).pipe(
      map(({ view, factions }) => ({
        section,
        settings: view.settings,
        factions,
      })),
      tap(data => this.draft.set(draftOf(data.settings))),
    );
  }
}
