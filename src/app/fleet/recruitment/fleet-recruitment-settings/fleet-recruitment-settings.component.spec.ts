import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NEVER, of, throwError } from 'rxjs';

import { CharacterLookupService } from 'src/app/dashboard/services/character-lookup.service';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  chooseFrom,
  findButton,
  pageText,
  pressButton,
  recruitmentRoute,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  ApplicationQuestionKind,
  FleetRecruitmentView,
  RecruitmentSettings,
} from 'src/app/models/fleet-recruitment.models';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';

import {
  FLEET_RECRUITMENT_SETTINGS_NOT_PERMITTED,
  FleetRecruitmentSettingsComponent,
  RECRUITMENT_SETTINGS_SAVE_FAILED,
  RECRUITMENT_SETTINGS_SAVED,
  RECRUITMENT_SETTINGS_UNCHANGED,
} from './fleet-recruitment-settings.component';

/**
 * Builds the settings as read.
 *
 * @param overrides - Fields to override.
 * @returns The settings.
 */
function settings(
  overrides: Partial<RecruitmentSettings> = {},
): RecruitmentSettings {
  return {
    version: 2,
    recruitmentState: FleetRecruitmentState.APPLICATION,
    requirementsText: 'Be kind.',
    minimumLevel: 50,
    factions: [{ id: 'f-1', name: 'Federation' }],
    questions: [
      {
        id: 'q-1',
        kind: ApplicationQuestionKind.LONG_TEXT,
        prompt: 'Why us?',
        required: true,
        options: [],
      },
      {
        id: 'q-2',
        kind: ApplicationQuestionKind.YES_NO,
        prompt: 'Rules?',
        required: true,
        options: [],
      },
    ],
    savedAt: '2026-09-20T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Wraps settings in the view the server sends.
 *
 * @param current - The settings.
 * @returns The view.
 */
function view(current: RecruitmentSettings = settings()): FleetRecruitmentView {
  return { settings: current, viewer: null };
}

describe('FleetRecruitmentSettingsComponent', () => {
  let fixture: ComponentFixture<FleetRecruitmentSettingsComponent>;
  let recruitment: { view: jest.Mock; saveSettings: jest.Mock };
  let lookup: { getFactions: jest.Mock };

  /**
   * Draws the editor.
   *
   * @param capabilities - What the reader holds.
   */
  async function render(
    capabilities: string[] = ['recruitment.manage'],
  ): Promise<void> {
    const route = recruitmentRoute(capabilities);

    await TestBed.configureTestingModule({
      imports: [FleetRecruitmentSettingsComponent],
      providers: [
        ...route.providers,
        { provide: FleetRecruitmentService, useValue: recruitment },
        { provide: CharacterLookupService, useValue: lookup },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetRecruitmentSettingsComponent);
    fixture.detectChanges();
  }

  /** Submits the form. */
  function submit(): void {
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'form',
      ) as HTMLFormElement
    ).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /**
   * The request the last save sent.
   *
   * @returns Its body.
   */
  function sent(): Record<string, unknown> {
    return recruitment.saveSettings.mock.calls.at(-1)?.[2] as Record<
      string,
      unknown
    >;
  }

  /**
   * Ticks or unticks a box by its label.
   *
   * @param label - What the box is for.
   */
  function tick(label: string): void {
    const box = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('label'),
    )
      .find(candidate => String(candidate.textContent).trim() === label)
      ?.querySelector('input') as HTMLInputElement;

    box.click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    recruitment = {
      view: jest.fn(() => of(view())),
      saveSettings: jest.fn(() => of(settings({ version: 3 }))),
    };
    lookup = {
      getFactions: jest.fn(() =>
        of([
          { id: 'f-1', name: 'Federation', generalFactionId: 'g-1' },
          { id: 'f-2', name: 'Klingon Empire', generalFactionId: 'g-2' },
        ]),
      ),
    };
  });

  it('starts from the settings as saved', async () => {
    await render();

    const element = fixture.nativeElement as HTMLElement;

    expect(pageText(fixture)).toContain('Version 2, saved');
    expect(
      (element.querySelector('#recruitment-state') as HTMLSelectElement).value,
    ).toBe('APPLICATION');
    expect(
      (element.querySelector('#recruitment-minimum-level') as HTMLInputElement)
        .value,
    ).toBe('50');
    expect(
      (
        element.querySelector(
          '#recruitment-requirements',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Be kind.');
    expect(
      Array.from(element.querySelectorAll('input[type="checkbox"]')).map(
        box => (box as HTMLInputElement).checked,
      ),
    ).toEqual([true, false, true, true]);
  });

  it('says so for a Fleet that has never saved them', async () => {
    recruitment.view.mockReturnValue(
      of(view(settings({ version: 0, questions: [] }))),
    );

    await render();

    expect(pageText(fixture)).toContain('has not saved its recruitment');
    expect(pageText(fixture)).toContain('The form asks nothing yet.');
  });

  it('saves every change made, against the version read', async () => {
    await render();

    chooseFrom(fixture, '#recruitment-state', 'OPEN');
    typeInto(fixture, '#recruitment-minimum-level', '40');
    typeInto(fixture, '#recruitment-requirements', 'Be very kind.');
    tick('Klingon Empire');
    tick('Federation');
    submit();

    expect(recruitment.saveSettings).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      expect.objectContaining({
        expectedVersion: 2,
        recruitmentState: 'OPEN',
        minimumLevel: 40,
        requirementsText: 'Be very kind.',
        factionIds: ['f-2'],
      }),
    );
    expect(pageText(fixture)).toContain(RECRUITMENT_SETTINGS_SAVED);
    expect(recruitment.view).toHaveBeenCalledTimes(2);
  });

  it('says so when there was nothing to save', async () => {
    recruitment.saveSettings.mockReturnValue(of(settings()));

    await render();
    submit();

    expect(pageText(fixture)).toContain(RECRUITMENT_SETTINGS_UNCHANGED);
  });

  it('will not save a level that is not one', async () => {
    await render();
    typeInto(fixture, '#recruitment-minimum-level', '99');

    expect(pageText(fixture)).toContain('A level from 1 to 65');
    expect(findButton(fixture, 'Save')?.disabled).toBe(true);
    submit();
    expect(recruitment.saveSettings).not.toHaveBeenCalled();
  });

  it('will not save requirements that are too long', async () => {
    await render();
    typeInto(fixture, '#recruitment-requirements', 'x'.repeat(2001));

    expect(pageText(fixture)).toContain('At most 2000 characters.');
  });

  describe('the form', () => {
    it('adds a question, which must be written before saving', async () => {
      await render();
      pressButton(fixture, 'Add a question');

      expect(pageText(fixture)).toContain('Write the question.');
      expect(findButton(fixture, 'Save')?.disabled).toBe(true);
    });

    it('offers options for a single choice, and sends them', async () => {
      await render();
      pressButton(fixture, 'Add a question');
      const key = fixture.componentInstance.draft()?.questions[2].key;

      typeInto(fixture, `#question-prompt-${key}`, 'Timezone?');
      chooseFrom(fixture, `#question-kind-${key}`, 'SINGLE_CHOICE');
      typeInto(fixture, `#question-options-${key}`, 'Europe\nAmericas');
      submit();

      expect(sent()['questions']).toEqual([
        expect.objectContaining({ id: 'q-1' }),
        expect.objectContaining({ id: 'q-2' }),
        {
          kind: 'SINGLE_CHOICE',
          prompt: 'Timezone?',
          required: true,
          options: ['Europe', 'Americas'],
        },
      ]);
    });

    it('lets a question be optional', async () => {
      await render();
      tick('Must be answered');
      submit();

      expect(sent()['questions']).toEqual([
        expect.objectContaining({ id: 'q-1', required: false }),
        expect.objectContaining({ id: 'q-2', required: true }),
      ]);
    });

    it('moves questions up and down, but not off either end', async () => {
      await render();
      const component = fixture.componentInstance;

      (
        (fixture.nativeElement as HTMLElement).querySelector(
          '[aria-label="Move question 1 down"]',
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();
      component.onMoveQuestion(0, -1);
      component.onMoveQuestion(1, 1);
      fixture.detectChanges();

      expect(component.draft()?.questions.map(question => question.id)).toEqual(
        ['q-2', 'q-1'],
      );

      (
        (fixture.nativeElement as HTMLElement).querySelector(
          '[aria-label="Move question 2 up"]',
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();

      expect(component.draft()?.questions.map(question => question.id)).toEqual(
        ['q-1', 'q-2'],
      );
    });

    it('removes a question', async () => {
      await render();
      (
        (fixture.nativeElement as HTMLElement).querySelector(
          '[aria-label="Remove question 1"]',
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();
      submit();

      expect(sent()['questions']).toEqual([
        expect.objectContaining({ id: 'q-2' }),
      ]);
    });

    it('asks at most twenty questions', async () => {
      recruitment.view.mockReturnValue(
        of(
          view(
            settings({
              questions: Array.from({ length: 20 }, (_, index) => ({
                id: `q-${index}`,
                kind: ApplicationQuestionKind.YES_NO,
                prompt: `Question ${index}?`,
                required: true,
                options: [],
              })),
            }),
          ),
        ),
      );
      await render();

      expect(findButton(fixture, 'Add a question')?.disabled).toBe(true);
      fixture.componentInstance.onAddQuestion();
      expect(fixture.componentInstance.draft()?.questions.length).toBe(20);
    });
  });

  describe('saving', () => {
    it('saves once at a time', async () => {
      recruitment.saveSettings.mockReturnValue(NEVER);
      await render();
      submit();
      submit();

      expect(recruitment.saveSettings).toHaveBeenCalledTimes(1);
      expect(findButton(fixture, 'Saving')?.disabled).toBe(true);
    });

    it('reads the settings again when somebody else saved first', async () => {
      recruitment.saveSettings.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                message:
                  'Somebody changed these settings since you opened them.',
              },
            }),
        ),
      );
      await render();
      submit();

      expect(pageText(fixture)).toContain('Somebody changed these settings');
      expect(recruitment.view).toHaveBeenCalledTimes(2);
    });

    it('keeps the draft when a save fails otherwise', async () => {
      recruitment.saveSettings.mockReturnValue(
        throwError(() => new Error('down')),
      );
      await render();
      typeInto(fixture, '#recruitment-minimum-level', '40');
      submit();

      expect(pageText(fixture)).toContain(RECRUITMENT_SETTINGS_SAVE_FAILED);
      expect(recruitment.view).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.draft()?.minimumLevel).toBe('40');
    });
  });

  it('changes nothing before the settings are read', async () => {
    recruitment.view.mockReturnValue(NEVER);
    await render();
    const component = fixture.componentInstance;

    component.patch({ minimumLevel: '1' });
    component.onFaction('f-1', true);
    component.onAddQuestion();
    component.onQuestion(1, { prompt: 'x' });
    component.onRemoveQuestion(1);
    component.onMoveQuestion(0, 1);
    component.onSubmit({} as never);

    expect(component.draft()).toBeNull();
    expect(component.isAllowed('f-1')).toBe(false);
    expect(component.canSave()).toBe(false);
    expect(recruitment.saveSettings).not.toHaveBeenCalled();
  });

  it('turns away somebody who may not change them', async () => {
    await render(['applications.view']);

    expect(pageText(fixture)).toContain(
      FLEET_RECRUITMENT_SETTINGS_NOT_PERMITTED,
    );
  });
});
