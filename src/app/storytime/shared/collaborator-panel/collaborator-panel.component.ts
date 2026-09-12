import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CollaborationInvitationStatus } from 'src/app/models/storytime.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { COLLABORATION_STATUS_LABELS } from '../../storytime.constants';

/** The part of a collaboration this panel shows, whatever it is on. */
export interface CollaborationSummary {
  /** The collaboration itself. */
  id: string;

  /** Who is collaborating. */
  userId: string;

  /** What the owner calls them in the credits, if anything. */
  collaborationRole: string | null;

  /** Whether they have answered yet. */
  invitationStatus: CollaborationInvitationStatus;
}

/** One capability an invitation may grant. */
export interface CollaborationCapability {
  /** The field on the collaboration it sets. */
  key: string;

  /** How it is described to whoever is granting it. */
  label: string;
}

/** A request to turn one collaborator's capability on or off. */
export interface CapabilityChange<T> {
  /** The collaboration being changed. */
  collaborator: T;

  /** The capability to change. */
  capability: string;

  /** Whether it should now be granted. */
  granted: boolean;
}

/**
 * Inviting people to help, and saying what each of them may do.
 *
 * A Story's crew and an Arc's curators are the same arrangement over different
 * work: somebody is invited, they answer, and until they do they can change
 * nothing. Both are shown here so that the two cannot come to describe the
 * same arrangement differently — which capabilities exist is the caller's
 * business, but what an invitation means is not.
 *
 * There is no control for publishing, on either. Only the owner may publish,
 * so offering a switch that could never be turned on would be worse than
 * saying nothing.
 */
@Component({
  selector: 'app-collaborator-panel',
  templateUrl: './collaborator-panel.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoadingBarComponent,
    LcarsToggleComponent,
  ],
})
export class CollaboratorPanelComponent<T extends CollaborationSummary> {
  /** What to prefix the field identifiers with, so a page may hold two. */
  @Input({ required: true }) idPrefix!: string;

  /** The invitation form, holding a control per capability. */
  @Input({ required: true }) form!: FormGroup;

  /** The capabilities an invitation may grant. */
  @Input({ required: true }) capabilities: readonly CollaborationCapability[] =
    [];

  /** The collaborations, invitations included. */
  @Input({ required: true }) collaborators: readonly T[] = [];

  /** Whether the list is still loading. */
  @Input({ required: true }) isLoading = false;

  /** What to say when nobody is collaborating yet. */
  @Input({ required: true }) emptyMessage!: string;

  /** Asks for the invitation on the form to be sent. */
  @Output() readonly invited = new EventEmitter<void>();

  /** Asks for one collaborator's capability to be changed. */
  @Output() readonly capabilityChanged = new EventEmitter<
    CapabilityChange<T>
  >();

  /**
   * Asks for an invitation to be withdrawn, or a collaborator removed.
   *
   * Emitted only once whoever pressed the button has confirmed it. The
   * question is asked here rather than by each caller, so a Story's crew and
   * an Arc's curators cannot come to ask it differently — or, as they did
   * before, not ask it at all.
   */
  @Output() readonly revoked = new EventEmitter<T>();

  /** Status labels, so a raw enum value is never shown. */
  readonly statusLabels = COLLABORATION_STATUS_LABELS;

  private readonly _confirm = new ConfirmPrompt();

  /**
   * Asks before withdrawing an invitation or removing a collaborator.
   *
   * The two are different enough to be worth wording separately: withdrawing
   * an invitation takes away something nobody has accepted yet, while removing
   * a collaborator takes access away from somebody who has been using it.
   *
   * @param collaborator - The collaboration to end.
   */
  confirmRevoke(collaborator: T): void {
    const pending = this.isPending(collaborator);

    this._confirm
      .askToDestroy({
        title: pending ? 'Withdraw invitation' : 'Remove collaborator',
        question: pending
          ? 'Are you sure you want to withdraw this invitation?'
          : 'Are you sure you want to remove this collaborator?',
        subject: collaborator.collaborationRole ?? collaborator.userId,
        consequence: pending
          ? 'They will not be able to accept it, and inviting them again means sending a new one.'
          : 'They lose access straight away, and getting them back means inviting them again.',
        confirmText: pending ? 'Withdraw' : 'Remove',
        cancelText: 'Keep it',
      })
      .subscribe(confirmed => {
        if (confirmed) {
          this.revoked.emit(collaborator);
        }
      });
  }

  /**
   * Whether a collaboration is waiting on an answer.
   *
   * @param collaborator - The collaboration.
   * @returns True while it is still an invitation.
   */
  isPending(collaborator: T): boolean {
    return (
      collaborator.invitationStatus === CollaborationInvitationStatus.INVITED
    );
  }

  /**
   * Whether a collaborator currently has a capability.
   *
   * @param collaborator - The collaboration.
   * @param capability - The capability to read.
   * @returns True when it is granted.
   */
  isGranted(collaborator: T, capability: string): boolean {
    return (collaborator as unknown as Record<string, boolean>)[capability];
  }
}
