import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { filter, Observable, switchMap } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';
import { UNNAMED_PERSON } from 'src/app/fleet/governance/governance.constants';
import { nameOf } from 'src/app/fleet/governance/governance.utils';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetScopeRole,
  OwnershipStanding,
  OwnershipTransfer,
} from 'src/app/models/fleet-governance.models';
import {
  ConfirmPrompt,
  escapeHtml,
} from 'src/app/shared/actions/confirm-prompt';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to anybody but the Owner. */
export const OWNERSHIP_NOT_PERMITTED =
  'Handing a Community over is for its Owner.';

/** What to say once it is offered. */
export const OWNERSHIP_OFFERED =
  'Offered. They have seven days to accept or decline.';

/** What to say once the offer is taken back. */
export const OWNERSHIP_CANCELLED = 'The offer is taken back.';

/** What to say when a change failed for a reason the server did not give. */
export const OWNERSHIP_FAILED = 'That did not work. Please try again.';

/**
 * Where a Community's Owner offers it to one of its Admins, and takes the
 * offer back (FC-022).
 *
 * Ownership moves only when the Admin accepts, on the Community's page,
 * within seven days. One offer is open at a time. On acceptance the former
 * Owner stays on as an Admin.
 */
@Component({
  selector: 'app-community-ownership',
  templateUrl: './community-ownership.component.html',
  styleUrls: ['./community-ownership.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    RouterLink,
    FleetPageShellComponent,
    LcarsErrorMessageComponent,
  ],
})
export class CommunityOwnershipComponent extends GovernancePageDirective<OwnershipStanding> {
  private readonly _governance = inject(FleetGovernanceService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  readonly notPermittedMessage = OWNERSHIP_NOT_PERMITTED;
  readonly unnamed = UNNAMED_PERSON;

  /** The Admin chosen, by account. */
  readonly recipient = signal('');

  /** Whether a change is under way. */
  readonly busy = signal(false);

  /** What the last change came to, if it was made. */
  readonly notice = signal<string | null>(null);

  /** What the last change came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /**
   * Asks the Owner to be sure, then offers the Community to the Admin
   * chosen.
   *
   * @param scope - The Community.
   * @param standing - Where ownership stands.
   */
  onOffer(scope: GovernanceScopeVm, standing: OwnershipStanding): void {
    const recipient = standing.eligible.find(
      person => person.userId === this.recipient(),
    );

    if (recipient === undefined || this.busy()) {
      return;
    }

    this.confirmThen(
      {
        title: 'Offer ownership',
        message:
          `<p>Offer ${escapeHtml(scope.name)} to ` +
          `${escapeHtml(nameOf(recipient.username))}?</p>` +
          '<p>If they accept within seven days, they become its Owner and ' +
          'you stay on as an Admin. Until then you can take the offer ' +
          'back.</p>',
        confirmText: 'Offer it',
      },
      () =>
        this._governance.offerOwnership(
          scope.target.communityId,
          recipient.userId,
        ),
      OWNERSHIP_OFFERED,
    );
  }

  /**
   * Asks the Owner to be sure, then takes the offer back.
   *
   * @param scope - The Community.
   * @param offer - The open offer.
   */
  onCancel(scope: GovernanceScopeVm, offer: OwnershipTransfer): void {
    if (this.busy()) {
      return;
    }

    this.confirmThen(
      {
        title: 'Take the offer back',
        message:
          `<p>Take back the offer of ${escapeHtml(scope.name)} to ` +
          `${escapeHtml(nameOf(offer.to.username))}?</p>`,
        confirmText: 'Take it back',
        cancelText: 'Leave it open',
      },
      () =>
        this._governance.answerOwnership(
          scope.target.communityId,
          offer.id,
          'cancel',
        ),
      OWNERSHIP_CANCELLED,
    );
  }

  /**
   * Opens to the Owner alone, and only on a Community.
   *
   * @param scope - The scope.
   * @returns True when they may.
   */
  protected override mayOpen(scope: GovernanceScopeVm): boolean {
    return scope.isCommunity && scope.roles.includes(FleetScopeRole.OWNER);
  }

  /**
   * Reads where ownership stands.
   *
   * @param scope - The Community.
   * @returns The open offer, and whom it may be offered to.
   */
  protected load(scope: GovernanceScopeVm): Observable<OwnershipStanding> {
    return this._governance.ownership(scope.target.communityId);
  }

  /**
   * Asks, and makes one change if the Owner agrees.
   *
   * @param question - What to ask.
   * @param question.title - The dialog's heading.
   * @param question.message - What it says, as escaped markup.
   * @param question.confirmText - The button that goes ahead.
   * @param question.cancelText - The button that backs out.
   * @param change - The request.
   * @param done - What to say when it is made.
   */
  private confirmThen(
    question: {
      title: string;
      message: string;
      confirmText: string;
      cancelText?: string;
    },
    change: () => Observable<unknown>,
    done: string,
  ): void {
    this._confirm
      .ask(question)
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.busy.set(true);
          this.notice.set(null);
          this.error.set(null);

          return change();
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.recipient.set('');
          this.notice.set(done);
          this.reload();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(recruitmentRefusalOf(error, OWNERSHIP_FAILED));
          this.reload();
        },
      });
  }
}
