import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NEVER, of, throwError } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import {
  findButton,
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  OwnershipTransfer,
  OwnershipTransferState,
} from 'src/app/models/fleet-governance.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';

import {
  OFFER_ANSWER_FAILED,
  OwnershipOfferPanelComponent,
  OwnershipOfferPanelVm,
} from './ownership-offer-panel.component';

/** The Community the panel is drawn for. */
const VM: OwnershipOfferPanelVm = {
  communityId: 'community-1',
  communityName: 'United <Federation>',
  manageLink: ['/fleets', 'communities', 'ufa', 'manage'],
};

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
    to: { userId: 'user-admin', username: 'FleetAdmin' },
    state: OwnershipTransferState.PENDING,
    offeredAt: '2026-09-20T10:00:00.000Z',
    expiresAt: '2026-09-27T10:00:00.000Z',
    answeredAt: null,
    ...overrides,
  };
}

describe('OwnershipOfferPanelComponent', () => {
  let fixture: ComponentFixture<OwnershipOfferPanelComponent>;
  let confirm: ConfirmPromptDouble;
  let governance: { ownership: jest.Mock; answerOwnership: jest.Mock };

  /**
   * Draws the panel.
   *
   * @param userId - Who is reading.
   */
  async function render(userId: string | null = 'user-admin'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [OwnershipOfferPanelComponent],
      providers: [
        provideRouter([]),
        confirm.provider,
        { provide: FleetGovernanceService, useValue: governance },
        { provide: AuthService, useValue: { getUserId: () => userId } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnershipOfferPanelComponent);
    fixture.componentRef.setInput('vm', VM);
    fixture.detectChanges();
  }

  beforeEach(() => {
    confirm = stubConfirmPrompt();
    governance = {
      ownership: jest.fn(() => of({ offer: offer(), eligible: [] })),
      answerOwnership: jest.fn(() => of(undefined)),
    };
  });

  it('tells the Admin offered it what they are offered', async () => {
    await render();

    const text = pageText(fixture);

    expect(governance.ownership).toHaveBeenCalledWith('community-1');
    expect(text).toContain(
      'FleetOwner has offered you ownership of United <Federation>.',
    );
    expect(text).toContain('FleetOwner would stay on as an Admin.');
  });

  it('names an Owner with no username plainly', async () => {
    governance.ownership.mockReturnValue(
      of({
        offer: offer({ from: { userId: 'user-owner', username: null } }),
        eligible: [],
      }),
    );
    await render();

    expect(pageText(fixture)).toContain(
      'An account with no username has offered you',
    );
  });

  it.each([
    ['the Owner', 'user-owner'],
    ['nobody signed in', null],
  ])('shows nothing to %s', async (_who: string, userId: string | null) => {
    await render(userId);

    expect(pageText(fixture).trim()).toBe('');
  });

  it('shows nothing when there is no offer', async () => {
    governance.ownership.mockReturnValue(of({ offer: null, eligible: [] }));
    await render();

    expect(pageText(fixture).trim()).toBe('');
  });

  it('shows nothing when the offer cannot be read', async () => {
    governance.ownership.mockReturnValue(throwError(() => new Error('down')));
    await render();

    expect(pageText(fixture).trim()).toBe('');
  });

  it('asks, then accepts', async () => {
    await render();
    pressButton(fixture, 'Accept…');

    expect(confirm.lastAsked()?.message).toContain(
      'Become the Owner of United &lt;Federation&gt;?',
    );
    expect(governance.answerOwnership).toHaveBeenCalledWith(
      'community-1',
      'transfer-1',
      'accept',
    );
    expect(pageText(fixture)).toContain(
      'You are now the Owner of United <Federation>.',
    );
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('a')
        ?.getAttribute('href'),
    ).toBe('/fleets/communities/ufa/manage');
  });

  it('accepts nothing when the Admin thinks better of it', async () => {
    confirm.answer(false);
    await render();
    pressButton(fixture, 'Accept…');

    expect(governance.answerOwnership).not.toHaveBeenCalled();
  });

  it('declines without asking', async () => {
    await render();
    pressButton(fixture, 'Decline');

    expect(confirm.dialog.open).not.toHaveBeenCalled();
    expect(governance.answerOwnership).toHaveBeenCalledWith(
      'community-1',
      'transfer-1',
      'decline',
    );
    expect(pageText(fixture)).toContain('Declined.');
  });

  it('sends one answer at a time', async () => {
    governance.answerOwnership.mockReturnValue(NEVER);
    await render();
    pressButton(fixture, 'Decline');

    expect(findButton(fixture, 'Accept…')?.disabled).toBe(true);
    fixture.componentInstance.onDecline();

    expect(governance.answerOwnership).toHaveBeenCalledTimes(1);
  });

  it('gives the server’s reason for a refusal', async () => {
    governance.answerOwnership.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'The offer has lapsed.' },
          }),
      ),
    );
    await render();
    pressButton(fixture, 'Decline');

    expect(pageText(fixture)).toContain('The offer has lapsed.');
  });

  it('says so plainly when it fails otherwise', async () => {
    governance.answerOwnership.mockReturnValue(
      throwError(() => new Error('down')),
    );
    await render();
    pressButton(fixture, 'Accept…');

    expect(pageText(fixture)).toContain(OFFER_ANSWER_FAILED);
  });
});
