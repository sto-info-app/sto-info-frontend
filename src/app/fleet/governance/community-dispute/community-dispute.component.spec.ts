import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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
} from './community-dispute.component';

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
    };
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
    expect(text).toContain('OwnerFleetOwner');
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

    expect(text).toContain('OwnerAn account with no username');
    expect(text).toContain('Admins None');
    expect(text).toContain('Open offer None');
    expect(text).toContain('StatusClosed');
    expect(text).toContain('it has none');
    expect(findButton(fixture, 'Close…')).toBeUndefined();
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
