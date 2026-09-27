import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NEVER, of, throwError } from 'rxjs';

import { SwitcherAccount } from 'src/app/dashboard/models/account-switcher.model';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  chooseFrom,
  findButton,
  pageText,
  RECRUITMENT_FLEET_HREF,
  recruitmentRoute,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  ApplicationQuestionKind,
  FleetRecruitmentView,
  RecruitmentSettings,
  RecruitmentViewer,
  ScopeMembershipStatus,
} from 'src/app/models/fleet-recruitment.models';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';

import {
  APPLICATION_SEND_FAILED,
  APPLICATION_SENT,
  APPLY_ANSWER_REQUIRED,
  APPLY_CHOOSE_CHARACTER,
  FleetApplyComponent,
} from './fleet-apply.component';

const OUTSIDER: RecruitmentViewer = {
  isOwner: false,
  membershipStatus: null,
  pendingApplications: [],
  openInvitation: null,
  canViewApplications: false,
  canDecideApplications: false,
  canManageRecruitment: false,
  canManageMembers: false,
};

/**
 * Builds the view the server sends.
 *
 * @param settings - Changes to the settings.
 * @param viewer - Changes to the viewer, or null when signed out.
 * @returns The view.
 */
function view(
  settings: Partial<RecruitmentSettings> = {},
  viewer: Partial<RecruitmentViewer> | null = {},
): FleetRecruitmentView {
  return {
    settings: {
      version: 4,
      recruitmentState: FleetRecruitmentState.APPLICATION,
      requirementsText: null,
      minimumLevel: null,
      factions: [],
      questions: [
        {
          id: 'q-short',
          kind: ApplicationQuestionKind.SHORT_TEXT,
          prompt: 'Your @handle?',
          required: true,
          options: [],
        },
        {
          id: 'q-long',
          kind: ApplicationQuestionKind.LONG_TEXT,
          prompt: 'Why us?',
          required: false,
          options: [],
        },
        {
          id: 'q-choice',
          kind: ApplicationQuestionKind.SINGLE_CHOICE,
          prompt: 'Timezone?',
          required: false,
          options: ['Europe', 'Americas'],
        },
        {
          id: 'q-yes',
          kind: ApplicationQuestionKind.YES_NO,
          prompt: 'Rules?',
          required: true,
          options: [],
        },
      ],
      savedAt: null,
      ...settings,
    },
    viewer: viewer === null ? null : { ...OUTSIDER, ...viewer },
  };
}

/**
 * Builds the reader's accounts.
 *
 * @param characters - Each Character's id and name, on Windows.
 * @returns The accounts.
 */
function accounts(...characters: [string, string][]): SwitcherAccount[] {
  return [
    {
      id: 'account-1',
      handle: 'tova',
      platformName: 'Windows',
      launcherName: null,
      lifetimeSubscription: false,
      pinnedAt: null,
      characters: characters.map(([id, handle]) => ({
        id,
        handle,
        profilePicture100: null,
        factionName: null,
        factionIconUrl: null,
        generalFactionName: null,
        pinnedAt: null,
      })),
    },
  ];
}

describe('FleetApplyComponent', () => {
  let fixture: ComponentFixture<FleetApplyComponent>;
  let recruitment: { view: jest.Mock; apply: jest.Mock };
  let stoAccounts: { getSwitcherList: jest.Mock };

  /** Draws the page. */
  async function render(): Promise<void> {
    const route = recruitmentRoute([]);

    await TestBed.configureTestingModule({
      imports: [FleetApplyComponent],
      providers: [
        ...route.providers,
        { provide: FleetRecruitmentService, useValue: recruitment },
        { provide: StoAccountService, useValue: stoAccounts },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetApplyComponent);
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
   * Clicks a radio button.
   *
   * @param selector - The button.
   */
  function click(selector: string): void {
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        selector,
      ) as HTMLInputElement
    ).click();
    fixture.detectChanges();
  }

  /** Answers the two required questions, with the first Character. */
  function fillIn(): void {
    chooseFrom(fixture, '#apply-character', 'c-1');
    typeInto(fixture, '#answer-q-short', ' Tova@tova ');
    click('input[name="answer-q-yes"][value="yes"]');
  }

  beforeEach(() => {
    recruitment = {
      view: jest.fn(() => of(view())),
      apply: jest.fn(() => of({ id: 'application-1' })),
    };
    stoAccounts = {
      getSwitcherList: jest.fn(() =>
        of(accounts(['c-1', 'Tova Rhen'], ['c-2', 'Iko'])),
      ),
    };
  });

  it('asks each question as its kind asks', async () => {
    await render();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('input#answer-q-short')).not.toBeNull();
    expect(element.querySelector('textarea#answer-q-long')).not.toBeNull();
    expect(element.querySelector('select#answer-q-choice')).not.toBeNull();
    expect(element.querySelectorAll('input[name="answer-q-yes"]').length).toBe(
      2,
    );
    expect(pageText(fixture)).toContain('Why us? (optional)');
    expect(
      element.querySelector('#answer-q-long')?.getAttribute('maxlength'),
    ).toBe('2000');
    expect(
      element.querySelector('#answer-q-short')?.getAttribute('maxlength'),
    ).toBe('200');
  });

  it('shows the Fleet’s requirements', async () => {
    recruitment.view.mockReturnValue(
      of(
        view({
          minimumLevel: 50,
          factions: [
            { id: 'f-1', name: 'Federation' },
            { id: 'f-2', name: 'Klingon Empire' },
          ],
          requirementsText: 'Be kind.',
        }),
      ),
    );

    await render();

    const text = pageText(fixture);

    expect(text).toContain('Level 50 or above');
    expect(text).toContain('Federation, Klingon Empire');
    expect(text).toContain('Be kind.');
  });

  it('shows only the requirements set', async () => {
    recruitment.view.mockReturnValue(of(view({ requirementsText: 'Hi.' })));

    await render();

    expect(pageText(fixture)).toContain('Requirements');
    expect(pageText(fixture)).not.toContain('Level');
  });

  it('waits for a Character and every required answer', async () => {
    await render();

    expect(findButton(fixture, 'Send the application')?.disabled).toBe(true);
    expect(pageText(fixture)).toContain(APPLY_CHOOSE_CHARACTER);
    chooseFrom(fixture, '#apply-character', 'c-1');
    typeInto(fixture, '#answer-q-short', '   ');
    click('input[name="answer-q-yes"][value="no"]');
    expect(findButton(fixture, 'Send the application')?.disabled).toBe(true);
    expect(pageText(fixture)).toContain(APPLY_ANSWER_REQUIRED);
    expect(
      findButton(fixture, 'Send the application')?.getAttribute(
        'aria-describedby',
      ),
    ).toBe('apply-send-hint');
    submit();

    expect(recruitment.apply).not.toHaveBeenCalled();
  });

  it('says nothing of what is missing once nothing is', async () => {
    await render();
    fillIn();

    expect(pageText(fixture)).not.toContain(APPLY_ANSWER_REQUIRED);
    expect(pageText(fixture)).not.toContain(APPLY_CHOOSE_CHARACTER);
    expect(
      findButton(fixture, 'Send the application')?.hasAttribute(
        'aria-describedby',
      ),
    ).toBe(false);
  });

  it('sends the answers given, against the form version read', async () => {
    await render();
    fillIn();
    typeInto(fixture, '#answer-q-long', ' Good company. ');
    chooseFrom(fixture, '#answer-q-choice', 'Europe');
    submit();

    expect(recruitment.apply).toHaveBeenCalledWith('community-1', 'fleet-1', {
      characterId: 'c-1',
      settingsVersion: 4,
      answers: [
        { questionId: 'q-short', value: 'Tova@tova' },
        { questionId: 'q-long', value: 'Good company.' },
        { questionId: 'q-choice', value: 'Europe' },
        { questionId: 'q-yes', value: true },
      ],
    });
    expect(pageText(fixture)).toContain(APPLICATION_SENT);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('nav a')
        ?.getAttribute('href'),
    ).toBe('/fleets/applications');
  });

  it('leaves out an optional question left blank', async () => {
    await render();
    fillIn();
    chooseFrom(fixture, '#answer-q-choice', '');
    submit();

    expect(
      recruitment.apply.mock.calls[0][2].answers.map(
        (answer: { questionId: string }) => answer.questionId,
      ),
    ).toEqual(['q-short', 'q-yes']);
  });

  it('chooses the only Character for the reader', async () => {
    stoAccounts.getSwitcherList.mockReturnValue(
      of(accounts(['c-1', 'Tova Rhen'])),
    );

    await render();

    expect(fixture.componentInstance.characterId()).toBe('c-1');
  });

  it('says so when the reader has no Character on the Fleet’s platform', async () => {
    stoAccounts.getSwitcherList.mockReturnValue(of([]));

    await render();

    expect(pageText(fixture)).toContain('You have no Character on Windows');
  });

  it('sends one application at a time', async () => {
    recruitment.apply.mockReturnValue(NEVER);
    await render();
    fillIn();
    submit();
    submit();

    expect(recruitment.apply).toHaveBeenCalledTimes(1);
    expect(findButton(fixture, 'Sending')?.disabled).toBe(true);
    // Nothing is missing while it is sending; it is only waiting.
    expect(pageText(fixture)).not.toContain(APPLY_ANSWER_REQUIRED);
  });

  it('reads the form again when the Fleet changed it meanwhile', async () => {
    recruitment.apply.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              message:
                'This Fleet has changed its application form since you opened it. Reload it and answer again.',
            },
          }),
      ),
    );
    await render();
    fillIn();
    submit();

    expect(pageText(fixture)).toContain('has changed its application form');
    expect(recruitment.view).toHaveBeenCalledTimes(2);
  });

  it('gives the server’s reason for a requirement not met', async () => {
    recruitment.apply.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'This Fleet asks for level 50 or above.' },
          }),
      ),
    );
    await render();
    fillIn();
    submit();

    expect(pageText(fixture)).toContain('This Fleet asks for level 50');
    expect(recruitment.view).toHaveBeenCalledTimes(1);
  });

  it('says so plainly when sending fails otherwise', async () => {
    recruitment.apply.mockReturnValue(throwError(() => new Error('down')));
    await render();
    fillIn();
    submit();

    expect(pageText(fixture)).toContain(APPLICATION_SEND_FAILED);
  });

  it.each([
    [null, 'Sign in to apply.'],
    [{ isOwner: true }, 'You own this Fleet’s Community'],
    [
      { membershipStatus: ScopeMembershipStatus.APPROVED },
      'You are already a member',
    ],
    [
      { membershipStatus: ScopeMembershipStatus.SUSPENDED },
      'Your membership of this Fleet is suspended.',
    ],
    [
      {
        openInvitation: {
          id: 'invite-1',
          expiresAt: '2026-10-10T10:00:00.000Z',
        },
      },
      'You have been invited to this Fleet.',
    ],
  ])('explains to %j why they cannot apply', async (viewer, reason) => {
    recruitment.view.mockReturnValue(of(view({}, viewer)));

    await render();

    expect(pageText(fixture)).toContain(reason);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('form'),
    ).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('nav a')
        ?.getAttribute('href'),
    ).toBe(RECRUITMENT_FLEET_HREF);
  });

  it('explains that a Fleet not taking applications takes none', async () => {
    recruitment.view.mockReturnValue(
      of(view({ recruitmentState: FleetRecruitmentState.OPEN })),
    );

    await render();

    expect(pageText(fixture)).toContain('not taking applications');
  });
});
