import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { map, Observable } from 'rxjs';

import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetRecruitmentService } from 'src/app/fleet/recruitment/fleet-recruitment.service';
import {
  APPLICATIONS_DECIDE_CAPABILITY,
  APPLICATIONS_VIEW_CAPABILITY,
  INVITATION_STATE_LABELS,
  RECRUITMENT_LIMITS,
} from 'src/app/fleet/recruitment/recruitment.constants';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  FleetInvitation,
  FleetInvitationState,
} from 'src/app/models/fleet-recruitment.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not read the invitations. */
export const FLEET_INVITATIONS_NOT_PERMITTED =
  'Reading this Fleet’s invitations is for its recruiters.';

/** What to say once an invitation is sent. */
export const INVITATION_SENT =
  'The invitation is sent. It stands for 14 days, or until it is answered.';

/** What to say once an invitation is withdrawn. */
export const INVITATION_WITHDRAWN = 'The invitation is withdrawn.';

/** What to say when an invitation could not be sent or withdrawn. */
export const INVITATION_FAILED = 'That could not be done. Please try again.';

/** A Fleet's invitations, and the Fleet. */
export interface FleetInvitationsData {
  readonly section: FleetSection;
  readonly invitations: readonly FleetInvitation[];
}

/**
 * A Fleet's invitations (FC-021).
 *
 * Readable by whoever may read its applications; sent and withdrawn by
 * whoever may decide them, since an invitation is a decision made first. An
 * invitation names somebody by their STO Info username, works whatever the
 * Fleet's recruitment state, skips its requirements, and lapses after 14
 * days unanswered.
 */
@Component({
  selector: 'app-fleet-invitations',
  templateUrl: './fleet-invitations.component.html',
  styleUrls: ['./fleet-invitations.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
  ],
})
export class FleetInvitationsComponent extends FleetSectionPageDirective<FleetInvitationsData> {
  private readonly _recruitment = inject(FleetRecruitmentService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = FLEET_INVITATIONS_NOT_PERMITTED;
  readonly stateLabels = INVITATION_STATE_LABELS;
  readonly usernameLimit = RECRUITMENT_LIMITS.USERNAME;

  protected readonly _requiredCapabilities = [APPLICATIONS_VIEW_CAPABILITY];

  protected override readonly _needsRoster = false;

  /** The username typed. */
  readonly username = signal('');

  /** Whether a request is under way. */
  readonly busy = signal(false);

  /** What the last request came to, if it was refused or failed. */
  readonly actionError = signal<string | null>(null);

  /** What the last request came to, if it was made. */
  readonly actionNotice = signal<string | null>(null);

  /**
   * Whether the reader may send and withdraw invitations.
   *
   * @param data - The page.
   * @returns True for a decider.
   */
  mayInvite(data: FleetInvitationsData): boolean {
    return data.section.tabs.capabilities.includes(
      APPLICATIONS_DECIDE_CAPABILITY,
    );
  }

  /**
   * Whether an invitation is still waiting for its answer.
   *
   * @param invitation - The invitation.
   * @returns True while it may be withdrawn.
   */
  isOpen(invitation: FleetInvitation): boolean {
    return invitation.state === FleetInvitationState.PENDING;
  }

  /**
   * Sends an invitation to the username typed. Pressing Enter submits the
   * form whatever the button says, so this checks again.
   *
   * @param data - The page.
   */
  onInvite(data: FleetInvitationsData): void {
    const username = this.username().trim();

    if (username === '' || this.busy()) {
      return;
    }

    this.run(
      this._recruitment
        .invite(data.section.communityId, data.section.fleetId, username)
        .pipe(map(() => undefined)),
      INVITATION_SENT,
      () => this.username.set(''),
    );
  }

  /**
   * Takes an invitation back.
   *
   * @param data - The page.
   * @param invitation - The invitation.
   */
  onWithdraw(data: FleetInvitationsData, invitation: FleetInvitation): void {
    if (this.busy()) {
      return;
    }

    this.run(
      this._recruitment
        .withdrawInvitation(
          data.section.communityId,
          data.section.fleetId,
          invitation.id,
        )
        .pipe(map(() => undefined)),
      INVITATION_WITHDRAWN,
      () => undefined,
    );
  }

  /**
   * Reads the Fleet's invitations.
   *
   * @param section - The Fleet.
   * @returns The invitations, with the Fleet.
   */
  protected load(section: FleetSection): Observable<FleetInvitationsData> {
    return this._recruitment
      .invitations(section.communityId, section.fleetId)
      .pipe(map(invitations => ({ section, invitations })));
  }

  /**
   * Sends one request, then reads the invitations again.
   *
   * @param work - The request.
   * @param notice - What to say once it is made.
   * @param done - What else to do once it is made.
   */
  private run(work: Observable<void>, notice: string, done: () => void): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.actionNotice.set(null);
    work.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        this.actionNotice.set(notice);
        done();
        this.reload();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.actionError.set(recruitmentRefusalOf(error, INVITATION_FAILED));
      },
    });
  }
}
