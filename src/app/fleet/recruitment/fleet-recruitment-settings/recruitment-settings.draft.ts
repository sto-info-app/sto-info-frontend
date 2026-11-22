import { RECRUITMENT_LIMITS } from 'src/app/fleet/recruitment/recruitment.constants';
import {
  ApplicationQuestionKind,
  RecruitmentSettings,
  UpdateRecruitmentSettingsRequest,
} from 'src/app/models/fleet-recruitment.models';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';

/** One question as the editor holds it. */
export interface QuestionDraft {
  /** Tracks the row while it is edited; never sent. */
  readonly key: number;
  /** The question's id, kept for a question the form had already. */
  readonly id?: string;
  readonly kind: ApplicationQuestionKind;
  readonly prompt: string;
  readonly required: boolean;
  /** A single choice's options, one per line. */
  readonly options: string;
}

/** How a Fleet recruits, as the editor holds it. */
export interface SettingsDraft {
  readonly recruitmentState: FleetRecruitmentState;
  readonly requirementsText: string;
  /** As typed; blank for none. */
  readonly minimumLevel: string;
  readonly factionIds: readonly string[];
  readonly questions: readonly QuestionDraft[];
}

/** What is wrong with a draft, where anything is. */
export interface SettingsProblems {
  readonly minimumLevel: string | null;
  readonly requirementsText: string | null;
  /** By question key. */
  readonly questions: Readonly<Record<number, string>>;
}

let nextKey = 1;

/**
 * A fresh key for a question row.
 *
 * @returns The key.
 */
export function questionKey(): number {
  return nextKey++;
}

/**
 * The editor's copy of how a Fleet recruits now.
 *
 * @param settings - The settings, as read.
 * @returns The draft.
 */
export function draftOf(settings: RecruitmentSettings): SettingsDraft {
  return {
    recruitmentState: settings.recruitmentState,
    requirementsText: settings.requirementsText ?? '',
    minimumLevel:
      settings.minimumLevel === null ? '' : String(settings.minimumLevel),
    factionIds: settings.factions.map(faction => faction.id),
    questions: settings.questions.map(question => ({
      key: questionKey(),
      id: question.id,
      kind: question.kind,
      prompt: question.prompt,
      required: question.required,
      options: question.options.join('\n'),
    })),
  };
}

/**
 * A single choice's options, one per non-blank line.
 *
 * @param options - The options as typed.
 * @returns The options.
 */
export function optionsOf(options: string): string[] {
  return options
    .split('\n')
    .map(option => option.trim())
    .filter(option => option !== '');
}

/**
 * What is wrong with a question.
 *
 * @param question - The question.
 * @returns The problem, or null.
 */
function questionProblem(question: QuestionDraft): string | null {
  const prompt = question.prompt.trim();

  if (prompt === '') {
    return 'Write the question.';
  }

  if (prompt.length > RECRUITMENT_LIMITS.PROMPT) {
    return `A question may be at most ${RECRUITMENT_LIMITS.PROMPT} characters.`;
  }

  if (question.kind !== ApplicationQuestionKind.SINGLE_CHOICE) {
    return null;
  }

  const options = optionsOf(question.options);

  if (options.length < 2 || options.length > RECRUITMENT_LIMITS.OPTIONS) {
    return `Give between 2 and ${RECRUITMENT_LIMITS.OPTIONS} options, one per line.`;
  }

  if (options.some(option => option.length > RECRUITMENT_LIMITS.OPTION)) {
    return `An option may be at most ${RECRUITMENT_LIMITS.OPTION} characters.`;
  }

  if (new Set(options).size !== options.length) {
    return 'Give each option once.';
  }

  return null;
}

/**
 * What is wrong with a draft, so the editor can say so before saving.
 *
 * @param draft - The draft.
 * @returns The problems, which may be none.
 */
export function problemsOf(draft: SettingsDraft): SettingsProblems {
  const level = draft.minimumLevel.trim();
  const questions: Record<number, string> = {};

  for (const question of draft.questions) {
    const problem = questionProblem(question);

    if (problem !== null) {
      questions[question.key] = problem;
    }
  }

  return {
    minimumLevel:
      level === '' ||
      (/^\d+$/.test(level) &&
        Number(level) >= 1 &&
        Number(level) <= RECRUITMENT_LIMITS.MINIMUM_LEVEL)
        ? null
        : `A level from 1 to ${RECRUITMENT_LIMITS.MINIMUM_LEVEL}, or blank for none.`,
    requirementsText:
      draft.requirementsText.trim().length > RECRUITMENT_LIMITS.REQUIREMENTS
        ? `At most ${RECRUITMENT_LIMITS.REQUIREMENTS} characters.`
        : null,
    questions,
  };
}

/**
 * Whether a draft has nothing wrong with it.
 *
 * @param problems - Its problems.
 * @returns True when it may be saved.
 */
export function isSaveable(problems: SettingsProblems): boolean {
  return (
    problems.minimumLevel === null &&
    problems.requirementsText === null &&
    Object.keys(problems.questions).length === 0
  );
}

/**
 * The request a draft makes.
 *
 * @param draft - The draft, with nothing wrong with it.
 * @param expectedVersion - The version the editor read.
 * @returns The request.
 */
export function requestOf(
  draft: SettingsDraft,
  expectedVersion: number,
): UpdateRecruitmentSettingsRequest {
  const level = draft.minimumLevel.trim();
  const text = draft.requirementsText.trim();

  return {
    expectedVersion,
    recruitmentState: draft.recruitmentState,
    requirementsText: text === '' ? null : text,
    minimumLevel: level === '' ? null : Number(level),
    factionIds: draft.factionIds,
    questions: draft.questions.map(question => ({
      ...(question.id === undefined ? {} : { id: question.id }),
      kind: question.kind,
      prompt: question.prompt.trim(),
      required: question.required,
      options:
        question.kind === ApplicationQuestionKind.SINGLE_CHOICE
          ? optionsOf(question.options)
          : [],
    })),
  };
}
