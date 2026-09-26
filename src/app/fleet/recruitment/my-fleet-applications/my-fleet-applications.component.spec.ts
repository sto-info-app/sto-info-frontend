import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NEVER, of, throwError } from 'rxjs';

import { SwitcherAccount } from 'src/app/dashboard/models/account-switcher.model';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  chooseFrom,
  findButton,
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetApplicationRoute,
  FleetApplicationStatus,
  MyFleetApplication,
  MyFleetInvitation,
} from 'src/app/models/fleet-recruitment.models';
import { CharacterFleetSummary } from 'src/app/models/fleet.models';

import {
  APPLICATION_WITHDRAWN,
  INVITATION_ACCEPTED,
  INVITATION_DECLINED,
  MY_APPLICATIONS_ACTION_FAILED,
  MY_APPLICATIONS_ERROR,
  MyFleetApplicationsComponent,
} from './my-fleet-applications.component';

const FLEET: CharacterFleetSummary = {
  id: 'fleet-1',
  exactGameName: 'Ninth Fleet',
  slug: 'ninth-fleet',
  platformName: 'Windows',
  platformSegment: 'pc',
  communityName: 'United Federation Alliance',
  communitySlug: 'united-federation-alliance',
};

/**
 * Builds one of the reader's applications.
 *
 * @param overrides - Fields to override.
 * @returns The application.
 */
function application(
  overrides: Partial<MyFleetApplication> = {},
): MyFleetApplication {
  return {
    id: 'application-1',
    fleet: FLEET,
    status: FleetApplicationStatus.PENDING,
    route: FleetApplicationRoute.APPLICATION,
    characterName: 'Dax Orlan@fixture002',
    submittedAt: '2026-09-20T10:00:00.000Z',
    decidedAt: null,
    decisionNote: null,
    ...overrides,
  };
}

/**
 * Builds one of the reader's invitations.
 *
 * @param overrides - Fields to override.
 * @returns The invitation.
 */
function invitation(
  overrides: Partial<MyFleetInvitation> = {},
): MyFleetInvitation {
  return {
    id: 'invite-1',
    fleet: FLEET,
    invitedByUsername: 'Owner',
    sentAt: '2026-09-20T10:00:00.000Z',
    expiresAt: '2026-10-04T10:00:00.000Z',
    ...overrides,
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
      handle: 'fixture002',
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

describe('MyFleetApplicationsComponent', () => {
  let fixture: ComponentFixture<MyFleetApplicationsComponent>;
  let recruitment: {
    myApplications: jest.Mock;
    myInvitations: jest.Mock;
    acceptInvitation: jest.Mock;
    declineInvitation: jest.Mock;
    withdrawApplication: jest.Mock;
  };
  let stoAccounts: { getSwitcherList: jest.Mock };

  /** Draws the page. */
  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [MyFleetApplicationsComponent],
      providers: [
        provideRouter([]),
        { provide: FleetRecruitmentService, useValue: recruitment },
        { provide: StoAccountService, useValue: stoAccounts },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyFleetApplicationsComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    recruitment = {
      myApplications: jest.fn(() => of([application()])),
      myInvitations: jest.fn(() => of([])),
      acceptInvitation: jest.fn(() => of(application())),
      declineInvitation: jest.fn(() => of(undefined)),
      withdrawApplication: jest.fn(() => of(application())),
    };
    stoAccounts = {
      getSwitcherList: jest.fn(() =>
        of(accounts(['c-1', 'Dax Orlan'], ['c-2', 'Iko'])),
      ),
    };
  });

  it('lists the reader’s applications, linking to each Fleet', async () => {
    await render();

    expect(pageText(fixture)).toContain('Waiting for a decision');
    expect(pageText(fixture)).toContain('No invitation is waiting for you.');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('tbody a')
        ?.getAttribute('href'),
    ).toBe(
      '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet',
    );
  });

  it('gives a decision with its reason, and what an acceptance asks next', async () => {
    recruitment.myApplications.mockReturnValue(
      of([
        application({
          status: FleetApplicationStatus.REJECTED,
          decidedAt: '2026-09-21T10:00:00.000Z',
          decisionNote: 'Not yet level 50.',
        }),
        application({
          id: 'application-2',
          status: FleetApplicationStatus.ACCEPTED,
          route: FleetApplicationRoute.OPEN_JOIN,
          fleet: { ...FLEET, communitySlug: null },
        }),
      ]),
    );

    await render();

    const text = pageText(fixture);

    expect(text).toContain('Rejected');
    expect(text).toContain('“Not yet level 50.”');
    expect(text).toContain('Confirm the Fleet on your Character’s page');
    expect(findButton(fixture, 'Withdraw')).toBeUndefined();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody a').length,
    ).toBe(1);
  });

  it('says so when there are none', async () => {
    recruitment.myApplications.mockReturnValue(of([]));

    await render();

    expect(pageText(fixture)).toContain('You have not applied to or joined');
  });

  it('says so when the page cannot be read', async () => {
    recruitment.myInvitations.mockReturnValue(
      throwError(() => new Error('down')),
    );

    await render();

    expect(pageText(fixture)).toContain(MY_APPLICATIONS_ERROR);
  });

  it('withdraws an application still waiting, then reads the page again', async () => {
    await render();
    pressButton(fixture, 'Withdraw');

    expect(recruitment.withdrawApplication).toHaveBeenCalledWith(
      'application-1',
    );
    expect(pageText(fixture)).toContain(APPLICATION_WITHDRAWN);
    expect(recruitment.myApplications).toHaveBeenCalledTimes(2);
  });

  describe('an invitation', () => {
    beforeEach(() => {
      recruitment.myInvitations.mockReturnValue(
        of([
          invitation(),
          invitation({
            id: 'invite-2',
            invitedByUsername: null,
            fleet: {
              ...FLEET,
              id: 'fleet-2',
              platformName: 'PlayStation',
              communitySlug: null,
            },
          }),
        ]),
      );
    });

    it('is shown with who sent it, and a Character to accept with', async () => {
      await render();

      const text = pageText(fixture);

      expect(text).toContain('Invited by Owner');
      expect(text).toContain('Invited by an account since closed');
      expect(text).toContain('You have no Character on PlayStation');
      expect(
        (
          (fixture.nativeElement as HTMLElement).querySelector(
            '#invitation-character-invite-1',
          ) as HTMLSelectElement
        ).options.length,
      ).toBe(3);
    });

    it('is accepted with the Character chosen', async () => {
      await render();
      chooseFrom(fixture, '#invitation-character-invite-1', 'c-2');
      pressButton(fixture, 'Accept');

      expect(recruitment.acceptInvitation).toHaveBeenCalledWith(
        'invite-1',
        'c-2',
      );
      expect(pageText(fixture)).toContain(INVITATION_ACCEPTED);
    });

    it('is accepted with the only Character there is', async () => {
      stoAccounts.getSwitcherList.mockReturnValue(
        of(accounts(['c-1', 'Dax Orlan'])),
      );

      await render();
      pressButton(fixture, 'Accept');

      expect(recruitment.acceptInvitation).toHaveBeenCalledWith(
        'invite-1',
        'c-1',
      );
    });

    it('is not accepted without a Character', async () => {
      await render();
      const component = fixture.componentInstance;

      component.onAccept(
        {
          applications: [],
          invitations: [],
          accounts: accounts(['c-1', 'A'], ['c-2', 'B']),
        },
        invitation(),
      );

      expect(recruitment.acceptInvitation).not.toHaveBeenCalled();
    });

    it('is declined', async () => {
      await render();
      pressButton(fixture, 'Decline');

      expect(recruitment.declineInvitation).toHaveBeenCalledWith('invite-1');
      expect(pageText(fixture)).toContain(INVITATION_DECLINED);
    });
  });

  it('sends one action at a time', async () => {
    recruitment.withdrawApplication.mockReturnValue(NEVER);
    await render();
    pressButton(fixture, 'Withdraw');
    fixture.componentInstance.onWithdraw(application());

    expect(recruitment.withdrawApplication).toHaveBeenCalledTimes(1);
  });

  it('gives the server’s reason for a refusal', async () => {
    recruitment.withdrawApplication.mockReturnValue(
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
    pressButton(fixture, 'Withdraw');

    expect(pageText(fixture)).toContain('already been decided or withdrawn');
  });

  it('says so plainly when an action fails otherwise', async () => {
    recruitment.withdrawApplication.mockReturnValue(
      throwError(() => new Error('down')),
    );
    await render();
    pressButton(fixture, 'Withdraw');

    expect(pageText(fixture)).toContain(MY_APPLICATIONS_ACTION_FAILED);
  });
});
