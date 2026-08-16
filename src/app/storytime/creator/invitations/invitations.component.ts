import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { Collaborator } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { CrewService } from '../../crew.service';
import { COLLABORATOR_CAPABILITIES } from '../../storytime.constants';

/**
 * The collaboration invitations waiting on the signed-in member.
 *
 * Access is something you accept: an invitation sits here doing nothing until
 * its holder answers it, which is why this page exists at all rather than
 * owners simply adding people to their Stories.
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
  /** The unanswered invitations. */
  invitations: Collaborator[] = [];

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _crewService = inject(CrewService);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the invitations waiting on the caller.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Lists what an invitation would let its holder do.
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
   * Accepts an invitation.
   *
   * @param invitation - The invitation.
   */
  accept(invitation: Collaborator): void {
    this.runAction(this._crewService.accept(invitation.id));
  }

  /**
   * Declines an invitation.
   *
   * @param invitation - The invitation.
   */
  decline(invitation: Collaborator): void {
    this.runAction(this._crewService.decline(invitation.id));
  }

  /**
   * Runs an action, then reloads so the list reflects what the server did.
   *
   * @param action - The action to run.
   */
  private runAction(action: Observable<unknown>): void {
    this.isLoading = true;
    this.errorMessage = '';

    action.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => this.load(),
      error: () => {
        this.errorMessage =
          'That could not be saved. Please try again shortly.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Loads the invitations.
   */
  private load(): void {
    this.isLoading = true;

    this._crewService
      .getMyInvitations()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: invitations => {
          this.invitations = invitations;
        },
        error: () => {
          this.errorMessage =
            'Your invitations could not be loaded. Please try again shortly.';
        },
      });
  }
}
