import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NEVER, of, throwError } from 'rxjs';

import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  findButton,
  pageText,
  RECRUITMENT_FLEET_HREF,
  recruitmentFleet,
  recruitmentRoute,
  RecruitmentRouteStubs,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  ApplicationQuestionKind,
  FleetApplicationActionKind,
  FleetApplicationDetail,
  FleetApplicationRoute,
  FleetApplicationStatus,
} from 'src/app/models/fleet-recruitment.models';

import {
  APPLICATION_DECIDED,
  APPLICATION_DECISION_FAILED,
  FLEET_APPLICATION_NOT_PERMITTED,
  FleetApplicationDetailComponent,
} from './fleet-application-detail.component';

/**
 * Builds an application as a decider reads it.
 *
 * @param overrides - Fields to override.
 * @returns The application.
 */
function detail(
  overrides: Partial<FleetApplicationDetail> = {},
): FleetApplicationDetail {
  return {
    id: 'application-1',
    status: FleetApplicationStatus.PENDING,
    route: FleetApplicationRoute.APPLICATION,
    applicantUsername: 'FleetApplicant',
    characterName: 'Dax Orlan@fixture002',
    characterLevel: 65,
    factionName: 'Federation',
    submittedAt: '2026-09-20T10:00:00.000Z',
    decidedAt: null,
    answers: [
      {
        questionId: 'q-1',
        prompt: 'Why us?',
        kind: ApplicationQuestionKind.LONG_TEXT,
        value: 'Good company.',
      },
      {
        questionId: 'q-2',
        prompt: 'Do you agree to the rules?',
        kind: ApplicationQuestionKind.YES_NO,
        value: true,
      },
      {
        questionId: 'q-3',
        prompt: 'Voice chat?',
        kind: ApplicationQuestionKind.YES_NO,
        value: false,
      },
      {
        questionId: 'q-4',
        prompt: 'Anything else?',
        kind: ApplicationQuestionKind.SHORT_TEXT,
        value: null,
      },
    ],
    settingsVersion: 3,
    decisionNote: null,
    decidedByUsername: null,
    revision: 1,
    evidence: {
      listed: true,
      latestExportAt: '2026-09-18T10:00:00.000Z',
      listedSince: '2026-08-01T10:00:00.000Z',
      rank: 'Recruit',
      everListed: true,
    },
    history: [
      {
        action: FleetApplicationActionKind.SUBMITTED,
        actorUsername: 'FleetApplicant',
        note: null,
        at: '2026-09-20T10:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('FleetApplicationDetailComponent', () => {
  let fixture: ComponentFixture<FleetApplicationDetailComponent>;
  let route: RecruitmentRouteStubs;
  let recruitment: { application: jest.Mock; decide: jest.Mock };

  /**
   * Draws the application.
   *
   * @param capabilities - What the reader holds.
   */
  async function render(
    capabilities: string[] = ['applications.view', 'applications.decide'],
  ): Promise<void> {
    route = recruitmentRoute(capabilities, { applicationId: 'application-1' });

    await TestBed.configureTestingModule({
      imports: [FleetApplicationDetailComponent],
      providers: [
        ...route.providers,
        { provide: FleetRecruitmentService, useValue: recruitment },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetApplicationDetailComponent);
    fixture.detectChanges();
  }

  /**
   * Chooses a decision as a decider would.
   *
   * @param value - ACCEPT or REJECT.
   */
  function decide(value: string): void {
    const radio = (fixture.nativeElement as HTMLElement).querySelector(
      `input[value="${value}"]`,
    ) as HTMLInputElement;

    radio.click();
    fixture.detectChanges();
  }

  /** Submits the decision form. */
  function submit(): void {
    const form = (fixture.nativeElement as HTMLElement).querySelector(
      'form',
    ) as HTMLFormElement;

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    recruitment = {
      application: jest.fn(() => of(detail())),
      decide: jest.fn(() => of(detail())),
    };
  });

  it('reads the application the address names', async () => {
    await render();

    expect(recruitment.application).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      'application-1',
    );
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.fleet-application__intro a')
        ?.getAttribute('href'),
    ).toBe(`${RECRUITMENT_FLEET_HREF}/recruitment/applications`);
  });

  it('reads an application named by nothing as none', async () => {
    route = recruitmentRoute(['applications.view']);

    await TestBed.configureTestingModule({
      imports: [FleetApplicationDetailComponent],
      providers: [
        ...route.providers,
        { provide: FleetRecruitmentService, useValue: recruitment },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FleetApplicationDetailComponent);
    fixture.detectChanges();

    expect(recruitment.application).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
      '',
    );
  });

  it('shows each answer beside its question', async () => {
    await render();

    const text = pageText(fixture);

    expect(text).toContain('Why us?Good company.');
    expect(text).toContain('Do you agree to the rules?Yes');
    expect(text).toContain('Voice chat?No');
    expect(text).toContain('Anything else?Not answered');
    expect(text).toContain('(version 3)');
  });

  it('says so when the form asked nothing', async () => {
    recruitment.application.mockReturnValue(of(detail({ answers: [] })));

    await render();

    expect(pageText(fixture)).toContain('The form asked nothing');
  });

  describe('what the roster says', () => {
    it('gives the listing, its rank and since when', async () => {
      await render();

      const text = pageText(fixture);

      expect(text).toContain('Listed on the latest export');
      expect(text).toContain('Rank on it: Recruit.');
      expect(text).toContain('Listed on every export since');
      expect(text).toContain('it proves nothing');
    });

    it('leaves out a rank and a run it does not know', async () => {
      recruitment.application.mockReturnValue(
        of(
          detail({
            evidence: {
              listed: true,
              latestExportAt: '2026-09-18T10:00:00.000Z',
              listedSince: null,
              rank: null,
              everListed: true,
            },
          }),
        ),
      );

      await render();

      expect(pageText(fixture)).not.toContain('Rank on it');
      expect(pageText(fixture)).not.toContain('every export since');
    });

    it.each([
      [true, 'Listed on an earlier export.'],
      [false, 'Not listed on any export imported.'],
    ])(
      'says whether a Character missing now was ever listed (%s)',
      async (everListed, line) => {
        recruitment.application.mockReturnValue(
          of(
            detail({
              evidence: {
                listed: false,
                latestExportAt: '2026-09-18T10:00:00.000Z',
                listedSince: null,
                rank: null,
                everListed,
              },
            }),
          ),
        );

        await render();

        expect(pageText(fixture)).toContain('Not listed on the latest export');
        expect(pageText(fixture)).toContain(line);
      },
    );

    it('says so when no export has been imported', async () => {
      recruitment.application.mockReturnValue(
        of(
          detail({
            evidence: {
              listed: false,
              latestExportAt: null,
              listedSince: null,
              rank: null,
              everListed: false,
            },
          }),
        ),
      );

      await render();

      expect(pageText(fixture)).toContain('No roster export of this Fleet');
      expect(pageText(fixture)).toContain('Matched by the Character’s exact');
    });

    /**
     * A console Fleet will never have an export to import, so "none imported
     * yet" would promise one.
     */
    it('says a platform with no roster export has no roster to check', async () => {
      recruitment.application.mockReturnValue(
        of(
          detail({
            evidence: {
              listed: false,
              latestExportAt: null,
              listedSince: null,
              rank: null,
              everListed: false,
            },
          }),
        ),
      );
      route = recruitmentRoute(['applications.view'], {
        applicationId: 'application-1',
      });
      route.scopes.resolveFleet.mockReturnValue(
        of(
          recruitmentFleet(['applications.view'], {
            platformName: 'PlayStation',
            platformProvidesRosterExport: false,
          }),
        ),
      );

      await TestBed.configureTestingModule({
        imports: [FleetApplicationDetailComponent],
        providers: [
          ...route.providers,
          { provide: FleetRecruitmentService, useValue: recruitment },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(FleetApplicationDetailComponent);
      fixture.detectChanges();

      const text = pageText(fixture);

      expect(text).toContain(
        'The game provides no roster export on PlayStation, so there is no roster to check.',
      );
      expect(text).not.toContain('No roster export of this Fleet');
      expect(text).not.toContain('Matched by the Character’s exact');
    });
  });

  it('shows a decision made, with its reason and who made it', async () => {
    recruitment.application.mockReturnValue(
      of(
        detail({
          status: FleetApplicationStatus.REJECTED,
          decidedAt: '2026-09-21T10:00:00.000Z',
          decidedByUsername: null,
          decisionNote: 'Not yet level 50.',
          applicantUsername: null,
          characterLevel: null,
          factionName: null,
          history: [
            {
              action: FleetApplicationActionKind.REJECTED,
              actorUsername: null,
              note: 'Not yet level 50.',
              at: '2026-09-21T10:00:00.000Z',
            },
          ],
        }),
      ),
    );

    await render();

    const text = pageText(fixture);

    expect(text).toContain('Reason Not yet level 50.');
    expect(text).toContain('by an account since closed');
    expect(text).toContain('An account since closed');
    expect(text).toContain('Rejected by an account since closed');
    expect(text).toContain('“Not yet level 50.”');
    expect(findButton(fixture, 'Record the decision')).toBeUndefined();
  });

  it('calls an acceptance’s words a note', async () => {
    recruitment.application.mockReturnValue(
      of(
        detail({
          status: FleetApplicationStatus.ACCEPTED,
          decidedAt: '2026-09-21T10:00:00.000Z',
          decidedByUsername: 'Owner',
          decisionNote: 'Welcome aboard.',
        }),
      ),
    );

    await render();

    expect(pageText(fixture)).toContain('Note Welcome aboard.');
  });

  describe('deciding', () => {
    it('is not offered to somebody who may only read', async () => {
      await render(['applications.view']);

      expect(findButton(fixture, 'Record the decision')).toBeUndefined();
    });

    it('waits for a decision, and a rejection’s reason', async () => {
      await render();

      expect(findButton(fixture, 'Record the decision')?.disabled).toBe(true);
      decide('REJECT');
      expect(pageText(fixture)).toContain('Reason');
      expect(findButton(fixture, 'Record the decision')?.disabled).toBe(true);
      typeInto(fixture, '#application-note', '   ');
      expect(findButton(fixture, 'Record the decision')?.disabled).toBe(true);
      submit();
      expect(recruitment.decide).not.toHaveBeenCalled();
    });

    it('rejects with the reason, then reads the application again', async () => {
      await render();
      decide('REJECT');
      typeInto(fixture, '#application-note', ' Not yet level 50. ');
      submit();

      expect(recruitment.decide).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'application-1',
        { decision: 'REJECT', note: 'Not yet level 50.', revision: 1 },
      );
      expect(pageText(fixture)).toContain(APPLICATION_DECIDED);
      expect(recruitment.application).toHaveBeenCalledTimes(2);
    });

    it('accepts without a note', async () => {
      await render();
      decide('ACCEPT');
      expect(pageText(fixture)).toContain('Note (optional)');
      submit();

      expect(recruitment.decide).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'application-1',
        { decision: 'ACCEPT', revision: 1 },
      );
    });

    it('sends one decision at a time', async () => {
      recruitment.decide.mockReturnValue(NEVER);
      await render();
      decide('ACCEPT');
      submit();
      submit();

      expect(recruitment.decide).toHaveBeenCalledTimes(1);
      expect(findButton(fixture, 'Recording')?.disabled).toBe(true);
    });

    it('reads the application again when somebody else decided first', async () => {
      recruitment.decide.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                message:
                  'This application has already been decided or withdrawn.',
              },
            }),
        ),
      );
      await render();
      decide('ACCEPT');
      submit();

      expect(pageText(fixture)).toContain(
        'This application has already been decided or withdrawn.',
      );
      expect(recruitment.application).toHaveBeenCalledTimes(2);
    });

    it('keeps the form when the decision fails otherwise', async () => {
      recruitment.decide.mockReturnValue(throwError(() => new Error('down')));
      await render();
      decide('ACCEPT');
      submit();

      expect(pageText(fixture)).toContain(APPLICATION_DECISION_FAILED);
      expect(recruitment.application).toHaveBeenCalledTimes(1);
      expect(findButton(fixture, 'Record the decision')?.disabled).toBe(false);
    });
  });

  it('turns away somebody who may not read applications', async () => {
    await render(['members.manage']);

    expect(pageText(fixture)).toContain(FLEET_APPLICATION_NOT_PERMITTED);
  });
});
