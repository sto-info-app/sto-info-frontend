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
import {
  ScopeCapabilityEffect,
  ScopeRoles,
} from 'src/app/models/fleet-governance.models';

import {
  DELEGATION_FAILED,
  GOVERNANCE_DELEGATION_NOT_PERMITTED,
  GovernanceDelegationComponent,
  OFFICERS_SAVED,
  PERSONAL_CLEARED,
  PERSONAL_SAVED,
} from './governance-delegation.component';

describe('GovernanceDelegationComponent', () => {
  let fixture: ComponentFixture<GovernanceDelegationComponent>;
  let governance: {
    roles: jest.Mock;
    setOfficerCapabilities: jest.Mock;
    setPersonal: jest.Mock;
    clearPersonal: jest.Mock;
  };

  const COMMUNITY = { communityId: 'community-1', fleetId: null };

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
      imports: [GovernanceDelegationComponent],
      providers: route.providers,
    }).compileComponents();

    fixture = TestBed.createComponent(GovernanceDelegationComponent);
    fixture.detectChanges();
  }

  /**
   * Answers the roles with these changes.
   *
   * @param overrides - Changes to the roles.
   */
  function rolesAre(overrides: Partial<ScopeRoles>): void {
    governance.roles.mockReturnValue(of(scopeRoles(overrides)));
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
   * Ticks or unticks an Officer capability, as a reader would.
   *
   * @param index - Which, in the order offered.
   */
  function toggle(index: number): void {
    (
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'input[type="checkbox"]',
      )[index] as HTMLInputElement
    ).click();
    fixture.detectChanges();
  }

  /**
   * The Save button in a form.
   *
   * @param label - The form's accessible name.
   * @returns The button.
   */
  function saveIn(label: string): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      `form[aria-label="${label}"] button[type="submit"]`,
    ) as HTMLButtonElement;
  }

  beforeEach(() => {
    governance = {
      roles: jest.fn(() => of(scopeRoles())),
      setOfficerCapabilities: jest.fn(() => of(undefined)),
      setPersonal: jest.fn(() => of(undefined)),
      clearPersonal: jest.fn(() => of(undefined)),
    };
  });

  it('shows the Owner the Officers’ capabilities, ticked as saved', async () => {
    await render();

    const boxes = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'input[type="checkbox"]',
      ),
    ) as HTMLInputElement[];

    expect(boxes.map(box => box.checked)).toEqual([true, false]);
    expect(pageText(fixture)).toContain('Publish news for the scope.');
    expect(saveIn('What every Officer holds').disabled).toBe(true);
  });

  it('lists who is granted or denied what', async () => {
    rolesAre({
      personal: [
        ...scopeRoles().personal,
        {
          grantId: 'grant-2',
          userId: 'user-nameless',
          username: null,
          capability: 'retired.capability',
          effect: ScopeCapabilityEffect.DENY,
          since: '2026-09-22T10:00:00.000Z',
        },
      ],
    });
    await render();

    const text = pageText(fixture);

    expect(text).toContain('FleetApplicant Manage events Granted');
    expect(text).toContain(
      'An account with no username retired.capability Denied',
    );
  });

  it('says so when nobody is granted or denied anything', async () => {
    rolesAre({ personal: [] });
    await render();

    expect(pageText(fixture)).toContain('Nobody has been granted or denied');
  });

  describe('for an Admin', () => {
    it('lists what the Officers hold, and changes nothing', async () => {
      rolesAre({ mayManage: false });
      await render({ roles: ['ADMIN'] });

      expect(pageText(fixture)).toContain('Write news');
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('form'),
      ).toBeNull();
      expect(findButton(fixture, 'Clear…')).toBeUndefined();
    });

    it('says so when the Officers hold nothing extra', async () => {
      rolesAre({ mayManage: false, officerCapabilities: [] });
      await render({ roles: ['ADMIN'] });

      expect(pageText(fixture)).toContain('Officers hold nothing extra here.');
    });
  });

  it('offers no changes on a closed scope', async () => {
    await render({ roles: ['OWNER'], closed: true });

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('form'),
    ).toBeNull();
  });

  it('turns away somebody who holds no role that reads it', async () => {
    await render({ roles: [] });

    expect(pageText(fixture)).toContain(GOVERNANCE_DELEGATION_NOT_PERMITTED);
  });

  describe('the Officers', () => {
    it('saves a capability added, with no reason asked', async () => {
      await render();
      toggle(1);

      expect(pageText(fixture)).not.toContain('Why take these');
      submit('What every Officer holds');

      expect(governance.setOfficerCapabilities).toHaveBeenCalledWith(
        COMMUNITY,
        ['news.write', 'events.manage'],
        undefined,
      );
      expect(pageText(fixture)).toContain(OFFICERS_SAVED);
      expect(governance.roles).toHaveBeenCalledTimes(2);
    });

    it('asks why before taking one away', async () => {
      await render();
      toggle(0);

      expect(pageText(fixture)).toContain('Why take these from the Officers');
      expect(saveIn('What every Officer holds').disabled).toBe(true);
      submit('What every Officer holds');
      expect(governance.setOfficerCapabilities).not.toHaveBeenCalled();

      typeInto(fixture, '#delegation-officer-reason', ' Moved to Admins. ');
      submit('What every Officer holds');

      expect(governance.setOfficerCapabilities).toHaveBeenCalledWith(
        COMMUNITY,
        [],
        'Moved to Admins.',
      );
    });

    it('sends nothing when the ticks are as saved', async () => {
      await render();
      toggle(1);
      toggle(1);
      submit('What every Officer holds');

      expect(governance.setOfficerCapabilities).not.toHaveBeenCalled();
    });

    it('puts the ticks back', async () => {
      await render();
      toggle(0);
      typeInto(fixture, '#delegation-officer-reason', 'Why');
      pressButton(fixture, 'Undo changes');

      expect(fixture.componentInstance.officerDraft()).toBeNull();
      expect(pageText(fixture)).not.toContain('Why take these');
    });

    it('sends one change at a time', async () => {
      governance.setOfficerCapabilities.mockReturnValue(NEVER);
      await render();
      toggle(1);
      submit('What every Officer holds');
      submit('What every Officer holds');

      expect(governance.setOfficerCapabilities).toHaveBeenCalledTimes(1);
    });

    it('says so plainly when saving fails', async () => {
      governance.setOfficerCapabilities.mockReturnValue(
        throwError(() => new Error('down')),
      );
      await render();
      toggle(1);
      submit('What every Officer holds');

      expect(pageText(fixture)).toContain(DELEGATION_FAILED);
    });
  });

  describe('one person', () => {
    /**
     * Fills in the grant-or-deny form.
     *
     * @param effect - Grant or deny.
     */
    function choose(effect: ScopeCapabilityEffect): void {
      chooseFrom(fixture, '#delegation-person', 'user-member');
      chooseFrom(fixture, '#delegation-capability', 'news.write');
      chooseFrom(fixture, '#delegation-effect', effect);
    }

    it('offers role holders and members once each, and not the Owner', async () => {
      await render();

      expect(
        Array.from(
          (fixture.nativeElement as HTMLElement).querySelectorAll(
            '#delegation-person option',
          ),
        ).map(option => String(option.textContent).trim()),
      ).toEqual([
        'Choose somebody',
        'FleetAdmin',
        'FleetApplicant',
        'An account with no username',
      ]);
    });

    it('says so when there is nobody to offer', async () => {
      rolesAre({ holders: [], candidates: [] });
      await render();

      expect(pageText(fixture)).toContain(
        'Nobody here can be granted or denied anything yet.',
      );
    });

    it('grants without a reason', async () => {
      await render();
      choose(ScopeCapabilityEffect.GRANT);

      expect(pageText(fixture)).toContain('Why (optional)');
      submit('Grant or deny one person');

      expect(governance.setPersonal).toHaveBeenCalledWith(COMMUNITY, {
        userId: 'user-member',
        capability: 'news.write',
        effect: 'GRANT',
      });
      expect(pageText(fixture)).toContain(PERSONAL_SAVED);
      expect(fixture.componentInstance.personUserId()).toBe('');
    });

    it('denies only with a reason', async () => {
      await render();
      choose(ScopeCapabilityEffect.DENY);

      expect(saveIn('Grant or deny one person').disabled).toBe(true);
      submit('Grant or deny one person');
      expect(governance.setPersonal).not.toHaveBeenCalled();

      typeInto(fixture, '#delegation-person-reason', ' Posted spam. ');
      submit('Grant or deny one person');

      expect(governance.setPersonal).toHaveBeenCalledWith(COMMUNITY, {
        userId: 'user-member',
        capability: 'news.write',
        effect: 'DENY',
        reason: 'Posted spam.',
      });
    });

    it('sends nothing until everything is chosen', async () => {
      await render();
      chooseFrom(fixture, '#delegation-person', 'user-member');
      submit('Grant or deny one person');

      expect(governance.setPersonal).not.toHaveBeenCalled();
    });

    it('sends one change at a time', async () => {
      governance.setPersonal.mockReturnValue(NEVER);
      await render();
      choose(ScopeCapabilityEffect.GRANT);
      submit('Grant or deny one person');
      submit('Grant or deny one person');

      expect(governance.setPersonal).toHaveBeenCalledTimes(1);
    });

    it('gives the server’s reason for a refusal', async () => {
      governance.setPersonal.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'They are not a member here.' },
            }),
        ),
      );
      await render();
      choose(ScopeCapabilityEffect.GRANT);
      submit('Grant or deny one person');

      expect(pageText(fixture)).toContain('They are not a member here.');
    });
  });

  describe('clearing', () => {
    const DENIAL = {
      grantId: 'grant-2',
      userId: 'user-nameless',
      username: null,
      capability: 'news.write',
      effect: ScopeCapabilityEffect.DENY,
      since: '2026-09-22T10:00:00.000Z',
    };

    it('asks why before clearing a grant', async () => {
      await render();
      pressButton(fixture, 'Clear…');

      expect(pageText(fixture)).toContain(
        'Clear FleetApplicant’s grant of “Manage events”?',
      );
      expect(findButton(fixture, 'Clear')?.disabled).toBe(true);
      submit('Clear a grant or denial');
      expect(governance.clearPersonal).not.toHaveBeenCalled();

      typeInto(fixture, '#delegation-clear-reason', ' No longer needed. ');
      submit('Clear a grant or denial');

      expect(governance.clearPersonal).toHaveBeenCalledWith(
        COMMUNITY,
        'grant-1',
        'No longer needed.',
      );
      expect(pageText(fixture)).toContain(PERSONAL_CLEARED);
    });

    it('clears a denial with no reason', async () => {
      rolesAre({ personal: [DENIAL] });
      await render();
      pressButton(fixture, 'Clear…');

      expect(pageText(fixture)).toContain(
        'Clear this account’s denial of “Write news”?',
      );
      expect(pageText(fixture)).toContain('Reason (optional)');
      submit('Clear a grant or denial');

      expect(governance.clearPersonal).toHaveBeenCalledWith(
        COMMUNITY,
        'grant-2',
        undefined,
      );
    });

    it('can be thought better of', async () => {
      await render();
      pressButton(fixture, 'Clear…');
      pressButton(fixture, 'Keep it');

      expect(fixture.componentInstance.clearing()).toBeNull();
    });

    it('does nothing when nothing is being asked about', async () => {
      await render();
      fixture.componentInstance.onConfirmClear({} as never);

      expect(governance.clearPersonal).not.toHaveBeenCalled();
    });

    it('sends one clearing at a time', async () => {
      governance.clearPersonal.mockReturnValue(NEVER);
      rolesAre({ personal: [DENIAL] });
      await render();
      pressButton(fixture, 'Clear…');
      submit('Clear a grant or denial');
      submit('Clear a grant or denial');

      expect(governance.clearPersonal).toHaveBeenCalledTimes(1);
    });
  });
});
