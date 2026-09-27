import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { catchError, filter, Observable, of, switchMap } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import { UNNAMED_PERSON } from 'src/app/fleet/governance/governance.constants';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import { OwnershipTransfer } from 'src/app/models/fleet-governance.models';
import {
  ConfirmPrompt,
  escapeHtml,
} from 'src/app/shared/actions/confirm-prompt';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** The Community whose offer the panel asks about. */
export interface OwnershipOfferPanelVm {
  readonly communityId: string;
  /** Its name, exactly as recorded. */
  readonly communityName: string;
  /** Its Manage hub. */
  readonly manageLink: string[];
}

/** What the reader has made of the offer, once they answer it. */
export type OwnershipOfferOutcome = 'ACCEPTED' | 'DECLINED';

/** What to say when an answer failed for a reason the server did not give. */
export const OFFER_ANSWER_FAILED = 'That did not work. Please try again.';

/**
 * The offer of a Community's ownership, on the Community's page, for the
 * Admin it was offered to (FC-022).
 *
 * Nobody else sees anything: the server shows an open offer only to the
 * Owner, who follows it from Manage, and to the Admin offered it. Accepting
 * asks first, since it cannot be taken back; declining does not, since the
 * Owner can offer it again.
 *
 * The page is not read again once they answer. Reading it again would draw
 * this panel afresh and lose what it says about the answer, and nothing
 * else on the page depends on who owns the Community.
 */
@Component({
  selector: 'app-ownership-offer-panel',
  templateUrl: './ownership-offer-panel.component.html',
  styleUrls: ['./ownership-offer-panel.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, RouterLink, LcarsErrorMessageComponent],
})
export class OwnershipOfferPanelComponent {
  private readonly _governance = inject(FleetGovernanceService);
  private readonly _authService = inject(AuthService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  readonly unnamed = UNNAMED_PERSON;

  /** The Community being asked about. */
  readonly community = signal<OwnershipOfferPanelVm | null>(null);

  /** The offer made to the reader, or null when there is none. */
  readonly offer = signal<OwnershipTransfer | null>(null);

  /** What the reader made of it. */
  readonly outcome = signal<OwnershipOfferOutcome | null>(null);

  /** Whether an answer is under way. */
  readonly busy = signal(false);

  /** What the last answer came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /**
   * The Community to ask about. Its offer is read each time it changes;
   * an offer that cannot be read is treated as none, since the panel is not
   * what the page is for.
   */
  @Input({ required: true }) set vm(value: OwnershipOfferPanelVm) {
    this.community.set(value);
    this.outcome.set(null);
    this.error.set(null);
    this._governance
      .ownership(value.communityId)
      .pipe(
        catchError(() => of({ offer: null })),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(({ offer }) =>
        this.offer.set(
          offer?.to.userId === this._authService.getUserId() ? offer : null,
        ),
      );
  }

  /** Asks the reader to be sure, then accepts. */
  onAccept(): void {
    const community = this.community() as OwnershipOfferPanelVm;
    const offer = this.offer() as OwnershipTransfer;

    this.answer(
      this._confirm
        .ask({
          title: 'Accept ownership',
          message:
            `<p>Become the Owner of ${escapeHtml(community.communityName)}?` +
            '</p><p>It cannot be handed back except by offering it to one ' +
            'of its Admins. The role you hold now ends.</p>',
          confirmText: 'Accept',
        })
        .pipe(filter(Boolean)),
      'accept',
      offer,
    );
  }

  /** Declines the offer. */
  onDecline(): void {
    this.answer(of(true), 'decline', this.offer() as OwnershipTransfer);
  }

  /**
   * Sends an answer once the reader has agreed to it.
   *
   * @param agreed - Emits once they agree.
   * @param answer - Accept or decline.
   * @param offer - The offer.
   */
  private answer(
    agreed: Observable<unknown>,
    answer: 'accept' | 'decline',
    offer: OwnershipTransfer,
  ): void {
    if (this.busy()) {
      return;
    }

    const communityId = (this.community() as OwnershipOfferPanelVm).communityId;

    agreed
      .pipe(
        switchMap(() => {
          this.busy.set(true);
          this.error.set(null);

          return this._governance.answerOwnership(
            communityId,
            offer.id,
            answer,
          );
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.outcome.set(answer === 'accept' ? 'ACCEPTED' : 'DECLINED');
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(recruitmentRefusalOf(error, OFFER_ANSWER_FAILED));
        },
      });
  }
}
