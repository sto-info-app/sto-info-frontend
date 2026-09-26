import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NEVER, of, throwError } from 'rxjs';

import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  findButton,
  pageText,
  pressButton,
  recruitmentRoute,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetInvitation,
  FleetInvitationState,
} from 'src/app/models/fleet-recruitment.models';

import {
  FLEET_INVITATIONS_NOT_PERMITTED,
  FleetInvitationsComponent,
  INVITATION_FAILED,
  INVITATION_SENT,
  INVITATION_WITHDRAWN,
} from './fleet-invitations.component';

/**
 * Builds an invitation.
 *
 * @param overrides - Fields to override.
 * @returns The invitation.
 */
function invitation(overrides: Partial<FleetInvitation> = {}): FleetInvitation {
  return {
    id: 'invite-1',
    invitedUsername: 'FleetApplicant',
    invitedByUsername: 'Owner',
    state: FleetInvitationState.PENDING,
    sentAt: '2026-09-20T10:00:00.000Z',
    expiresAt: '2026-10-04T10:00:00.000Z',
    answeredAt: null,
    ...overrides,
  };
}

describe('FleetInvitationsComponent', () => {
  let fixture: ComponentFixture<FleetInvitationsComponent>;
  let recruitment: {
    invitations: jest.Mock;
    invite: jest.Mock;
    withdrawInvitation: jest.Mock;
  };

  /**
   * Draws the invitations.
   *
   * @param capabilities - What the reader holds.
   */
  async function render(
    capabilities: string[] = ['applications.view', 'applications.decide'],
  ): Promise<void> {
    const route = recruitmentRoute(capabilities);

    await TestBed.configureTestingModule({
      imports: [FleetInvitationsComponent],
      providers: [
        ...route.providers,
        { provide: FleetRecruitmentService, useValue: recruitment },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetInvitationsComponent);
    fixture.detectChanges();
  }

  /** Submits the invitation form. */
  function submit(): void {
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'form',
      ) as HTMLFormElement
    ).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    recruitment = {
      invitations: jest.fn(() =>
        of([
          invitation(),
          invitation({
            id: 'invite-2',
            invitedUsername: null,
            invitedByUsername: null,
            state: FleetInvitationState.DECLINED,
            answeredAt: '2026-09-21T10:00:00.000Z',
          }),
          invitation({ id: 'invite-3', state: FleetInvitationState.LAPSED }),
        ]),
      ),
      invite: jest.fn(() => of(invitation())),
      withdrawInvitation: jest.fn(() => of(invitation())),
    };
  });

  it('lists the Fleet’s invitations, offering to withdraw those open', async () => {
    await render();

    const text = pageText(fixture);

    expect(recruitment.invitations).toHaveBeenCalledWith(
      'community-1',
      'fleet-1',
    );
    expect(text).toContain('FleetApplicant');
    expect(text).toContain('An account since closed');
    expect(text).toContain('Waiting for an answer');
    expect(text).toContain('Declined');
    expect(text).toContain('Lapsed');
    expect(
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('tbody button'),
      ).length,
    ).toBe(1);
  });

  it('says so when nobody has been invited', async () => {
    recruitment.invitations.mockReturnValue(of([]));

    await render();

    expect(pageText(fixture)).toContain('Nobody has been invited');
  });

  it('only lists them for somebody who may not decide', async () => {
    await render(['applications.view']);

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('form'),
    ).toBeNull();
    expect(findButton(fixture, 'Withdraw')).toBeUndefined();
  });

  describe('inviting', () => {
    it('waits for a username', async () => {
      await render();
      typeInto(fixture, '#invitation-username', '   ');
      submit();

      expect(findButton(fixture, 'Send the invitation')?.disabled).toBe(true);
      expect(recruitment.invite).not.toHaveBeenCalled();
    });

    it('invites the username typed, then reads the list again', async () => {
      await render();
      typeInto(fixture, '#invitation-username', ' FleetApplicant ');
      submit();

      expect(recruitment.invite).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'FleetApplicant',
      );
      expect(pageText(fixture)).toContain(INVITATION_SENT);
      expect(recruitment.invitations).toHaveBeenCalledTimes(2);
      expect(
        (
          (fixture.nativeElement as HTMLElement).querySelector(
            '#invitation-username',
          ) as HTMLInputElement
        ).value,
      ).toBe('');
    });

    it('sends one at a time', async () => {
      recruitment.invite.mockReturnValue(NEVER);
      await render();
      typeInto(fixture, '#invitation-username', 'FleetApplicant');
      submit();
      submit();

      expect(recruitment.invite).toHaveBeenCalledTimes(1);
    });

    it('gives the server’s reason for a refusal', async () => {
      recruitment.invite.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              error: { message: 'Nobody here has that username.' },
            }),
        ),
      );
      await render();
      typeInto(fixture, '#invitation-username', 'Nobody');
      submit();

      expect(pageText(fixture)).toContain('Nobody here has that username.');
    });

    it('says so plainly when it fails otherwise', async () => {
      recruitment.invite.mockReturnValue(throwError(() => new Error('down')));
      await render();
      typeInto(fixture, '#invitation-username', 'FleetApplicant');
      submit();

      expect(pageText(fixture)).toContain(INVITATION_FAILED);
    });
  });

  describe('withdrawing', () => {
    it('takes an open invitation back, then reads the list again', async () => {
      await render();
      pressButton(fixture, 'Withdraw');

      expect(recruitment.withdrawInvitation).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'invite-1',
      );
      expect(pageText(fixture)).toContain(INVITATION_WITHDRAWN);
      expect(recruitment.invitations).toHaveBeenCalledTimes(2);
    });

    it('sends one at a time', async () => {
      recruitment.withdrawInvitation.mockReturnValue(NEVER);
      await render();
      const button = findButton(fixture, 'Withdraw') as HTMLButtonElement;

      button.click();
      fixture.componentInstance.onWithdraw(
        {
          section: {} as never,
          invitations: [],
        },
        invitation(),
      );

      expect(recruitment.withdrawInvitation).toHaveBeenCalledTimes(1);
    });
  });

  it('turns away somebody who may not read them', async () => {
    await render(['members.manage']);

    expect(pageText(fixture)).toContain(FLEET_INVITATIONS_NOT_PERMITTED);
  });
});
