import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { filter, Observable } from 'rxjs';

import {
  ARMADA_POSITION_LABELS,
  ARMADA_REQUEST_STATUS_LABELS,
  ARMADA_TEXT_LIMIT,
  HIDDEN_FLEET,
} from 'src/app/fleet/armadas/armada.constants';
import { fleetLinkOf } from 'src/app/fleet/armadas/armada.utils';
import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  ArmadaFleetRef,
  ArmadaRef,
  FleetArmadaView,
} from 'src/app/models/fleet-armada.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** The Fleet the panel is on. */
export interface FleetArmadaPanelVm {
  readonly communityId: string;
  readonly fleetId: string;
  /** Its name, exactly as recorded. */
  readonly fleetName: string;
  readonly communitySlug: string;
}

/** What to say when a change failed for a reason the server did not give. */
export const FLEET_ARMADA_FAILED = 'That did not work. Please try again.';

/**
 * A Fleet's Armada, on the Fleet's page (FC-026).
 *
 * Anybody who may see the Fleet sees which Armada it is in and where. Its
 * `armada.request` holders — the Owner and Admins, and Officers they trust
 * with it — also ask to join one, withdraw the request, see how the last one
 * was answered, and take the Fleet out, with a reason and after confirming.
 * A Beta with Gammas under it cannot leave on its own: an Armada manager has
 * to move or remove its Gammas first, and the panel says so.
 */
@Component({
  selector: 'app-fleet-armada-panel',
  templateUrl: './fleet-armada-panel.component.html',
  styleUrls: ['./fleet-armada-panel.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDatePipe, LcarsErrorMessageComponent, RouterLink],
})
export class FleetArmadaPanelComponent {
  private readonly _armadas = inject(FleetArmadaService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _confirm = new ConfirmPrompt();

  readonly positionLabels = ARMADA_POSITION_LABELS;
  readonly statusLabels = ARMADA_REQUEST_STATUS_LABELS;
  readonly textLimit = ARMADA_TEXT_LIMIT;

  /** The Fleet. */
  readonly fleet = signal<FleetArmadaPanelVm | null>(null);

  /** Its Armada, once read. */
  readonly view = signal<FleetArmadaView | null>(null);

  /** The Armada chosen to ask. */
  readonly armadaId = signal('');

  /** The message typed. */
  readonly message = signal('');

  /** Whether the leaving form is open. */
  readonly leaving = signal(false);

  /** The reason for leaving, typed. */
  readonly reason = signal('');

  /** Whether a change is under way. */
  readonly busy = signal(false);

  /** What the last change came to, if made. */
  readonly notice = signal<string | null>(null);

  /** What the last change came to, if refused or failed. */
  readonly error = signal<string | null>(null);

  /**
   * The Fleet to show. Its Armada is read each time it changes; one that
   * cannot be read shows nothing, since the panel is not what the page is
   * for.
   */
  @Input({ required: true }) set vm(value: FleetArmadaPanelVm) {
    this.fleet.set(value);
    this.view.set(null);
    this._armadas
      .fleetView(value.communityId, value.fleetId)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({ next: view => this.view.set(view), error: () => undefined });
  }

  /**
   * An Armada's page.
   *
   * @param armada - The Armada.
   * @returns The router link.
   */
  armadaLink(armada: ArmadaRef): string[] {
    return FLEET_LINKS.armada(
      (this.fleet() as FleetArmadaPanelVm).communitySlug,
      armada.platformSegment,
      armada.slug,
    );
  }

  /**
   * A Fleet's page, where the reader may see it.
   *
   * @param fleet - The Fleet.
   * @returns The link, or null for a hidden one.
   */
  fleetLink(fleet: ArmadaFleetRef): string[] | null {
    return fleetLinkOf(
      fleet,
      (this.fleet() as FleetArmadaPanelVm).communitySlug,
    );
  }

  /**
   * Names a Fleet, or says it is hidden.
   *
   * @param fleet - The Fleet.
   * @returns Its name.
   */
  fleetName(fleet: ArmadaFleetRef): string {
    return fleet.name ?? HIDDEN_FLEET;
  }

  /** Asks to join the Armada chosen. */
  onRequest(): void {
    const fleet = this.fleet() as FleetArmadaPanelVm;
    const message = this.message().trim();

    if (this.armadaId() === '' || this.busy()) {
      return;
    }

    this.run(
      this._armadas.request(
        fleet.communityId,
        fleet.fleetId,
        this.armadaId(),
        message === '' ? null : message,
      ),
      'Your request is on its way to the Armada’s managers.',
    );
  }

  /**
   * Withdraws the open request.
   *
   * @param requestId - The request.
   */
  onWithdraw(requestId: string): void {
    const fleet = this.fleet() as FleetArmadaPanelVm;

    this.run(
      this._armadas.withdraw(fleet.communityId, fleet.fleetId, requestId),
      'Your request was withdrawn.',
    );
  }

  /** Opens the leaving form. */
  onLeave(): void {
    this.leaving.set(true);
    this.reason.set('');
    this.notice.set(null);
    this.error.set(null);
  }

  /** Closes the leaving form. */
  onKeep(): void {
    this.leaving.set(false);
  }

  /**
   * Takes the Fleet out of its Armada, after confirming. Pressing Enter
   * submits the form whatever the button says, so this checks again.
   *
   * @param armada - The Armada it is leaving.
   */
  onConfirmLeave(armada: ArmadaRef): void {
    const fleet = this.fleet() as FleetArmadaPanelVm;
    const reason = this.reason().trim();

    if (reason === '' || this.busy()) {
      return;
    }

    this._confirm
      .askToDestroy({
        title: 'Leave the Armada',
        question: `Take ${fleet.fleetName} out of ${armada.name}?`,
        consequence:
          'Its members stop being the Armada’s members, and joining again ' +
          'takes a new request.',
        confirmText: 'Leave',
      })
      .pipe(filter(Boolean), takeUntilDestroyed(this._destroyRef))
      .subscribe(() =>
        this.run(
          this._armadas.leave(fleet.communityId, fleet.fleetId, reason),
          `${fleet.fleetName} has left ${armada.name}.`,
        ),
      );
  }

  /**
   * Makes a change and shows its outcome.
   *
   * @param change - The request.
   * @param done - What to say once it is made.
   */
  private run(change: Observable<FleetArmadaView>, done: string): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    change.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: view => {
        this.busy.set(false);
        this.view.set(view);
        this.leaving.set(false);
        this.armadaId.set('');
        this.message.set('');
        this.notice.set(done);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(recruitmentRefusalOf(error, FLEET_ARMADA_FAILED));
      },
    });
  }
}
