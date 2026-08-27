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
import { ArcCollaborator } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ArcService } from '../../arc.service';
import { CollaboratorPanelComponent } from '../../shared/collaborator-panel/collaborator-panel.component';
import { StorytimeActionRunner } from '../../shared/storytime-action.runner';
import { ARC_COLLABORATOR_CAPABILITIES } from '../../storytime.constants';

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
    RouterModule,
    LcarsErrorMessageComponent,
    CollaboratorPanelComponent,
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

  /**
   * The capabilities an Arc invitation may grant.
   *
   * Read from the constant rather than written out in the template, so the
   * invitation form and the switches on an existing collaborator cannot end up
   * offering different things.
   */
  readonly capabilities = ARC_COLLABORATOR_CAPABILITIES;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _arcService = inject(ArcService);
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
   * Sends an invitation.
   */
  invite(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this._actions.run(
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
    capability: string,
    granted: boolean,
  ): void {
    this._actions.run(
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
    this._actions.run(this._arcService.revokeArcCollaboration(collaborator.id));
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
              ? 'You do not have access to this Arc.'
              : 'The team could not be loaded. Please try again shortly.';
        },
      });
  }
}
