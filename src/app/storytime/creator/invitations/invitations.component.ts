import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { Observable, finalize, forkJoin } from 'rxjs';
import {
  ArcCollaborator,
  ArcMembership,
  ArcMembershipStatus,
  Collaborator,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ArcService } from '../../arc.service';
import { CrewService } from '../../crew.service';
import {
  ARC_COLLABORATOR_CAPABILITIES,
  COLLABORATOR_CAPABILITIES,
} from '../../storytime.constants';

/**
 * Everything waiting on the signed-in member to answer.
 *
 * Access is something you accept: an invitation sits here doing nothing until
 * its holder answers it, which is why this page exists at all rather than
 * owners simply adding people to their work.
 *
 * Story collaborations, Arc collaborations and Arc memberships are gathered
 * into one page because they are the same thing to the person answering — a
 * decision somebody is waiting on — and three places to check would mean each
 * gets checked less often.
 */
@Component({
  selector: 'app-storytime-invitations',
  templateUrl: './invitations.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class InvitationsComponent implements OnInit {
  /** The unanswered Story collaboration invitations. */
  invitations: Collaborator[] = [];

  /** The unanswered Arc collaboration invitations. */
  arcInvitations: ArcCollaborator[] = [];

  /** The Arc memberships waiting on the caller, from either side. */
  arcMemberships: ArcMembership[] = [];

  /** Whether the lists are still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _crewService = inject(CrewService);
  private readonly _arcService = inject(ArcService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads everything waiting on the caller.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Whether there is nothing at all to answer.
   *
   * @returns True when every list is empty.
   */
  get isEmpty(): boolean {
    return (
      this.invitations.length === 0 &&
      this.arcInvitations.length === 0 &&
      this.arcMemberships.length === 0
    );
  }

  /**
   * Lists what a Story invitation would let its holder do.
   *
   * Shown before they answer, because agreeing to something without being told
   * what it is would make the acceptance meaningless.
   *
   * @param invitation - The invitation.
   * @returns The capabilities it grants, in plain words.
   */
  grants(invitation: Collaborator): string[] {
    return COLLABORATOR_CAPABILITIES.filter(
      capability => invitation[capability.key],
    ).map(capability => capability.label);
  }

  /**
   * Lists what an Arc invitation would let its holder do.
   *
   * @param invitation - The invitation.
   * @returns The capabilities it grants, in plain words.
   */
  arcGrants(invitation: ArcCollaborator): string[] {
    return ARC_COLLABORATOR_CAPABILITIES.filter(
      capability => invitation[capability.key],
    ).map(capability => capability.label);
  }

  /**
   * Describes an Arc membership from the point of view of whoever must answer.
   *
   * Which status a membership holds says which side is waiting: an invitation
   * waits on the Story's writer, a request waits on the Arc's curator.
   *
   * @param membership - The membership.
   * @returns What the caller is being asked.
   */
  describeMembership(membership: ArcMembership): string {
    const title = membership.story?.title ?? 'A Story';

    return membership.membershipStatus === ArcMembershipStatus.REQUESTED
      ? `${title} has asked to join one of your Arcs.`
      : `${title} has been invited into somebody’s Arc.`;
  }

  /**
   * Accepts a Story collaboration invitation.
   *
   * @param invitation - The invitation.
   */
  accept(invitation: Collaborator): void {
    this.runAction(this._crewService.accept(invitation.id));
  }

  /**
   * Declines a Story collaboration invitation.
   *
   * @param invitation - The invitation.
   */
  decline(invitation: Collaborator): void {
    this.runAction(this._crewService.decline(invitation.id));
  }

  /**
   * Accepts an invitation to help curate an Arc.
   *
   * @param invitation - The invitation.
   */
  acceptArc(invitation: ArcCollaborator): void {
    this.runAction(this._arcService.acceptArcCollaboration(invitation.id));
  }

  /**
   * Declines an invitation to help curate an Arc.
   *
   * @param invitation - The invitation.
   */
  declineArc(invitation: ArcCollaborator): void {
    this.runAction(this._arcService.declineArcCollaboration(invitation.id));
  }

  /**
   * Agrees to an Arc membership.
   *
   * @param membership - The membership.
   */
  approveMembership(membership: ArcMembership): void {
    this.runAction(this._arcService.approveMembership(membership.id));
  }

  /**
   * Turns down an Arc membership.
   *
   * @param membership - The membership.
   */
  declineMembership(membership: ArcMembership): void {
    this.runAction(this._arcService.declineMembership(membership.id));
  }

  /**
   * Runs an action, then reloads so the lists reflect what the server did.
   *
   * @param action - The action to run.
   */
  private runAction(action: Observable<unknown>): void {
    this.isLoading = true;
    this.errorMessage = '';

    action
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => this.load(),
        error: () => {
          this.errorMessage =
            'That could not be saved. Please try again shortly.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Loads everything waiting on the caller.
   *
   * The three lists are fetched together so the page settles once rather than
   * rearranging itself as each arrives.
   */
  private load(): void {
    this.isLoading = true;

    forkJoin({
      invitations: this._crewService.getMyInvitations(),
      arcInvitations: this._arcService.getMyArcInvitations(),
      arcMemberships: this._arcService.getPendingMemberships(),
    })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: waiting => {
          this.invitations = waiting.invitations;
          this.arcInvitations = waiting.arcInvitations;
          this.arcMemberships = waiting.arcMemberships;
        },
        error: () => {
          this.errorMessage =
            'Your invitations could not be loaded. Please try again shortly.';
        },
      });
  }
}
