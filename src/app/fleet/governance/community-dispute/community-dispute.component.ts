import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';

import { filter, Observable, switchMap } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetGovernanceService } from 'src/app/fleet/governance/fleet-governance.service';
import {
  GovernanceCloseDialogComponent,
  GovernanceCloseDialogData,
  GovernanceCloseDialogResult,
} from 'src/app/fleet/governance/governance-close-dialog/governance-close-dialog.component';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';
import {
  GOVERNANCE_REASON_LIMIT,
  UNNAMED_PERSON,
} from 'src/app/fleet/governance/governance.constants';
import { nameOf } from 'src/app/fleet/governance/governance.utils';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import { CommunityDisputeView } from 'src/app/models/fleet-governance.models';
import { FleetScopeStatus } from 'src/app/models/fleet.models';
import {
  ConfirmPrompt,
  escapeHtml,
} from 'src/app/shared/actions/confirm-prompt';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to anybody but a site administrator. */
export const DISPUTE_NOT_PERMITTED =
  'Settling who owns a Community is for the site’s administrators.';

/** What to say once ownership is moved. */
export const DISPUTE_REASSIGNED =
  'Ownership has moved. The former Owner holds no role here now.';

/** What to say once it is closed. */
export const DISPUTE_CLOSED = 'It is closed. Every role here has ended.';

/** What to say when a change failed for a reason the server did not give. */
export const DISPUTE_FAILED = 'That did not work. Please try again.';

/**
 * Where a site administrator settles a dispute over who owns a Community
 * (FC-022).
 *
 * They may move ownership to one of its Admins, with no acceptance asked,
 * or close it. Both need a reason, which is kept with its history. The
 * former Owner keeps no role, and any open offer is withdrawn.
 */
@Component({
  selector: 'app-community-dispute',
  templateUrl: './community-dispute.component.html',
  styleUrls: ['./community-dispute.component.scss'],
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
export class CommunityDisputeComponent extends GovernancePageDirective<CommunityDisputeView> {
  private readonly _governance = inject(FleetGovernanceService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  readonly notPermittedMessage = DISPUTE_NOT_PERMITTED;
  readonly reasonLimit = GOVERNANCE_REASON_LIMIT;
  readonly unnamed = UNNAMED_PERSON;
  readonly closed = FleetScopeStatus.CLOSED;

  /** The Admin chosen, by account. */
  readonly recipient = signal('');

  /** Why ownership is moved. */
  readonly reason = signal('');

  /** Whether a change is under way. */
  readonly busy = signal(false);

  /** What the last change came to, if it was made. */
  readonly notice = signal<string | null>(null);

  /** What the last change came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /**
   * Asks to be sure, then moves ownership to the Admin chosen. Pressing
   * Enter submits the form whatever the button says, so this checks again.
   *
   * @param scope - The Community.
   * @param view - Its Owner and Admins.
   */
  onReassign(scope: GovernanceScopeVm, view: CommunityDisputeView): void {
    const recipient = view.admins.find(
      person => person.userId === this.recipient(),
    );
    const reason = this.reason().trim();

    if (recipient === undefined || reason === '' || this.busy()) {
      return;
    }

    this.change(
      this._confirm
        .ask({
          title: 'Move ownership',
          message:
            `<p>Make ${escapeHtml(nameOf(recipient.username))} the Owner ` +
            `of ${escapeHtml(view.name)}?</p>` +
            `<p>${escapeHtml(nameOf(view.owner.username))} will hold no ` +
            'role here. Nobody is asked to accept.</p>',
          confirmText: 'Move it',
        })
        .pipe(filter(Boolean)),
      () =>
        this._governance.reassignOwnership(
          scope.target.communityId,
          recipient.userId,
          reason,
        ),
      DISPUTE_REASSIGNED,
    );
  }

  /**
   * Asks for the name and a reason, then closes the Community.
   *
   * @param scope - The Community.
   * @param view - The Community as recorded.
   */
  onClose(scope: GovernanceScopeVm, view: CommunityDisputeView): void {
    this.change(
      this._dialog
        .open<
          GovernanceCloseDialogComponent,
          GovernanceCloseDialogData,
          GovernanceCloseDialogResult
        >(GovernanceCloseDialogComponent, {
          width: '75%',
          data: { scopeNoun: 'Community', name: view.name, asSiteAdmin: true },
        })
        .afterClosed()
        .pipe(
          filter(
            (result): result is GovernanceCloseDialogResult =>
              result !== undefined,
          ),
        ),
      ({ reason }) =>
        this._governance.closeAsSiteAdmin(scope.target.communityId, reason),
      DISPUTE_CLOSED,
    );
  }

  /**
   * Opens to a site administrator, and only on a Community.
   *
   * @param scope - The scope.
   * @returns True when they may.
   */
  protected override mayOpen(scope: GovernanceScopeVm): boolean {
    return scope.isCommunity && scope.isSiteAdmin;
  }

  /**
   * Reads the Community as a site administrator sees it.
   *
   * @param scope - The Community.
   * @returns Its Owner, Admins and any open offer.
   */
  protected load(scope: GovernanceScopeVm): Observable<CommunityDisputeView> {
    return this._governance.disputeView(scope.target.communityId);
  }

  /**
   * Makes one change once the administrator has agreed to it.
   *
   * @param agreed - Emits once they agree, with what they said.
   * @param request - The request, given that.
   * @param done - What to say when it is made.
   */
  private change<T>(
    agreed: Observable<T>,
    request: (answer: T) => Observable<void>,
    done: string,
  ): void {
    agreed
      .pipe(
        switchMap(answer => {
          this.busy.set(true);
          this.notice.set(null);
          this.error.set(null);

          return request(answer);
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.recipient.set('');
          this.reason.set('');
          this.notice.set(done);
          this.reload();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(recruitmentRefusalOf(error, DISPUTE_FAILED));
        },
      });
  }
}
