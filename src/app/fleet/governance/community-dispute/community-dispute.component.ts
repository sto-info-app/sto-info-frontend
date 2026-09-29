import { AsyncPipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';

import { filter, Observable, switchMap } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FLEET_AUDIENCE_LABELS } from 'src/app/fleet/constants/fleet-scope.constants';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
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
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import {
  GOVERNANCE_REASON_LIMIT,
  UNNAMED_PERSON,
} from 'src/app/fleet/governance/governance.constants';
import { nameOf } from 'src/app/fleet/governance/governance.utils';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  CommunityDisputeView,
  DisputeRegistration,
  DisputeScope,
} from 'src/app/models/fleet-governance.models';
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

/** What to say once something is suspended (FC-036). */
export const DISPUTE_SUSPENDED =
  'It is suspended: it can be read, and nothing in it may change until it is reinstated.';

/** What to say once a suspension is lifted. */
export const DISPUTE_REINSTATED = 'Its suspension is lifted.';

/** What to say once a Fleet or Armada is closed. */
export const DISPUTE_SCOPE_CLOSED = 'It is closed. Every role in it has ended.';

/** What is said above every registration. */
export const DISPUTE_UNVERIFIED =
  'STO Info cannot tell who leads a Fleet or an Armada in the game. These are the registrations of the same name on the same platform, with where each came from; none of them is shown as the real one.';

/** The shortest and longest purpose for a look into a Fleet. */
const PURPOSE = { min: 10, max: 500 } as const;

/**
 * Where a site administrator settles a dispute over who owns a Community
 * (FC-022, FC-036).
 *
 * They may move ownership to one of its Admins, with no acceptance asked,
 * or close it. Both need a reason, which is kept with its history. The
 * former Owner keeps no role, and any open offer is withdrawn.
 *
 * FC-036 adds: every registration of each of its Fleets' and Armadas' names,
 * private ones included, with where each came from and no claim about which
 * is real; suspending, reinstating and closing the Community or any of its
 * Fleets and Armadas; and a read-only look into a Fleet's imports for 24
 * hours, with a purpose.
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
    TitleCasePipe,
    RouterLink,
    FleetPageShellComponent,
    LcarsErrorMessageComponent,
  ],
})
export class CommunityDisputeComponent extends GovernancePageDirective<CommunityDisputeView> {
  private readonly _governance = inject(FleetGovernanceService);
  private readonly _dialog = inject(MatDialog);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  readonly notPermittedMessage = DISPUTE_NOT_PERMITTED;
  readonly reasonLimit = GOVERNANCE_REASON_LIMIT;
  readonly unnamed = UNNAMED_PERSON;
  readonly closed = FleetScopeStatus.CLOSED;
  readonly suspendedStatus = FleetScopeStatus.SUSPENDED;
  readonly unverified = DISPUTE_UNVERIFIED;
  readonly audienceLabels = FLEET_AUDIENCE_LABELS;

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
            // Only an open Community is offered to move, and an open one
            // always has an Owner (FC-038).
            `<p>${escapeHtml(nameOf(view.owner!.username))} will hold no ` +
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
   * A Fleet's or Armada's registration, then every other of its name.
   *
   * @param scope - The Fleet or Armada.
   * @returns Them all, this one first.
   */
  registrationsOf(scope: DisputeScope): DisputeRegistration[] {
    return [scope, ...scope.duplicates];
  }

  /**
   * Suspends or reinstates the Community, or one of its Fleets or Armadas,
   * with a reason (FC-036).
   *
   * @param scope - The Community.
   * @param target - The Fleet or Armada, or null for the Community itself.
   * @param name - What it is called.
   * @param action - Which.
   */
  onSuspension(
    scope: GovernanceScopeVm,
    target: DisputeScope | null,
    name: string,
    action: 'suspend' | 'reinstate',
  ): void {
    const suspending = action === 'suspend';

    this.change(
      this.askWhy({
        title: suspending ? `Suspend ${name}` : `Reinstate ${name}`,
        message: suspending
          ? 'It stays readable, and nothing in it may change — no posts, imports, events or roles — until it is reinstated. Its roles and members stand.'
          : 'Everything in it may change again, as before.',
        label: 'Reason',
        confirmText: suspending ? 'Suspend' : 'Reinstate',
        max: this.reasonLimit,
      }),
      reason =>
        this._governance.actAsSiteAdmin(
          scope.target.communityId,
          target === null ? null : { kind: target.kind, id: target.id },
          action,
          reason,
        ),
      suspending ? DISPUTE_SUSPENDED : DISPUTE_REINSTATED,
    );
  }

  /**
   * Asks for the name and a reason, then closes one of its Fleets or
   * Armadas (FC-036).
   *
   * @param scope - The Community.
   * @param target - The Fleet or Armada.
   */
  onCloseScope(scope: GovernanceScopeVm, target: DisputeScope): void {
    this.change(
      this._dialog
        .open<
          GovernanceCloseDialogComponent,
          GovernanceCloseDialogData,
          GovernanceCloseDialogResult
        >(GovernanceCloseDialogComponent, {
          width: '75%',
          data: {
            scopeNoun: target.kind === 'FLEET' ? 'Fleet' : 'Armada',
            name: target.exactGameName,
            asSiteAdmin: true,
          },
        })
        .afterClosed()
        .pipe(
          filter(
            (result): result is GovernanceCloseDialogResult =>
              result !== undefined,
          ),
        ),
      ({ reason }) =>
        this._governance.actAsSiteAdmin(
          scope.target.communityId,
          { kind: target.kind, id: target.id },
          'close',
          reason,
        ),
      DISPUTE_SCOPE_CLOSED,
    );
  }

  /**
   * Asks for a purpose, then opens a read-only look into a Fleet's imports
   * for 24 hours and goes there (FC-036).
   *
   * @param scope - The Community.
   * @param target - The Fleet.
   */
  onInvestigate(scope: GovernanceScopeVm, target: DisputeScope): void {
    this.askWhy({
      title: `Look into ${target.exactGameName}’s imports`,
      message:
        'You can read its imports, rows, conflicts, identity decisions and rank order for 24 hours, and change nothing. Your purpose is logged with your look.',
      label: 'Purpose',
      confirmText: 'Look in',
      ...PURPOSE,
    })
      .pipe(
        switchMap(purpose => {
          this.busy.set(true);
          this.error.set(null);

          return this._governance.investigate(
            scope.target.communityId,
            target.id,
            purpose,
          );
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: look => {
          this.busy.set(false);
          void this._router.navigate(
            FLEET_LINKS.fleetInvestigate(
              look.communitySlug as string,
              look.platformSegment,
              look.fleetSlug,
            ),
          );
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(recruitmentRefusalOf(error, DISPUTE_FAILED));
        },
      });
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
   * Asks why, and emits the answer once given.
   *
   * @param data - What to ask.
   * @returns The reason, trimmed.
   */
  private askWhy(data: GovernanceReasonDialogData): Observable<string> {
    return this._dialog
      .open<
        GovernanceReasonDialogComponent,
        GovernanceReasonDialogData,
        string
      >(GovernanceReasonDialogComponent, { width: '75%', data })
      .afterClosed()
      .pipe(filter((reason): reason is string => reason !== undefined));
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
