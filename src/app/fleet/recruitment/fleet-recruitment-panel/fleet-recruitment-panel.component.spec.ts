import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';

import { NEVER, of, Subject, throwError } from 'rxjs';

import { SwitcherAccount } from 'src/app/dashboard/models/account-switcher.model';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  FleetRecruitmentView,
  RecruitmentViewer,
  ScopeMembershipStatus,
} from 'src/app/models/fleet-recruitment.models';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

import {
  FleetRecruitmentPanelComponent,
  FleetRecruitmentPanelVm,
  RECRUITMENT_ACTION_ERROR,
  RECRUITMENT_CHARACTERS_ERROR,
  RECRUITMENT_PANEL_ERROR,
} from './fleet-recruitment-panel.component';

const VM: FleetRecruitmentPanelVm = {
  communityId: 'community-1',
  fleetId: 'fleet-1',
  fleetName: 'Starfleet Command ',
  platformName: 'Windows',
  communitySlug: 'united-federation-alliance',
  platformSegment: 'pc',
  fleetSlug: 'starfleet-command',
};

/** Somebody signed in with no standing at the Fleet. */
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
 * Builds the server's answer.
 *
 * @param state - How the Fleet recruits.
 * @param viewer - Where the reader stands, or null when signed out.
 * @param settings - Changes to the settings.
 * @returns The view.
 */
function view(
  state: FleetRecruitmentState,
  viewer: Partial<RecruitmentViewer> | null = {},
  settings: Partial<FleetRecruitmentView['settings']> = {},
): FleetRecruitmentView {
  return {
    settings: {
      version: 1,
      recruitmentState: state,
      requirementsText: null,
      minimumLevel: null,
      factions: [],
      questions: [],
      savedAt: null,
      ...settings,
    },
    viewer: viewer === null ? null : { ...OUTSIDER, ...viewer },
  };
}

/**
 * Builds the reader's accounts.
 *
 * @param characters - Each Character's id and name, all on Windows.
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

describe('FleetRecruitmentPanelComponent', () => {
  let fixture: ComponentFixture<FleetRecruitmentPanelComponent>;
  let recruitment: {
    view: jest.Mock;
    join: jest.Mock;
    acceptInvitation: jest.Mock;
    declineInvitation: jest.Mock;
    leave: jest.Mock;
  };
  let stoAccounts: { getSwitcherList: jest.Mock };
  let dialog: { open: jest.Mock };
  let confirmed: boolean;
  let changed: jest.Mock;

  beforeEach(async () => {
    confirmed = true;
    recruitment = {
      view: jest.fn(() => of(view(FleetRecruitmentState.CLOSED))),
      join: jest.fn(() => of({ id: 'application-1' })),
      acceptInvitation: jest.fn(() => of({ id: 'application-1' })),
      declineInvitation: jest.fn(() => of(undefined)),
      leave: jest.fn(() => of(undefined)),
    };
    stoAccounts = {
      getSwitcherList: jest.fn(() =>
        of(accounts(['c-1', 'Tova Rhen'], ['c-2', 'Iko'])),
      ),
    };
    dialog = {
      open: jest.fn(() => ({ afterClosed: () => of(confirmed) })),
    };
    changed = jest.fn();

    await TestBed.configureTestingModule({
      imports: [FleetRecruitmentPanelComponent],
      providers: [
        provideRouter([]),
        { provide: FleetRecruitmentService, useValue: recruitment },
        { provide: StoAccountService, useValue: stoAccounts },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
  });

  /**
   * Draws the panel for a Fleet.
   *
   * @param vm - The Fleet.
   * @returns The rendered element.
   */
  function render(vm: FleetRecruitmentPanelVm = VM): HTMLElement {
    fixture = TestBed.createComponent(FleetRecruitmentPanelComponent);
    fixture.componentRef.setInput('vm', vm);
    fixture.componentInstance.changed.subscribe(changed);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  /**
   * The panel's text, collapsed.
   *
   * @returns The text.
   */
  function text(): string {
    return (
      (fixture.nativeElement as HTMLElement).textContent?.replace(
        /\s+/g,
        ' ',
      ) ?? ''
    );
  }

  /**
   * The labels of the panel's buttons and links.
   *
   * @returns The labels.
   */
  function controls(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button, a'),
    ).map(control => control.textContent?.trim() ?? '');
  }

  /**
   * Presses a button by its label.
   *
   * @param label - What it says.
   */
  function press(label: string): void {
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find(candidate => candidate.textContent?.trim() === label);

    if (!button) {
      throw new Error(`No button labelled ${label}`);
    }

    button.click();
    fixture.detectChanges();
  }

  /**
   * Chooses a Character from the picker, as a reader would.
   *
   * @param characterId - The Character.
   */
  function choose(characterId: string): void {
    const select = (fixture.nativeElement as HTMLElement).querySelector(
      'select',
    ) as HTMLSelectElement;

    select.value = characterId;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  /**
   * Whether a button is disabled.
   *
   * @param label - What it says.
   * @returns True when it cannot be pressed.
   */
  function isDisabled(label: string): boolean {
    return (
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
      ).find(candidate => candidate.textContent?.trim() === label)?.disabled ??
      false
    );
  }

  it('asks how the Fleet recruits', () => {
    render();

    expect(recruitment.view).toHaveBeenCalledWith('community-1', 'fleet-1');
  });

  it.each([
    [FleetRecruitmentState.OPEN, 'Open: anybody who meets the requirements'],
    [FleetRecruitmentState.APPLICATION, 'Taking applications'],
    [FleetRecruitmentState.INVITE_ONLY, 'By invitation only.'],
    [FleetRecruitmentState.CLOSED, 'Not recruiting.'],
  ])('says what %s means', (state, summary) => {
    recruitment.view.mockReturnValue(of(view(state, null)));

    render();

    expect(text()).toContain(summary);
  });

  it('says so when how the Fleet recruits cannot be read', () => {
    recruitment.view.mockReturnValue(throwError(() => new Error('down')));

    render();

    expect(text()).toContain(RECRUITMENT_PANEL_ERROR);
  });

  it('shows nothing but its heading while it reads', () => {
    recruitment.view.mockReturnValue(NEVER);

    render();

    expect(text().trim()).toBe('Recruitment');
  });

  describe('requirements', () => {
    it('lists the level, factions and the Fleet’s own words', () => {
      recruitment.view.mockReturnValue(
        of(
          view(FleetRecruitmentState.APPLICATION, null, {
            minimumLevel: 50,
            factions: [
              { id: 'f-1', name: 'Federation' },
              { id: 'f-2', name: 'Klingon Empire' },
            ],
            requirementsText: 'Be kind.',
          }),
        ),
      );

      render();

      expect(text()).toContain('Level 50 or above');
      expect(text()).toContain('Faction: Federation, Klingon Empire');
      expect(text()).toContain('Be kind.');
    });

    it('lists only what the Fleet asks', () => {
      recruitment.view.mockReturnValue(
        of(view(FleetRecruitmentState.OPEN, null, { requirementsText: 'Hi.' })),
      );

      render();

      expect(text()).toContain('Requirements');
      expect(text()).not.toContain('Level');
      expect(text()).not.toContain('Faction');
    });

    it('lists none when the Fleet asks nothing', () => {
      recruitment.view.mockReturnValue(
        of(view(FleetRecruitmentState.OPEN, null)),
      );

      render();

      expect(text()).not.toContain('Requirements');
    });

    it('lists none when nobody may join or apply', () => {
      recruitment.view.mockReturnValue(
        of(view(FleetRecruitmentState.INVITE_ONLY, null, { minimumLevel: 50 })),
      );

      render();

      expect(text()).not.toContain('Requirements');
    });
  });

  describe('signed out', () => {
    it.each([
      [FleetRecruitmentState.OPEN, 'Sign in to join'],
      [FleetRecruitmentState.APPLICATION, 'Sign in to apply'],
    ])('asks the reader to sign in when %s', (state, prompt) => {
      recruitment.view.mockReturnValue(of(view(state, null)));

      render();

      expect(text()).toContain(prompt);
      expect(controls()).toEqual([]);
    });

    it('says nothing of signing in to a Fleet nobody may ask to join', () => {
      recruitment.view.mockReturnValue(
        of(view(FleetRecruitmentState.CLOSED, null)),
      );

      render();

      expect(text()).not.toContain('Sign in');
    });
  });

  describe('joining an OPEN Fleet', () => {
    beforeEach(() => {
      recruitment.view.mockReturnValue(of(view(FleetRecruitmentState.OPEN)));
    });

    it('offers the reader’s Characters on the Fleet’s platform', () => {
      render();

      const options = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('option'),
      ).map(option => option.textContent?.trim());

      expect(options).toEqual([
        'Choose a Character',
        'Tova Rhen@tova',
        'Iko@tova',
      ]);
      expect(isDisabled('Join this Fleet')).toBe(true);
      expect(text()).toContain('STO Info cannot invite anybody in game');
    });

    it('joins with the Character chosen, then has the page read again', () => {
      render();
      choose('c-2');
      press('Join this Fleet');

      expect(recruitment.join).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'c-2',
      );
      expect(changed).toHaveBeenCalledTimes(1);
    });

    it('chooses the only Character for the reader', () => {
      stoAccounts.getSwitcherList.mockReturnValue(
        of(accounts(['c-1', 'Tova Rhen'])),
      );

      render();
      press('Join this Fleet');

      expect(recruitment.join).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'c-1',
      );
    });

    it('does nothing without a Character chosen', () => {
      render();

      (fixture.componentInstance as unknown as { join: () => void }).join();

      expect(recruitment.join).not.toHaveBeenCalled();
    });

    it('sends one join at a time', () => {
      recruitment.join.mockReturnValue(NEVER);
      render();
      choose('c-1');
      press('Join this Fleet');

      (fixture.componentInstance as unknown as { join: () => void }).join();

      expect(recruitment.join).toHaveBeenCalledTimes(1);
      expect(isDisabled('Join this Fleet')).toBe(true);
    });

    it('gives the server’s reason when the join is refused', () => {
      recruitment.join.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'This Fleet asks for level 50 or above.' },
            }),
        ),
      );

      render();
      choose('c-1');
      press('Join this Fleet');

      expect(text()).toContain('This Fleet asks for level 50 or above.');
      expect(changed).not.toHaveBeenCalled();
      expect(isDisabled('Join this Fleet')).toBe(false);
    });

    it('says so plainly when the join fails otherwise', () => {
      recruitment.join.mockReturnValue(throwError(() => new Error('down')));

      render();
      choose('c-1');
      press('Join this Fleet');

      expect(text()).toContain(RECRUITMENT_ACTION_ERROR);
    });

    it('says so when the reader has no Character there', () => {
      stoAccounts.getSwitcherList.mockReturnValue(of([]));

      render();

      expect(text()).toContain('You have no Character on Windows to join with');
      expect(controls()).toEqual([]);
    });

    it('says so when the Characters cannot be read', () => {
      stoAccounts.getSwitcherList.mockReturnValue(
        throwError(() => new Error('down')),
      );

      render();

      expect(text()).toContain(RECRUITMENT_CHARACTERS_ERROR);
    });
  });

  describe('applying', () => {
    it('links to the application page, and reads no Characters', () => {
      recruitment.view.mockReturnValue(
        of(view(FleetRecruitmentState.APPLICATION)),
      );

      render();

      const link = (fixture.nativeElement as HTMLElement).querySelector(
        'a.lcars-btn',
      );

      expect(link?.textContent?.trim()).toBe('Apply to join');
      expect(link?.getAttribute('href')).toBe(
        '/fleets/communities/united-federation-alliance/fleets/pc/starfleet-command/apply',
      );
      expect(stoAccounts.getSwitcherList).not.toHaveBeenCalled();
    });

    it('lists the reader’s applications still waiting, and where to follow them', () => {
      recruitment.view.mockReturnValue(
        of(
          view(FleetRecruitmentState.APPLICATION, {
            pendingApplications: [
              {
                id: 'application-1',
                characterName: 'Tova Rhen@tova',
                submittedAt: '2026-09-20T10:00:00.000Z',
              },
            ],
          }),
        ),
      );

      render();

      expect(text()).toContain('Your application with Tova Rhen@tova');
      expect(controls()).toEqual([
        'See your Fleet applications',
        'Apply to join',
      ]);
    });
  });

  describe('an open invitation', () => {
    beforeEach(() => {
      recruitment.view.mockReturnValue(
        of(
          view(FleetRecruitmentState.OPEN, {
            openInvitation: {
              id: 'invite-1',
              expiresAt: '2026-10-10T10:00:00.000Z',
            },
          }),
        ),
      );
    });

    it('is accepted with a Character rather than joined', () => {
      render();

      expect(text()).toContain('You have been invited to join this Fleet');
      expect(controls()).toEqual(['Accept the invitation', 'Decline']);

      choose('c-1');
      press('Accept the invitation');

      expect(recruitment.acceptInvitation).toHaveBeenCalledWith(
        'invite-1',
        'c-1',
      );
      expect(changed).toHaveBeenCalledTimes(1);
    });

    it('can be declined', () => {
      render();
      press('Decline');

      expect(recruitment.declineInvitation).toHaveBeenCalledWith('invite-1');
      expect(changed).toHaveBeenCalledTimes(1);
    });

    it('offers no application in its place', () => {
      recruitment.view.mockReturnValue(
        of(
          view(FleetRecruitmentState.APPLICATION, {
            openInvitation: {
              id: 'invite-1',
              expiresAt: '2026-10-10T10:00:00.000Z',
            },
          }),
        ),
      );

      render();

      expect(controls()).toEqual(['Accept the invitation', 'Decline']);
    });

    it('says which action it could not accept with', () => {
      stoAccounts.getSwitcherList.mockReturnValue(of([]));

      render();

      expect(text()).toContain('to accept with');
    });

    it('is not accepted without a Character chosen, nor twice at once', () => {
      recruitment.declineInvitation.mockReturnValue(NEVER);
      render();
      const component = fixture.componentInstance as unknown as {
        accept: () => void;
        decline: () => void;
      };

      component.accept();
      press('Decline');
      component.decline();
      choose('c-1');
      component.accept();

      expect(recruitment.acceptInvitation).not.toHaveBeenCalled();
      expect(recruitment.declineInvitation).toHaveBeenCalledTimes(1);
    });
  });

  it('ignores an invitation action when there is none', () => {
    recruitment.view.mockReturnValue(of(view(FleetRecruitmentState.OPEN)));
    render();
    const component = fixture.componentInstance as unknown as {
      accept: () => void;
      decline: () => void;
    };

    choose('c-1');
    component.accept();
    component.decline();

    expect(recruitment.acceptInvitation).not.toHaveBeenCalled();
    expect(recruitment.declineInvitation).not.toHaveBeenCalled();
  });

  describe('a member', () => {
    beforeEach(() => {
      recruitment.view.mockReturnValue(
        of(
          view(FleetRecruitmentState.OPEN, {
            membershipStatus: ScopeMembershipStatus.APPROVED,
          }),
        ),
      );
    });

    it('is offered leaving, and nothing to join', () => {
      render();

      expect(controls()).toEqual(['Leave this Fleet']);
      expect(stoAccounts.getSwitcherList).not.toHaveBeenCalled();
    });

    it('leaves once they confirm it', () => {
      render();
      const navigate = jest
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);
      press('Leave this Fleet');

      expect(dialog.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Leave this Fleet?',
            message: expect.stringContaining(
              'You will no longer be a member of Starfleet Command here',
            ),
          }),
        }),
      );
      expect(recruitment.leave).toHaveBeenCalledWith('community-1', 'fleet-1');
      // Their own list, saying so, rather than a page that may be gone from
      // them: a Fleet only its Community can see is, once they leave it.
      expect(navigate).toHaveBeenCalledWith(['/fleets', 'applications'], {
        state: { notice: 'You have left Starfleet Command.' },
      });
      expect(changed).not.toHaveBeenCalled();
    });

    it('stays when they think better of it', () => {
      confirmed = false;

      render();
      press('Leave this Fleet');

      expect(recruitment.leave).not.toHaveBeenCalled();
    });

    it('asks nothing while a departure is in flight', () => {
      recruitment.leave.mockReturnValue(NEVER);
      render();
      press('Leave this Fleet');

      (fixture.componentInstance as unknown as { leave: () => void }).leave();

      expect(dialog.open).toHaveBeenCalledTimes(1);
    });
  });

  it.each([
    ['the Owner', { isOwner: true }],
    [
      'a suspended member',
      { membershipStatus: ScopeMembershipStatus.SUSPENDED },
    ],
  ])('offers %s nothing', (_name, viewer) => {
    recruitment.view.mockReturnValue(
      of(view(FleetRecruitmentState.OPEN, viewer)),
    );

    render();

    expect(controls()).toEqual([]);
    expect(stoAccounts.getSwitcherList).not.toHaveBeenCalled();
  });

  it('offers somebody who left the Fleet the way back in', () => {
    recruitment.view.mockReturnValue(
      of(
        view(FleetRecruitmentState.OPEN, {
          membershipStatus: ScopeMembershipStatus.LEFT,
        }),
      ),
    );

    render();

    expect(controls()).toEqual(['Join this Fleet']);
  });

  it('reads again, from scratch, when it is given another Fleet', () => {
    const first = new Subject<FleetRecruitmentView>();
    recruitment.view.mockReturnValueOnce(first);
    recruitment.view.mockReturnValueOnce(
      of(view(FleetRecruitmentState.INVITE_ONLY)),
    );

    render();
    fixture.componentRef.setInput('vm', { ...VM, fleetId: 'fleet-2' });
    fixture.detectChanges();
    // The first Fleet's answer arrives late, and is not drawn.
    first.next(view(FleetRecruitmentState.OPEN));
    fixture.detectChanges();

    expect(recruitment.view).toHaveBeenLastCalledWith('community-1', 'fleet-2');
    expect(text()).toContain('By invitation only.');
    expect(fixture.componentInstance.vm.fleetId).toBe('fleet-2');
  });
});
