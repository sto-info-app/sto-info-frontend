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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { Collaborator } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { CrewService } from '../../crew.service';
import { CollaboratorPanelComponent } from '../../shared/collaborator-panel/collaborator-panel.component';
import { StorytimeActionRunner } from '../../shared/storytime-action.runner';
import { COLLABORATOR_CAPABILITIES } from '../../storytime.constants';

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
    RouterModule,
    LcarsErrorMessageComponent,
    CollaboratorPanelComponent,
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

  /**
   * The capabilities an invitation may grant.
   *
   * Read from the constant rather than written out in the template, so the
   * invitation form and the switches on an existing collaborator cannot end up
   * offering different things.
   */
  readonly capabilities = COLLABORATOR_CAPABILITIES;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _crewService = inject(CrewService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _actions = new StorytimeActionRunner(this, () =>
    this.load(),
  );

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
   * Sends an invitation.
   */
  invite(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this._actions.run(
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
    capability: string,
    granted: boolean,
  ): void {
    this._actions.run(
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
    this._actions.run(this._crewService.revoke(collaborator.id));
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
