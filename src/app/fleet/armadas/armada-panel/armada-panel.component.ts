import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { filter, Observable, of, switchMap } from 'rxjs';

import {
  ARMADA_POSITION_LABELS,
  ARMADA_TEXT_LIMIT,
} from 'src/app/fleet/armadas/armada.constants';
import { fleetNamer, fleetsIn } from 'src/app/fleet/armadas/armada.utils';
import { ArmadaTreeComponent } from 'src/app/fleet/armadas/armada-tree/armada-tree.component';
import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  ArmadaNode,
  ArmadaPosition,
  ArmadaView,
  GammaOutcome,
  GammaResolution,
} from 'src/app/models/fleet-armada.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';

/** The Armada the panel is on. */
export interface ArmadaPanelVm {
  readonly communityId: string;
  readonly armadaId: string;
  /** Its name, exactly as recorded. */
  readonly armadaName: string;
  readonly communitySlug: string;
  readonly communityName: string;
  /** Its Requests tab. */
  readonly requestsLink: string[];
}

/** What a manager is doing to one Fleet. */
export interface ArmadaEdit {
  readonly mode: 'MOVE' | 'REMOVE';
  readonly node: ArmadaNode;
}

/** What becomes of one Gamma, as the form holds it. */
export interface GammaChoice {
  readonly outcome: GammaOutcome | '';
  readonly parentFleetId: string;
}

/** What to say when a change failed for a reason the server did not give. */
export const ARMADA_CHANGE_FAILED = 'That did not work. Please try again.';

/** What to say when the shape could not be read. */
export const ARMADA_VIEW_FAILED =
  'Which Fleets are in this Armada could not be read.';

/**
 * Which Fleets are in an Armada, and where, on the Armada's page (FC-026).
 *
 * Anybody who may see the Armada sees its tree. A manager — `armada.manage`
 * at an open Armada — also moves a Fleet or takes it out, each with a reason,
 * and says what becomes of a Beta's Gammas when it stops being one. Taking a
 * Fleet out asks first, through the shared confirmation. A refusal from the
 * server, such as a fourth Beta, is shown as it was given.
 */
@Component({
  selector: 'app-armada-panel',
  templateUrl: './armada-panel.component.html',
  styleUrls: ['./armada-panel.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArmadaTreeComponent, LcarsErrorMessageComponent, RouterLink],
})
export class ArmadaPanelComponent {
  private readonly _armadas = inject(FleetArmadaService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  readonly positionLabels = ARMADA_POSITION_LABELS;
  readonly positions = [
    ArmadaPosition.ALPHA,
    ArmadaPosition.BETA,
    ArmadaPosition.GAMMA,
  ];
  readonly textLimit = ARMADA_TEXT_LIMIT;
  readonly failedMessage = ARMADA_VIEW_FAILED;

  /** The Armada. */
  readonly armada = signal<ArmadaPanelVm | null>(null);

  /** Its shape and what the reader may do, once read. */
  readonly view = signal<ArmadaView | null>(null);

  /** Whether reading it failed. */
  readonly failed = signal(false);

  /** The change being made, if any. */
  readonly editing = signal<ArmadaEdit | null>(null);

  /** Where a moved Fleet goes. */
  readonly position = signal<ArmadaPosition>(ArmadaPosition.BETA);

  /** The Beta it goes under, as a Gamma. */
  readonly parentFleetId = signal('');

  /** The reason typed. */
  readonly reason = signal('');

  /** What becomes of each of the Fleet's Gammas, by Fleet. */
  readonly gammaChoices = signal<Readonly<Record<string, GammaChoice>>>({});

  /** Whether a change is under way. */
  readonly busy = signal(false);

  /** What the last change came to, if made. */
  readonly notice = signal<string | null>(null);

  /** What the last change came to, if refused or failed. */
  readonly error = signal<string | null>(null);

  /** Names the Fleets in view; read only once the shape has been. */
  readonly nameOf = computed(() =>
    fleetNamer(
      fleetsIn((this.view() as ArmadaView).structure),
      (this.armada() as ArmadaPanelVm).communityName,
    ),
  );

  /** The Gammas under the Fleet being changed, when it is a Beta. */
  readonly gammasOfEdited = computed<ArmadaNode[]>(() => {
    const edit = this.editing();

    if (edit === null) {
      return [];
    }

    // A form is only ever open on a shape that has been read.
    const view = this.view() as ArmadaView;

    return [
      ...(view.structure.betas.find(
        beta => beta.fleet.id === edit.node.fleet.id,
      )?.gammas ?? []),
    ];
  });

  /** Whether the change has to say what becomes of those Gammas. */
  readonly needsGammas = computed(() => {
    const edit = this.editing();

    return (
      this.gammasOfEdited().length > 0 &&
      (edit?.mode === 'REMOVE' || this.position() !== ArmadaPosition.BETA)
    );
  });

  /**
   * The Betas a Fleet could go under, the one being changed left out. Read
   * only while a form is open, which is only ever on a shape that was read.
   */
  readonly betaChoices = computed<ArmadaNode[]>(() => {
    const edit = this.editing() as ArmadaEdit;

    return (this.view() as ArmadaView).structure.betas.filter(
      beta => beta.fleet.id !== null && beta.fleet.id !== edit.node.fleet.id,
    );
  });

  /** Whether the form says everything the change needs. */
  readonly ready = computed(() => {
    if (this.reason().trim() === '' || this.busy()) {
      return false;
    }

    if (
      this.editing()?.mode === 'MOVE' &&
      this.position() === ArmadaPosition.GAMMA &&
      this.parentFleetId() === ''
    ) {
      return false;
    }

    return (
      !this.needsGammas() ||
      this.gammasOfEdited().every(gamma => {
        const choice = this.gammaChoices()[gamma.fleet.id as string];

        return (
          choice !== undefined &&
          choice.outcome !== '' &&
          (choice.outcome !== 'GAMMA' || choice.parentFleetId !== '')
        );
      })
    );
  });

  /**
   * The Armada to show. Its shape is read each time it changes.
   */
  @Input({ required: true }) set vm(value: ArmadaPanelVm) {
    this.armada.set(value);
    this.load(value);
  }

  /**
   * Opens the form to move a Fleet.
   *
   * @param node - The Fleet's place.
   */
  onMove(node: ArmadaNode): void {
    this.open({ mode: 'MOVE', node });
    this.position.set(
      node.position === ArmadaPosition.ALPHA
        ? ArmadaPosition.BETA
        : ArmadaPosition.ALPHA,
    );
  }

  /**
   * Opens the form to take a Fleet out.
   *
   * @param node - The Fleet's place.
   */
  onRemove(node: ArmadaNode): void {
    this.open({ mode: 'REMOVE', node });
  }

  /** Closes the form, keeping nothing. */
  onCancel(): void {
    this.editing.set(null);
    this.error.set(null);
  }

  /**
   * Chooses what becomes of one Gamma.
   *
   * @param gamma - The Gamma.
   * @param outcome - What.
   */
  onGammaOutcome(gamma: ArmadaNode, outcome: string): void {
    this.setGamma(gamma, { outcome: outcome as GammaOutcome | '' });
  }

  /**
   * Chooses the Beta a Gamma moves under.
   *
   * @param gamma - The Gamma.
   * @param parentFleetId - The Beta.
   */
  onGammaParent(gamma: ArmadaNode, parentFleetId: string): void {
    this.setGamma(gamma, { parentFleetId });
  }

  /**
   * The choice held for one Gamma.
   *
   * @param gamma - The Gamma.
   * @returns What becomes of it, so far.
   */
  choiceFor(gamma: ArmadaNode): GammaChoice {
    return (
      this.gammaChoices()[gamma.fleet.id as string] ?? {
        outcome: '',
        parentFleetId: '',
      }
    );
  }

  /**
   * Makes the change. Pressing Enter submits the form whatever the button
   * says, so this checks again. Taking a Fleet out asks first.
   */
  onSubmit(): void {
    const edit = this.editing();
    const armada = this.armada() as ArmadaPanelVm;

    if (edit === null || !this.ready()) {
      return;
    }

    const fleetId = edit.node.fleet.id as string;
    const reason = this.reason().trim();
    const gammas = this.needsGammas() ? this.resolutions() : undefined;
    const name = this.nameOf()(edit.node.fleet);

    const agreed: Observable<boolean> =
      edit.mode === 'MOVE'
        ? of(true)
        : this._confirm.askToDestroy({
            title: 'Remove a Fleet',
            question: `Take ${name} out of ${armada.armadaName}?`,
            consequence:
              'Its Owner and Admins are told, with your reason. It can ask ' +
              'to join again.',
            confirmText: 'Remove',
          });

    agreed
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.busy.set(true);
          this.error.set(null);

          return edit.mode === 'MOVE'
            ? this._armadas.move(armada.communityId, armada.armadaId, fleetId, {
                position: this.position(),
                ...(this.position() === ArmadaPosition.GAMMA
                  ? { parentFleetId: this.parentFleetId() }
                  : {}),
                reason,
                ...(gammas === undefined ? {} : { gammas }),
              })
            : this._armadas.remove(
                armada.communityId,
                armada.armadaId,
                fleetId,
                { reason, ...(gammas === undefined ? {} : { gammas }) },
              );
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: view => {
          this.busy.set(false);
          this.view.set(view);
          this.editing.set(null);
          this.notice.set(
            edit.mode === 'MOVE'
              ? `${name} moved.`
              : `${name} was taken out of the Armada.`,
          );
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(recruitmentRefusalOf(error, ARMADA_CHANGE_FAILED));
        },
      });
  }

  /**
   * Reads the Armada's shape.
   *
   * @param armada - The Armada.
   */
  private load(armada: ArmadaPanelVm): void {
    // A form open on the last Armada means nothing on this one.
    this.editing.set(null);
    this.notice.set(null);
    this.error.set(null);
    this.view.set(null);
    this.failed.set(false);
    this._armadas
      .view(armada.communityId, armada.armadaId)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: view => this.view.set(view),
        error: () => this.failed.set(true),
      });
  }

  /**
   * Opens the form for a change.
   *
   * @param edit - What, and to which Fleet.
   */
  private open(edit: ArmadaEdit): void {
    this.editing.set(edit);
    this.parentFleetId.set('');
    this.reason.set('');
    this.gammaChoices.set({});
    this.notice.set(null);
    this.error.set(null);
  }

  /**
   * Changes the choice held for one Gamma.
   *
   * @param gamma - The Gamma.
   * @param change - What changes.
   */
  private setGamma(gamma: ArmadaNode, change: Partial<GammaChoice>): void {
    this.gammaChoices.update(choices => ({
      ...choices,
      [gamma.fleet.id as string]: { ...this.choiceFor(gamma), ...change },
    }));
  }

  /**
   * What becomes of each Gamma, as the server takes it.
   *
   * @returns The resolutions.
   */
  private resolutions(): GammaResolution[] {
    return this.gammasOfEdited().map(gamma => {
      const choice = this.choiceFor(gamma);

      return {
        fleetId: gamma.fleet.id as string,
        outcome: choice.outcome as GammaOutcome,
        ...(choice.outcome === 'GAMMA'
          ? { parentFleetId: choice.parentFleetId }
          : {}),
      };
    });
  }
}
