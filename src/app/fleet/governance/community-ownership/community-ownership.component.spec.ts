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
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  OwnershipStanding,
  OwnershipTransfer,
  OwnershipTransferState,
} from 'src/app/models/fleet-governance.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';

import {
  CommunityOwnershipComponent,
  OWNERSHIP_CANCELLED,
  OWNERSHIP_FAILED,
  OWNERSHIP_NOT_PERMITTED,
  OWNERSHIP_OFFERED,
} from './community-ownership.component';

/**
 * Builds an open offer.
 *
 * @param overrides - Fields to override.
 * @returns The offer.
 */
function offer(overrides: Partial<OwnershipTransfer> = {}): OwnershipTransfer {
  return {
    id: 'transfer-1',
    from: { userId: 'user-owner', username: 'FleetOwner' },
    to: { userId: 'user-admin', username: 'Fleet<Admin>' },
    state: OwnershipTransferState.PENDING,
    offeredAt: '2026-09-20T10:00:00.000Z',
    expiresAt: '2026-09-27T10:00:00.000Z',
    answeredAt: null,
    ...overrides,
  };
}

describe('CommunityOwnershipComponent', () => {
  let fixture: ComponentFixture<CommunityOwnershipComponent>;
  let confirm: ConfirmPromptDouble;
  let governance: {
    ownership: jest.Mock;
    offerOwnership: jest.Mock;
    answerOwnership: jest.Mock;
  };

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
      imports: [CommunityOwnershipComponent],
      providers: [...route.providers, confirm.provider],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityOwnershipComponent);
    fixture.detectChanges();
  }

  /**
   * Answers where ownership stands.
   *
   * @param standing - The answer.
   */
  function standingIs(standing: OwnershipStanding): void {
    governance.ownership.mockReturnValue(of(standing));
  }

  /** Submits the offer form. */
  function submit(): void {
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'form',
      ) as HTMLFormElement
    ).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    confirm = stubConfirmPrompt();
    governance = {
      ownership: jest.fn(() =>
        of({
          offer: null,
          eligible: [
            { userId: 'user-admin', username: 'Fleet<Admin>' },
            { userId: 'user-nameless', username: null },
          ],
        }),
      ),
      offerOwnership: jest.fn(() => of(offer())),
      answerOwnership: jest.fn(() => of(undefined)),
    };
  });

  it('offers the Owner its Admins', async () => {
    await render();

    expect(governance.ownership).toHaveBeenCalledWith('community-1');
    expect(pageText(fixture)).toContain('Choose an Admin Fleet<Admin>');
    expect(pageText(fixture)).toContain('An account with no username');
    expect(findButton(fixture, 'Offer ownership…')?.disabled).toBe(true);
  });

  it('asks, then offers it to the Admin chosen', async () => {
    await render();
    chooseFrom(fixture, '#ownership-recipient', 'user-admin');
    submit();

    expect(confirm.lastAsked()?.message).toContain(
      'Offer United Federation Alliance to Fleet&lt;Admin&gt;?',
    );
    expect(governance.offerOwnership).toHaveBeenCalledWith(
      'community-1',
      'user-admin',
    );
    expect(pageText(fixture)).toContain(OWNERSHIP_OFFERED);
    expect(governance.ownership).toHaveBeenCalledTimes(2);
  });

  it('names an Admin with no username plainly when asking', async () => {
    await render();
    chooseFrom(fixture, '#ownership-recipient', 'user-nameless');
    submit();

    expect(confirm.lastAsked()?.message).toContain(
      'to An account with no username?',
    );
  });

  it('offers nothing when the Owner thinks better of it', async () => {
    confirm.answer(false);
    await render();
    chooseFrom(fixture, '#ownership-recipient', 'user-admin');
    submit();

    expect(governance.offerOwnership).not.toHaveBeenCalled();
  });

  it('asks nothing until an Admin is chosen', async () => {
    await render();
    submit();

    expect(confirm.dialog.open).not.toHaveBeenCalled();
  });

  it('sends one offer at a time', async () => {
    governance.offerOwnership.mockReturnValue(NEVER);
    await render();
    chooseFrom(fixture, '#ownership-recipient', 'user-admin');
    submit();
    submit();

    expect(governance.offerOwnership).toHaveBeenCalledTimes(1);
  });

  it('gives the server’s reason for a refusal, and reads it again', async () => {
    governance.offerOwnership.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'An offer is already open.' },
          }),
      ),
    );
    await render();
    chooseFrom(fixture, '#ownership-recipient', 'user-admin');
    submit();

    expect(pageText(fixture)).toContain('An offer is already open.');
    expect(governance.ownership).toHaveBeenCalledTimes(2);
  });

  it('says so plainly when it fails otherwise', async () => {
    governance.offerOwnership.mockReturnValue(
      throwError(() => new Error('down')),
    );
    await render();
    chooseFrom(fixture, '#ownership-recipient', 'user-admin');
    submit();

    expect(pageText(fixture)).toContain(OWNERSHIP_FAILED);
  });

  it('says how to offer it when there is no Admin', async () => {
    standingIs({ offer: null, eligible: [] });
    await render();

    expect(pageText(fixture)).toContain('it has none. Appoint one first.');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.fleet-community-empty a')
        ?.getAttribute('href'),
    ).toBe('/fleets/communities/united-federation-alliance/manage/roles');
  });

  it('offers nothing on a closed Community', async () => {
    await render({ roles: ['OWNER'], closed: true });

    expect(pageText(fixture)).toContain('cannot be handed over');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('form'),
    ).toBeNull();
  });

  describe('with an offer open', () => {
    beforeEach(() => {
      standingIs({ offer: offer(), eligible: [] });
    });

    it('says to whom, and when it lapses', async () => {
      await render();

      expect(pageText(fixture)).toContain('Offered to Fleet<Admin>');
      expect(pageText(fixture)).toContain('It lapses on');
    });

    it('names an Admin with no username plainly', async () => {
      standingIs({
        offer: offer({ to: { userId: 'user-nameless', username: null } }),
        eligible: [],
      });
      await render();
      pressButton(fixture, 'Take the offer back…');

      expect(pageText(fixture)).toContain(
        'Offered to An account with no username',
      );
      expect(confirm.lastAsked()?.message).toContain(
        'to An account with no username?',
      );
    });

    it('asks, then takes it back', async () => {
      await render();
      pressButton(fixture, 'Take the offer back…');

      expect(confirm.lastAsked()?.title).toBe('Take the offer back');
      expect(governance.answerOwnership).toHaveBeenCalledWith(
        'community-1',
        'transfer-1',
        'cancel',
      );
      expect(pageText(fixture)).toContain(OWNERSHIP_CANCELLED);
    });

    it('takes nothing back while a change is under way', async () => {
      governance.answerOwnership.mockReturnValue(NEVER);
      await render();
      pressButton(fixture, 'Take the offer back…');
      fixture.componentInstance.onCancel({} as never, offer());

      expect(governance.answerOwnership).toHaveBeenCalledTimes(1);
    });
  });

  it.each([
    [{ roles: ['ADMIN'] }],
    [{ roles: ['OWNER'], onFleet: true }],
    [{ isSiteAdmin: true }],
  ])('turns away anybody but the Community’s Owner (%p)', async reader => {
    await render(reader);

    expect(pageText(fixture)).toContain(OWNERSHIP_NOT_PERMITTED);
  });
});
