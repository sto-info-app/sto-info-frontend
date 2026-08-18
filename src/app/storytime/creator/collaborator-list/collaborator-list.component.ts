import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import {
  CollaborationInvitationStatus,
  Collaborator,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { CrewService } from '../../crew.service';
import { COLLABORATION_STATUS_LABELS } from '../../storytime.constants';

/**
 * Who is helping write one of the creator's Stories.
 *
 * There is no control for publishing. Only the owner may publish, so offering
 * a switch that could never be turned on would be worse than saying nothing.
 */
@Component({
  selector: 'app-collaborator-list',
  templateUrl: './collaborator-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class CollaboratorListComponent implements OnInit {
  /** The collaborators, invitations included. */
  collaborators: Collaborator[] = [];

  /** The Story this team belongs to. */
  storyId = '';

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Status labels, so a raw enum value is never shown. */
  readonly statusLabels = COLLABORATION_STATUS_LABELS;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _crewService = inject(CrewService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /** The invitation form. */
  readonly form = this._formBuilder.nonNullable.group({
    userId: ['', Validators.required],
    collaborationRole: [''],
    canEditStory: [false],
    canManageChapters: [false],
    canManageCharacters: [false],
    canManageCrew: [false],
    canManageCollaborators: [false],
  });

  /**
   * Loads the team of the Story named in the route.
   */
  ngOnInit(): void {
    this.storyId = this._route.snapshot.paramMap.get('storyId') ?? '';
    this.load();
  }

  /**
   * Whether a collaboration is waiting on an answer.
   *
   * @param collaborator - The collaboration.
   * @returns True while it is still an invitation.
   */
  isPending(collaborator: Collaborator): boolean {
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
      this._crewService.invite(this.storyId, {
        userId: value.userId.trim(),
        collaborationRole: value.collaborationRole.trim() || undefined,
        canEditStory: value.canEditStory,
        canManageChapters: value.canManageChapters,
        canManageCharacters: value.canManageCharacters,
        canManageCrew: value.canManageCrew,
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
    collaborator: Collaborator,
    capability:
      | 'canEditStory'
      | 'canManageChapters'
      | 'canManageCharacters'
      | 'canManageCrew'
      | 'canManageCollaborators',
    granted: boolean,
  ): void {
    this.runAction(
      this._crewService.updateCollaborator(collaborator.id, {
        [capability]: granted,
      }),
    );
  }

  /**
   * Withdraws an invitation, or removes a collaborator.
   *
   * @param collaborator - The collaboration.
   */
  revoke(collaborator: Collaborator): void {
    this.runAction(this._crewService.revoke(collaborator.id));
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

    action
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
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

    this._crewService
      .getCollaborators(this.storyId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
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
              ? 'You do not have access to this Story.'
              : 'The team could not be loaded. Please try again shortly.';
        },
      });
  }
}
