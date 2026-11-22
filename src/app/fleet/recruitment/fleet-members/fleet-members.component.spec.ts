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
  FleetApplicationRoute,
  FleetMember,
  ScopeMembershipStatus,
} from 'src/app/models/fleet-recruitment.models';

import {
  FLEET_MEMBERS_NOT_PERMITTED,
  FleetMembersComponent,
  MEMBER_ACTIONS,
  MEMBER_REMOVAL_FAILED,
  MEMBER_REMOVED,
} from './fleet-members.component';

/**
 * Builds a member.
 *
 * @param overrides - Fields to override.
 * @returns The member.
 */
function member(overrides: Partial<FleetMember> = {}): FleetMember {
  return {
    membershipId: 'membership-1',
    username: 'FleetApplicant',
    status: ScopeMembershipStatus.APPROVED,
    memberSince: '2026-09-21T10:00:00.000Z',
    route: FleetApplicationRoute.APPLICATION,
    characterName: 'Dax Orlan@fixture002',
    suspensionReason: null,
    ...overrides,
  };
}

describe('FleetMembersComponent', () => {
  let fixture: ComponentFixture<FleetMembersComponent>;
  let recruitment: {
    members: jest.Mock;
    removeMember: jest.Mock;
    changeMember: jest.Mock;
  };

  /**
   * Draws the members.
   *
   * @param capabilities - What the reader holds.
   */
  async function render(
    capabilities: string[] = ['members.manage'],
  ): Promise<void> {
    const route = recruitmentRoute(capabilities);

    await TestBed.configureTestingModule({
      imports: [FleetMembersComponent],
      providers: [
        ...route.providers,
        { provide: FleetRecruitmentService, useValue: recruitment },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetMembersComponent);
    fixture.detectChanges();
  }

  /** Submits the removal form. */
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
      members: jest.fn(() =>
        of([
          member(),
          member({
            membershipId: 'membership-2',
            username: null,
            status: ScopeMembershipStatus.SUSPENDED,
            memberSince: null,
            route: null,
            characterName: null,
            suspensionReason: 'Repeated spam',
          }),
        ]),
      ),
      removeMember: jest.fn(() => of(undefined)),
      changeMember: jest.fn(() => of(undefined)),
    };
  });

  it('lists the Fleet’s members', async () => {
    await render();

    const text = pageText(fixture);

    expect(recruitment.members).toHaveBeenCalledWith('community-1', 'fleet-1');
    expect(text).toContain('FleetApplicant');
    expect(text).toContain('Dax Orlan@fixture002');
    expect(text).toContain('Application');
    expect(text).toContain('An account with no username');
    expect(text).toContain('Suspended');
    expect(text).toContain('Repeated spam');
  });

  it('says so when there are none', async () => {
    recruitment.members.mockReturnValue(of([]));

    await render();

    expect(pageText(fixture)).toContain('Nobody is a member');
  });

  describe('removing', () => {
    it('asks for a reason first, and removes nobody without one', async () => {
      await render();
      pressButton(fixture, 'Remove…');

      expect(pageText(fixture)).toContain(
        'Remove FleetApplicant from this Fleet?',
      );
      expect(findButton(fixture, 'Remove')?.disabled).toBe(true);
      typeInto(fixture, '#member-removal-reason', '  ');
      submit();

      expect(recruitment.removeMember).not.toHaveBeenCalled();
    });

    it('names an account with no username plainly', async () => {
      await render();
      const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll(
        'tbody button',
      );

      // Suspend… and Remove… for the first; Reinstate… and Remove… for this.
      (buttons[3] as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(pageText(fixture)).toContain(
        'Remove this account from this Fleet?',
      );
    });

    it('removes them with the reason, then reads the list again', async () => {
      await render();
      pressButton(fixture, 'Remove…');
      typeInto(fixture, '#member-removal-reason', ' Left the game. ');
      submit();

      expect(recruitment.removeMember).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'membership-1',
        'Left the game.',
      );
      expect(pageText(fixture)).toContain(MEMBER_REMOVED);
      expect(recruitment.members).toHaveBeenCalledTimes(2);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('form'),
      ).toBeNull();
    });

    it('can be thought better of', async () => {
      await render();
      pressButton(fixture, 'Remove…');
      pressButton(fixture, 'Keep them');

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('form'),
      ).toBeNull();
    });

    it('does nothing when nobody is being asked about', async () => {
      await render();

      fixture.componentInstance.reason.set('Why');
      fixture.componentInstance.onConfirm({} as never);

      expect(recruitment.removeMember).not.toHaveBeenCalled();
    });

    it('sends one removal at a time', async () => {
      recruitment.removeMember.mockReturnValue(NEVER);
      await render();
      pressButton(fixture, 'Remove…');
      typeInto(fixture, '#member-removal-reason', 'Left the game.');
      submit();
      submit();

      expect(recruitment.removeMember).toHaveBeenCalledTimes(1);
    });

    it('gives the server’s reason for a refusal', async () => {
      recruitment.removeMember.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                message: 'Remove their role at this Fleet first.',
              },
            }),
        ),
      );
      await render();
      pressButton(fixture, 'Remove…');
      typeInto(fixture, '#member-removal-reason', 'Left the game.');
      submit();

      expect(pageText(fixture)).toContain(
        'Remove their role at this Fleet first.',
      );
    });

    it('says so plainly when it fails otherwise', async () => {
      recruitment.removeMember.mockReturnValue(
        throwError(() => new Error('down')),
      );
      await render();
      pressButton(fixture, 'Remove…');
      typeInto(fixture, '#member-removal-reason', 'Left the game.');
      submit();

      expect(pageText(fixture)).toContain(MEMBER_REMOVAL_FAILED);
    });
  });

  describe('suspending and reinstating (FC-036)', () => {
    it('suspends a member with the reason, and says what it means', async () => {
      await render();
      pressButton(fixture, 'Suspend…');

      expect(pageText(fixture)).toContain('Suspend FleetApplicant?');
      expect(pageText(fixture)).toContain('never why');
      typeInto(fixture, '#member-removal-reason', ' Spam ');
      submit();

      expect(recruitment.changeMember).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'membership-1',
        'suspend',
        'Spam',
      );
      expect(pageText(fixture)).toContain(MEMBER_ACTIONS.SUSPEND.done);
      expect(recruitment.members).toHaveBeenCalledTimes(2);
    });

    it('reinstates a suspended member', async () => {
      await render();
      pressButton(fixture, 'Reinstate…');
      typeInto(fixture, '#member-removal-reason', 'Sorted out');
      submit();

      expect(recruitment.changeMember).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'membership-2',
        'reinstate',
        'Sorted out',
      );
      expect(pageText(fixture)).toContain(MEMBER_ACTIONS.REINSTATE.done);
    });

    it('titles a refusal by what was refused', async () => {
      recruitment.changeMember.mockReturnValue(
        throwError(() => new Error('down')),
      );
      await render();
      pressButton(fixture, 'Suspend…');
      typeInto(fixture, '#member-removal-reason', 'Spam');
      submit();

      expect(pageText(fixture)).toContain('Not suspended');
      expect(pageText(fixture)).toContain(MEMBER_ACTIONS.SUSPEND.failed);
    });
  });

  it('turns away somebody who may not manage members', async () => {
    await render(['applications.view']);

    expect(pageText(fixture)).toContain(FLEET_MEMBERS_NOT_PERMITTED);
  });
});
