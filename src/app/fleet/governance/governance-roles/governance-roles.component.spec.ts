import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NEVER, of, throwError } from 'rxjs';

import {
  GovernanceReader,
  governanceRoute,
  scopeRoles,
} from 'src/app/fleet/governance/governance.testing';
import {
  chooseFrom,
  findButton,
  pageText,
  pressButton,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import { ScopeRoles } from 'src/app/models/fleet-governance.models';

import {
  GOVERNANCE_ROLES_NOT_PERMITTED,
  GovernanceRolesComponent,
  ROLE_APPOINTED,
  ROLE_CHANGE_FAILED,
  ROLE_WITHDRAWN,
} from './governance-roles.component';

describe('GovernanceRolesComponent', () => {
  let fixture: ComponentFixture<GovernanceRolesComponent>;
  let governance: { roles: jest.Mock; assign: jest.Mock; withdraw: jest.Mock };

  /**
   * Draws the page.
   *
   * @param reader - Who is reading, and where.
   */
  async function render(
    reader: GovernanceReader = { roles: ['OWNER'] },
  ): Promise<void> {
    const route = governanceRoute(reader, governance);

    await TestBed.configureTestingModule({
      imports: [GovernanceRolesComponent],
      providers: route.providers,
    }).compileComponents();

    fixture = TestBed.createComponent(GovernanceRolesComponent);
    fixture.detectChanges();
  }

  /**
   * Submits a form.
   *
   * @param label - The form's accessible name.
   */
  function submit(label: string): void {
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        `form[aria-label="${label}"]`,
      ) as HTMLFormElement
    ).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /**
   * The people offered for appointment.
   *
   * @returns Their names.
   */
  function offered(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '#role-appointee option',
      ),
    ).map(option => String(option.textContent).trim());
  }

  /**
   * Answers the roles with these changes.
   *
   * @param overrides - Changes to the roles.
   */
  function rolesAre(overrides: Partial<ScopeRoles>): void {
    governance.roles.mockReturnValue(of(scopeRoles(overrides)));
  }

  beforeEach(() => {
    governance = {
      roles: jest.fn(() => of(scopeRoles())),
      assign: jest.fn(() => of(undefined)),
      withdraw: jest.fn(() => of(undefined)),
    };
  });

  it('names the Owner and who holds a role', async () => {
    await render();

    const text = pageText(fixture);

    expect(governance.roles).toHaveBeenCalledWith({
      communityId: 'community-1',
      fleetId: null,
    });
    expect(text).toContain('Owner: FleetOwner');
    expect(text).toContain('FleetAdmin');
    expect(text).toContain('Admin');
    expect(text).toContain('Back to Manage');
  });

  it('names an Owner with no username plainly', async () => {
    rolesAre({
      owner: { userId: 'user-owner', username: null },
      holders: [{ ...scopeRoles().holders[0], username: null }],
    });
    await render();

    expect(pageText(fixture)).toContain('Owner: An account with no username');
  });

  it('says so when nobody else holds a role', async () => {
    rolesAre({ holders: [] });
    await render();

    expect(pageText(fixture)).toContain('Nobody but the Owner holds a role');
  });

  it('offers only members holding no role, and not the Owner', async () => {
    await render();

    expect(offered()).toEqual([
      'Choose somebody',
      'FleetApplicant',
      'An account with no username',
    ]);
  });

  it.each([
    [false, 'members of its Fleets'],
    [true, 'its members'],
  ])(
    'says who can be appointed when nobody is waiting (Fleet: %p)',
    async (onFleet: boolean, who: string) => {
      rolesAre({ candidates: [] });
      await render({ roles: ['OWNER'], onFleet });

      expect(pageText(fixture)).toContain(`Only ${who} who hold no role`);
    },
  );

  it('lets an Admin read it and change nothing', async () => {
    rolesAre({ mayManage: false, candidates: [] });
    await render({ roles: ['ADMIN'] });

    expect(pageText(fixture)).toContain('FleetAdmin');
    expect(findButton(fixture, 'Withdraw…')).toBeUndefined();
    expect(pageText(fixture)).not.toContain('Appoint somebody');
  });

  it('offers no changes on a closed scope', async () => {
    await render({ roles: ['OWNER'], closed: true });

    expect(findButton(fixture, 'Withdraw…')).toBeUndefined();
    expect(pageText(fixture)).not.toContain('Appoint somebody');
  });

  it('turns away somebody who holds no role that reads it', async () => {
    await render({ roles: ['OFFICER'] });

    expect(pageText(fixture)).toContain(GOVERNANCE_ROLES_NOT_PERMITTED);
  });

  describe('appointing', () => {
    it('waits for a person and a role', async () => {
      await render();

      expect(findButton(fixture, 'Appoint')?.disabled).toBe(true);
      chooseFrom(fixture, '#role-appointee', 'user-member');
      expect(findButton(fixture, 'Appoint')?.disabled).toBe(true);
      submit('Appoint somebody');

      expect(governance.assign).not.toHaveBeenCalled();
    });

    it('appoints them, then reads the page again', async () => {
      await render({ roles: ['OWNER'], onFleet: true });
      chooseFrom(fixture, '#role-appointee', 'user-member');
      chooseFrom(fixture, '#role-appoint-role', 'OFFICER');
      pressButton(fixture, 'Appoint');

      expect(governance.assign).toHaveBeenCalledWith(
        { communityId: 'community-1', fleetId: 'fleet-1' },
        { userId: 'user-member', role: 'OFFICER' },
      );
      expect(pageText(fixture)).toContain(ROLE_APPOINTED);
      expect(governance.roles).toHaveBeenCalledTimes(2);
      expect(
        (
          (fixture.nativeElement as HTMLElement).querySelector(
            '#role-appointee',
          ) as HTMLSelectElement
        ).value,
      ).toBe('');
    });

    it('sends the reason, trimmed, where one is given', async () => {
      await render();
      chooseFrom(fixture, '#role-appointee', 'user-member');
      chooseFrom(fixture, '#role-appoint-role', 'ADMIN');
      typeInto(fixture, '#role-appoint-reason', '  Runs our events.  ');
      pressButton(fixture, 'Appoint');

      expect(governance.assign).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-member',
        role: 'ADMIN',
        reason: 'Runs our events.',
      });
    });

    it('sends one appointment at a time', async () => {
      governance.assign.mockReturnValue(NEVER);
      await render();
      chooseFrom(fixture, '#role-appointee', 'user-member');
      chooseFrom(fixture, '#role-appoint-role', 'ADMIN');
      submit('Appoint somebody');
      submit('Appoint somebody');

      expect(governance.assign).toHaveBeenCalledTimes(1);
    });

    it('gives the server’s reason for a refusal', async () => {
      governance.assign.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'They already hold a role here.' },
            }),
        ),
      );
      await render();
      chooseFrom(fixture, '#role-appointee', 'user-member');
      chooseFrom(fixture, '#role-appoint-role', 'ADMIN');
      pressButton(fixture, 'Appoint');

      expect(pageText(fixture)).toContain('They already hold a role here.');
    });
  });

  describe('withdrawing', () => {
    it('asks for a reason first, and withdraws nothing without one', async () => {
      await render();
      pressButton(fixture, 'Withdraw…');

      expect(pageText(fixture)).toContain(
        'Withdraw FleetAdmin’s role as Admin?',
      );
      expect(findButton(fixture, 'Withdraw')?.disabled).toBe(true);
      typeInto(fixture, '#role-withdraw-reason', '   ');
      submit('Withdraw a role');

      expect(governance.withdraw).not.toHaveBeenCalled();
    });

    it('names an account with no username plainly', async () => {
      rolesAre({ holders: [{ ...scopeRoles().holders[0], username: null }] });
      await render();
      pressButton(fixture, 'Withdraw…');

      expect(pageText(fixture)).toContain('Withdraw this account’s role');
    });

    it('withdraws it with the reason, then reads the page again', async () => {
      await render();
      pressButton(fixture, 'Withdraw…');
      typeInto(fixture, '#role-withdraw-reason', ' Stepped down. ');
      submit('Withdraw a role');

      expect(governance.withdraw).toHaveBeenCalledWith(
        { communityId: 'community-1', fleetId: null },
        'assignment-1',
        'Stepped down.',
      );
      expect(pageText(fixture)).toContain(ROLE_WITHDRAWN);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          'form[aria-label="Withdraw a role"]',
        ),
      ).toBeNull();
    });

    it('can be thought better of', async () => {
      await render();
      pressButton(fixture, 'Withdraw…');
      pressButton(fixture, 'Keep it');

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          'form[aria-label="Withdraw a role"]',
        ),
      ).toBeNull();
    });

    it('does nothing when nothing is being asked about', async () => {
      await render();
      fixture.componentInstance.withdrawReason.set('Why');
      fixture.componentInstance.onConfirmWithdraw({} as never);

      expect(governance.withdraw).not.toHaveBeenCalled();
    });

    it('says so plainly when it fails', async () => {
      governance.withdraw.mockReturnValue(throwError(() => new Error('down')));
      await render();
      pressButton(fixture, 'Withdraw…');
      typeInto(fixture, '#role-withdraw-reason', 'Stepped down.');
      submit('Withdraw a role');

      expect(pageText(fixture)).toContain(ROLE_CHANGE_FAILED);
    });
  });
});
