import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { NEVER, of, throwError } from 'rxjs';

import {
  GovernanceReader,
  governanceRoute,
} from 'src/app/fleet/governance/governance.testing';
import {
  chooseFrom,
  findButton,
  pageText,
  pressButton,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  CommunityDisputeView,
  DisputeScope,
  OwnershipTransferState,
} from 'src/app/models/fleet-governance.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';

import {
  CommunityDisputeComponent,
  DISPUTE_CLOSED,
  DISPUTE_FAILED,
  DISPUTE_NOT_PERMITTED,
  DISPUTE_REASSIGNED,
  DISPUTE_REINSTATED,
  DISPUTE_SCOPE_CLOSED,
  DISPUTE_SUSPENDED,
  DISPUTE_UNVERIFIED,
} from './community-dispute.component';

/**
 * Builds a Fleet or Armada of the Community, with its duplicates.
 *
 * @param overrides - Fields to override.
 * @returns The registration.
 */
function scopeOf(overrides: Partial<DisputeScope> = {}): DisputeScope {
  return {
    kind: 'FLEET',
    id: 'fleet-1',
    exactGameName: 'Deep Space Nine',
    platformName: 'Windows',
    communityId: 'community-1',
    communityName: 'United Federation Alliance',
    communityOwner: { userId: 'user-owner', username: 'FleetOwner' },
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    registeredAt: '2026-01-01T00:00:00.000Z',
    lastImportAt: '2026-09-01T00:00:00.000Z',
    memberCount: 12,
    duplicates: [
      {
        kind: 'FLEET',
        id: 'fleet-rival',
        exactGameName: 'Deep Space Nine',
        platformName: 'Windows',
        communityId: 'community-2',
        communityName: 'Rival Alliance',
        communityOwner: { userId: 'user-rival', username: null },
        visibility: 'PRIVATE',
        status: 'ACTIVE',
        registeredAt: '2026-02-01T00:00:00.000Z',
        lastImportAt: null,
        memberCount: 0,
      },
      {
        kind: 'FLEET',
        id: 'fleet-unregistered',
        exactGameName: 'Deep Space Nine',
        platformName: 'Windows',
        communityId: null,
        communityName: null,
        communityOwner: null,
        visibility: null,
        status: 'ACTIVE',
        registeredAt: '2026-03-01T00:00:00.000Z',
        lastImportAt: null,
        memberCount: null,
      },
    ],
    ...overrides,
  };
}

/**
 * Builds the Community as a site administrator sees it.
 *
 * @param overrides - Fields to override.
 * @returns The view.
 */
function disputeView(
  overrides: Partial<CommunityDisputeView> = {},
): CommunityDisputeView {
  return {
    communityId: 'community-1',
    name: 'United Federation Alliance',
    status: 'ACTIVE',
    owner: { userId: 'user-owner', username: 'FleetOwner' },
    admins: [
      { userId: 'user-admin', username: 'FleetAdmin' },
      { userId: 'user-nameless', username: null },
    ],
    offer: null,
    scopes: [],
    ...overrides,
  };
}

describe('CommunityDisputeComponent', () => {
  let fixture: ComponentFixture<CommunityDisputeComponent>;
  let confirm: ConfirmPromptDouble;
  let governance: {
    disputeView: jest.Mock;
    reassignOwnership: jest.Mock;
    closeAsSiteAdmin: jest.Mock;
    actAsSiteAdmin: jest.Mock;
    investigate: jest.Mock;
  };

  /**
   * Draws the page.
   *
   * @param reader - Who is reading, and where.
   */
  async function render(
    reader: GovernanceReader = { isSiteAdmin: true },
  ): Promise<void> {
    const route = governanceRoute(reader, governance);

    await TestBed.configureTestingModule({
      imports: [CommunityDisputeComponent],
      providers: [...route.providers, confirm.provider],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityDisputeComponent);
    fixture.detectChanges();
  }

  /** Submits the reassignment form. */
  function submit(): void {
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'form',
      ) as HTMLFormElement
    ).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  /**
   * Chooses the new Owner and says why.
   *
   * @param userId - The Admin.
   */
  function fillIn(userId = 'user-admin'): void {
    chooseFrom(fixture, '#dispute-recipient', userId);
    typeInto(fixture, '#dispute-reason', ' The Owner left the game. ');
  }

  beforeEach(() => {
    confirm = stubConfirmPrompt();
    governance = {
      disputeView: jest.fn(() => of(disputeView())),
      reassignOwnership: jest.fn(() => of(undefined)),
      closeAsSiteAdmin: jest.fn(() => of(undefined)),
      actAsSiteAdmin: jest.fn(() => of(undefined)),
      investigate: jest.fn(() =>
        of({
          communitySlug: 'ufa',
          platformSegment: 'windows',
          fleetSlug: 'deep-space-nine',
        }),
      ),
    };
  });

  describe('Fleets, Armadas and their registrations (FC-036)', () => {
    /**
     * Answers the next dialog.
     *
     * @param answer - What it closes with.
     */
    const answer = (answer: unknown): void => {
      confirm.dialog.open.mockReturnValue({ afterClosed: () => of(answer) });
    };

    it('lists every registration of each name, saying none is verified', async () => {
      governance.disputeView.mockReturnValue(
        of(
          disputeView({
            scopes: [
              scopeOf(),
              scopeOf({
                kind: 'ARMADA',
                id: 'armada-1',
                exactGameName: 'Alpha',
                status: 'SUSPENDED',
                lastImportAt: null,
                memberCount: null,
                duplicates: [],
              }),
            ],
          }),
        ),
      );
      await render();

      const text = pageText(fixture);

      expect(text).toContain(DISPUTE_UNVERIFIED);
      expect(text).toContain('Fleet Deep Space Nine');
      expect(text).toContain('Rival Alliance');
      expect(text).toContain('Not registered');
      expect(text).toContain('Anyone, including signed-out visitors');
      expect(text).toContain('The owner alone');
      expect(text).toContain('An account with no username');
      expect(text).toContain('Armada Alpha');
      expect(findButton(fixture, 'Reinstate…')).toBeDefined();
      expect(
        [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
          .map(button => button.textContent?.trim())
          .filter(label => label === 'Look into its imports…'),
      ).toHaveLength(1);
    });

    it('says when the Community has neither', async () => {
      await render();

      expect(pageText(fixture)).toContain('It has no Fleets or Armadas');
    });

    it('suspends a Fleet with a reason', async () => {
      governance.disputeView.mockReturnValue(
        of(disputeView({ scopes: [scopeOf()] })),
      );
      await render();

      answer(undefined);
      (
        (fixture.nativeElement as HTMLElement).querySelector(
          '.community-dispute__actions button',
        ) as HTMLButtonElement
      ).click();
      expect(governance.actAsSiteAdmin).not.toHaveBeenCalled();

      answer('Disputed');
      (
        (fixture.nativeElement as HTMLElement).querySelector(
          '.community-dispute__actions button',
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();

      expect(confirm.dialog.open.mock.lastCall?.[1]).toMatchObject({
        data: { title: 'Suspend Deep Space Nine', confirmText: 'Suspend' },
      });
      expect(governance.actAsSiteAdmin).toHaveBeenCalledWith(
        'community-1',
        { kind: 'FLEET', id: 'fleet-1' },
        'suspend',
        'Disputed',
      );
      expect(pageText(fixture)).toContain(DISPUTE_SUSPENDED);

      answer({ reason: 'Abandoned' });
      (
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.community-dispute__actions button',
        )[1] as HTMLButtonElement
      ).click();

      expect(confirm.dialog.open.mock.lastCall?.[1]).toMatchObject({
        data: { scopeNoun: 'Fleet', name: 'Deep Space Nine' },
      });
    });

    it('reinstates a suspended Community', async () => {
      governance.disputeView.mockReturnValue(
        of(disputeView({ status: 'SUSPENDED' })),
      );
      await render();

      expect(pageText(fixture)).toContain('StatusSuspended');
      answer('Settled');
      pressButton(fixture, 'Reinstate…');

      expect(governance.actAsSiteAdmin).toHaveBeenCalledWith(
        'community-1',
        null,
        'reinstate',
        'Settled',
      );
      expect(pageText(fixture)).toContain(DISPUTE_REINSTATED);
    });

    it('suspends the Community itself', async () => {
      await render();

      answer('Disputed');
      pressButton(fixture, 'Suspend…');

      expect(governance.actAsSiteAdmin).toHaveBeenCalledWith(
        'community-1',
        null,
        'suspend',
        'Disputed',
      );
    });

    it('closes a Fleet or Armada with its name and a reason', async () => {
      governance.disputeView.mockReturnValue(
        of(
          disputeView({
            scopes: [
              scopeOf({
                kind: 'ARMADA',
                id: 'armada-1',
                exactGameName: 'Alpha',
                duplicates: [],
              }),
            ],
          }),
        ),
      );
      await render();

      answer({ reason: 'Abandoned' });
      (
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.community-dispute__actions button',
        )[1] as HTMLButtonElement
      ).click();
      fixture.detectChanges();

      expect(confirm.dialog.open.mock.lastCall?.[1]).toMatchObject({
        data: { scopeNoun: 'Armada', name: 'Alpha', asSiteAdmin: true },
      });
      expect(governance.actAsSiteAdmin).toHaveBeenCalledWith(
        'community-1',
        { kind: 'ARMADA', id: 'armada-1' },
        'close',
        'Abandoned',
      );
      expect(pageText(fixture)).toContain(DISPUTE_SCOPE_CLOSED);

      answer(undefined);
      governance.actAsSiteAdmin.mockClear();
      (
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '.community-dispute__actions button',
        )[1] as HTMLButtonElement
      ).click();
      expect(governance.actAsSiteAdmin).not.toHaveBeenCalled();
    });

    it('offers nothing to change on a closed Fleet', async () => {
      governance.disputeView.mockReturnValue(
        of(disputeView({ scopes: [scopeOf({ status: 'CLOSED' })] })),
      );
      await render();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.community-dispute__actions',
        ),
      ).toBeNull();
    });

    it('opens a look into a Fleet with a purpose, and goes there', async () => {
      governance.disputeView.mockReturnValue(
        of(disputeView({ scopes: [scopeOf()] })),
      );
      await render();

      const navigate = jest
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);

      answer('Checking an import');
      pressButton(fixture, 'Look into its imports…');

      expect(confirm.dialog.open.mock.lastCall?.[1]).toMatchObject({
        data: { label: 'Purpose', min: 10, max: 500 },
      });
      expect(governance.investigate).toHaveBeenCalledWith(
        'community-1',
        'fleet-1',
        'Checking an import',
      );
      expect(navigate).toHaveBeenCalledWith([
        '/fleets',
        'communities',
        'ufa',
        'fleets',
        'windows',
        'deep-space-nine',
        'investigate',
      ]);
    });

    it('says why a look could not be opened', async () => {
      governance.disputeView.mockReturnValue(
        of(disputeView({ scopes: [scopeOf()] })),
      );
      governance.investigate.mockReturnValue(
        throwError(() => new Error('down')),
      );
      await render();

      answer('Checking an import');
      pressButton(fixture, 'Look into its imports…');

      expect(pageText(fixture)).toContain(DISPUTE_FAILED);
    });
  });

  it('names the Owner, the Admins and any offer', async () => {
    governance.disputeView.mockReturnValue(
      of(
        disputeView({
          offer: {
            id: 'transfer-1',
            from: { userId: 'user-owner', username: 'FleetOwner' },
            to: { userId: 'user-admin', username: 'FleetAdmin' },
            state: OwnershipTransferState.PENDING,
            offeredAt: '2026-09-20T10:00:00.000Z',
            expiresAt: '2026-09-27T10:00:00.000Z',
            answeredAt: null,
          },
        }),
      ),
    );
    await render();

    const text = pageText(fixture);

    expect(governance.disputeView).toHaveBeenCalledWith('community-1');
    expect(text).toContain('Owner FleetOwner');
    expect(text).toContain('FleetAdmin, An account with no username');
    expect(text).toContain('To FleetAdmin, lapsing');
    expect(text).not.toContain('StatusClosed');
  });

  it('says when there are no Admins, offer or openness', async () => {
    governance.disputeView.mockReturnValue(
      of(
        disputeView({
          owner: { userId: 'user-owner', username: null },
          admins: [],
          status: 'CLOSED',
        }),
      ),
    );
    await render();

    const text = pageText(fixture);

    expect(text).toContain('Owner An account with no username');
    expect(text).toContain('Admins None');
    expect(text).toContain('Open offer None');
    expect(text).toContain('StatusClosed');
    expect(text).toContain('it has none');
    expect(findButton(fixture, 'Close…')).toBeUndefined();
  });

  it('says a closed Community whose Owner was erased has none (FC-038)', async () => {
    governance.disputeView.mockReturnValue(
      of(disputeView({ owner: null, admins: [], status: 'CLOSED' })),
    );
    await render();

    expect(pageText(fixture)).toContain(
      'Owner None: its Owner’s account was erased',
    );
  });

  describe('moving ownership', () => {
    it('waits for an Admin and a reason', async () => {
      await render();
      chooseFrom(fixture, '#dispute-recipient', 'user-admin');

      expect(findButton(fixture, 'Move ownership…')?.disabled).toBe(true);
      submit();

      expect(confirm.dialog.open).not.toHaveBeenCalled();
    });

    it('asks, then moves it with the reason', async () => {
      await render();
      fillIn();
      submit();

      expect(confirm.lastAsked()?.message).toContain(
        'Make FleetAdmin the Owner of United Federation Alliance?',
      );
      expect(confirm.lastAsked()?.message).toContain(
        'FleetOwner will hold no role here.',
      );
      expect(governance.reassignOwnership).toHaveBeenCalledWith(
        'community-1',
        'user-admin',
        'The Owner left the game.',
      );
      expect(pageText(fixture)).toContain(DISPUTE_REASSIGNED);
      expect(governance.disputeView).toHaveBeenCalledTimes(2);
    });

    it('names accounts with no username plainly when asking', async () => {
      governance.disputeView.mockReturnValue(
        of(disputeView({ owner: { userId: 'user-owner', username: null } })),
      );
      await render();
      fillIn('user-nameless');
      submit();

      expect(confirm.lastAsked()?.message).toContain(
        'Make An account with no username the Owner',
      );
    });

    it('moves nothing when the administrator thinks better of it', async () => {
      confirm.answer(false);
      await render();
      fillIn();
      submit();

      expect(governance.reassignOwnership).not.toHaveBeenCalled();
    });

    it('sends one change at a time', async () => {
      governance.reassignOwnership.mockReturnValue(NEVER);
      await render();
      fillIn();
      submit();
      submit();

      expect(governance.reassignOwnership).toHaveBeenCalledTimes(1);
    });

    it('gives the server’s reason for a refusal', async () => {
      governance.reassignOwnership.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'They own the most Communities allowed.' },
            }),
        ),
      );
      await render();
      fillIn();
      submit();

      expect(pageText(fixture)).toContain(
        'They own the most Communities allowed.',
      );
    });
  });

  describe('closing', () => {
    it('asks for the name and a reason, then closes it', async () => {
      await render();
      confirm.dialog.open.mockReturnValue({
        afterClosed: () => of({ reason: 'Abandoned.' }),
      });
      pressButton(fixture, 'Close…');

      expect(confirm.dialog.open.mock.lastCall?.[1]).toMatchObject({
        data: {
          scopeNoun: 'Community',
          name: 'United Federation Alliance',
          asSiteAdmin: true,
        },
      });
      expect(governance.closeAsSiteAdmin).toHaveBeenCalledWith(
        'community-1',
        'Abandoned.',
      );
      expect(pageText(fixture)).toContain(DISPUTE_CLOSED);
    });

    it('closes nothing when the dialog is dismissed', async () => {
      await render();
      confirm.dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
      pressButton(fixture, 'Close…');

      expect(governance.closeAsSiteAdmin).not.toHaveBeenCalled();
    });

    it('says so plainly when it fails', async () => {
      governance.closeAsSiteAdmin.mockReturnValue(
        throwError(() => new Error('down')),
      );
      await render();
      confirm.dialog.open.mockReturnValue({
        afterClosed: () => of({ reason: 'Abandoned.' }),
      });
      pressButton(fixture, 'Close…');

      expect(pageText(fixture)).toContain(DISPUTE_FAILED);
    });
  });

  it.each([[{ roles: ['OWNER'] }], [{ isSiteAdmin: true, onFleet: true }]])(
    'turns away anybody but a site administrator (%p)',
    async reader => {
      await render(reader);

      expect(pageText(fixture)).toContain(DISPUTE_NOT_PERMITTED);
    },
  );
});
