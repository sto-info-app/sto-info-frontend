import {
  ApplicationQuestionKind,
  RecruitmentSettings,
} from 'src/app/models/fleet-recruitment.models';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';

import {
  draftOf,
  isSaveable,
  optionsOf,
  problemsOf,
  QuestionDraft,
  requestOf,
  SettingsDraft,
} from './recruitment-settings.draft';

/**
 * Builds a draft.
 *
 * @param overrides - Fields to override.
 * @returns The draft.
 */
function draft(overrides: Partial<SettingsDraft> = {}): SettingsDraft {
  return {
    recruitmentState: FleetRecruitmentState.APPLICATION,
    requirementsText: '',
    minimumLevel: '',
    factionIds: [],
    questions: [],
    ...overrides,
  };
}

/**
 * Builds a question.
 *
 * @param overrides - Fields to override.
 * @returns The question.
 */
function question(overrides: Partial<QuestionDraft> = {}): QuestionDraft {
  return {
    key: 1,
    kind: ApplicationQuestionKind.SHORT_TEXT,
    prompt: 'Why us?',
    required: true,
    options: '',
    ...overrides,
  };
}

describe('draftOf', () => {
  it('copies saved settings into the editor’s own terms', () => {
    const settings: RecruitmentSettings = {
      version: 2,
      recruitmentState: FleetRecruitmentState.OPEN,
      requirementsText: 'Be kind.',
      minimumLevel: 50,
      factions: [{ id: 'f-1', name: 'Federation' }],
      questions: [
        {
          id: 'q-1',
          kind: ApplicationQuestionKind.SINGLE_CHOICE,
          prompt: 'Timezone?',
          required: false,
          options: ['Europe', 'Americas'],
        },
      ],
      savedAt: '2026-09-20T10:00:00.000Z',
    };

    const copied = draftOf(settings);

    expect(copied).toEqual({
      recruitmentState: FleetRecruitmentState.OPEN,
      requirementsText: 'Be kind.',
      minimumLevel: '50',
      factionIds: ['f-1'],
      questions: [
        {
          key: expect.any(Number),
          id: 'q-1',
          kind: ApplicationQuestionKind.SINGLE_CHOICE,
          prompt: 'Timezone?',
          required: false,
          options: 'Europe\nAmericas',
        },
      ],
    });
  });

  it('leaves blanks where nothing was saved, and gives each row its own key', () => {
    const copied = draftOf({
      version: 0,
      recruitmentState: FleetRecruitmentState.CLOSED,
      requirementsText: null,
      minimumLevel: null,
      factions: [],
      questions: [
        {
          id: 'q-1',
          kind: ApplicationQuestionKind.YES_NO,
          prompt: 'A?',
          required: true,
          options: [],
        },
        {
          id: 'q-2',
          kind: ApplicationQuestionKind.YES_NO,
          prompt: 'B?',
          required: true,
          options: [],
        },
      ],
      savedAt: null,
    });

    expect(copied.requirementsText).toBe('');
    expect(copied.minimumLevel).toBe('');
    expect(copied.questions[0].key).not.toBe(copied.questions[1].key);
  });
});

describe('optionsOf', () => {
  it('takes each non-blank line, trimmed', () => {
    expect(optionsOf(' Europe \n\n Americas\n ')).toEqual([
      'Europe',
      'Americas',
    ]);
  });
});

describe('problemsOf', () => {
  it('finds nothing wrong with an empty form', () => {
    const problems = problemsOf(draft());

    expect(problems).toEqual({
      minimumLevel: null,
      requirementsText: null,
      questions: {},
    });
    expect(isSaveable(problems)).toBe(true);
  });

  it.each(['1', '65', ' 30 '])('takes %s as a level', level => {
    expect(problemsOf(draft({ minimumLevel: level })).minimumLevel).toBeNull();
  });

  it.each(['0', '66', 'ten', '1.5', '-3'])('refuses %s as a level', level => {
    const problems = problemsOf(draft({ minimumLevel: level }));

    expect(problems.minimumLevel).toContain('A level from 1 to 65');
    expect(isSaveable(problems)).toBe(false);
  });

  it('refuses requirements that are too long', () => {
    const problems = problemsOf(draft({ requirementsText: 'x'.repeat(2001) }));

    expect(problems.requirementsText).toBe('At most 2000 characters.');
    expect(isSaveable(problems)).toBe(false);
  });

  it.each([
    ['a blank question', question({ prompt: '  ' }), 'Write the question.'],
    [
      'a question too long',
      question({ prompt: 'x'.repeat(301) }),
      'A question may be at most 300 characters.',
    ],
    [
      'a single choice with one option',
      question({
        kind: ApplicationQuestionKind.SINGLE_CHOICE,
        options: 'Only',
      }),
      'Give between 2 and 10 options, one per line.',
    ],
    [
      'a single choice with eleven options',
      question({
        kind: ApplicationQuestionKind.SINGLE_CHOICE,
        options: Array.from({ length: 11 }, (_, i) => `O${i}`).join('\n'),
      }),
      'Give between 2 and 10 options, one per line.',
    ],
    [
      'an option too long',
      question({
        kind: ApplicationQuestionKind.SINGLE_CHOICE,
        options: `A\n${'x'.repeat(101)}`,
      }),
      'An option may be at most 100 characters.',
    ],
    [
      'an option given twice',
      question({
        kind: ApplicationQuestionKind.SINGLE_CHOICE,
        options: 'A\nA',
      }),
      'Give each option once.',
    ],
  ])('refuses %s', (_name, problemQuestion, message) => {
    const problems = problemsOf(draft({ questions: [problemQuestion] }));

    expect(problems.questions).toEqual({ 1: message });
    expect(isSaveable(problems)).toBe(false);
  });

  it('takes a single choice with good options', () => {
    expect(
      problemsOf(
        draft({
          questions: [
            question({
              kind: ApplicationQuestionKind.SINGLE_CHOICE,
              options: 'Europe\nAmericas',
            }),
          ],
        }),
      ).questions,
    ).toEqual({});
  });
});

describe('requestOf', () => {
  it('sends the draft as the server takes it', () => {
    expect(
      requestOf(
        draft({
          recruitmentState: FleetRecruitmentState.OPEN,
          requirementsText: ' Be kind. ',
          minimumLevel: ' 50 ',
          factionIds: ['f-1'],
          questions: [
            question({ id: 'q-1', prompt: ' Why us? ', options: 'stale' }),
            question({
              key: 2,
              kind: ApplicationQuestionKind.SINGLE_CHOICE,
              prompt: 'Timezone?',
              required: false,
              options: 'Europe\nAmericas',
            }),
          ],
        }),
        3,
      ),
    ).toEqual({
      expectedVersion: 3,
      recruitmentState: FleetRecruitmentState.OPEN,
      requirementsText: 'Be kind.',
      minimumLevel: 50,
      factionIds: ['f-1'],
      questions: [
        {
          id: 'q-1',
          kind: ApplicationQuestionKind.SHORT_TEXT,
          prompt: 'Why us?',
          required: true,
          options: [],
        },
        {
          kind: ApplicationQuestionKind.SINGLE_CHOICE,
          prompt: 'Timezone?',
          required: false,
          options: ['Europe', 'Americas'],
        },
      ],
    });
  });

  it('sends blanks as nothing', () => {
    const request = requestOf(draft({ requirementsText: '  ' }), 0);

    expect(request.requirementsText).toBeNull();
    expect(request.minimumLevel).toBeNull();
  });
});
