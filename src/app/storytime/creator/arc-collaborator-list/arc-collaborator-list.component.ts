import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import {
  ArcCollaborator,
  CollaborationInvitationStatus,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ArcService } from '../../arc.service';
import { COLLABORATION_STATUS_LABELS } from '../../storytime.constants';

/**
 * Who is helping curate an Arc.
 *
 * There is no control for publishing. Only the curator may publish an Arc, so
 * offering a switch that could never be turned on would be worse than saying
 * nothing.
 */
@Component({
  selector: 'app-arc-collaborator-list',
  templateUrl: './arc-collaborator-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ArcCollaboratorListComponent implements OnInit {
  /** The collaborators, invitations included. */
  collaborators: ArcCollaborator[] = [];

  /** The Arc this team belongs to. */
  arcId = '';

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Status labels, so a raw enum value is never shown. */
  readonly statusLabels = COLLABORATION_STATUS_LABELS;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _arcService = inject(ArcService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);

  /** The invitation form. */
  readonly form = this._formBuilder.nonNullable.group({
    userId: ['', Validators.required],
    collaborationRole: [''],
    canEditArc: [false],
    canManageStories: [false],
    canManageCollaborators: [false],
  });

  /**
   * Loads the team of the Arc named in the route.
   */
  ngOnInit(): void {
    this.arcId = this._route.snapshot.paramMap.get('arcId') ?? '';
    this.load();
  }

  /**
   * Whether a collaboration is waiting on an answer.
   *
   * @param collaborator - The collaboration.
   * @returns True while it is still an invitation.
   */
  isPending(collaborator: ArcCollaborator): boolean {
    return (
      collaborator.invitationStatus === CollaborationInvitationStatus.INVITED
    );
  }

  /**
   * Sends an invitation.
   */
  invite(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.runAction(
      this._arcService.inviteArcCollaborator(this.arcId, {
        userId: value.userId.trim(),
        collaborationRole: value.collaborationRole.trim() || undefined,
        canEditArc: value.canEditArc,
        canManageStories: value.canManageStories,
        canManageCollaborators: value.canManageCollaborators,
      }),
      () => this.form.reset(),
    );
  }

  /**
   * Turns one of a collaborator's capabilities on or off.
   *
   * @param collaborator - The collaboration.
   * @param capability - The capability to change.
   * @param granted - Whether it should now be granted.
   */
  setCapability(
    collaborator: ArcCollaborator,
    capability: 'canEditArc' | 'canManageStories' | 'canManageCollaborators',
    granted: boolean,
  ): void {
    this.runAction(
      this._arcService.updateArcCollaborator(collaborator.id, {
        [capability]: granted,
      }),
    );
  }

  /**
   * Withdraws an invitation, or removes a collaborator.
   *
   * @param collaborator - The collaboration.
   */
  revoke(collaborator: ArcCollaborator): void {
    this.runAction(this._arcService.revokeArcCollaboration(collaborator.id));
  }

  /**
   * Runs an action, then reloads so the list reflects what the server did.
   *
   * @param action - The action to run.
   * @param onSuccess - Anything else to do once it succeeds.
   */
  private runAction(action: Observable<unknown>, onSuccess?: () => void): void {
    this.isLoading = true;
    this.errorMessage = '';

    action.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        onSuccess?.();
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          (error.error as { message?: string } | undefined)?.message ??
          'That change could not be saved. Please try again shortly.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Loads the team.
   */
  private load(): void {
    this.isLoading = true;

    this._arcService
      .getArcCollaborators(this.arcId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: collaborators => {
          this.collaborators = collaborators;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 403
              ? 'You do not have access to this Arc.'
              : 'The team could not be loaded. Please try again shortly.';
        },
      });
  }
}
