import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Observable } from 'rxjs';

import {
  ARMADA_POSITION_LABELS,
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
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsPanelComponent } from 'src/app/shared/components/lcars-panel/lcars-panel.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say when a change fails for a reason the server did not give. */
export const FLEET_ARMADA_MOVE_FAILED =
  'That could not be done. Please try again.';

/**
 * Where a Fleet's Owner moves it to another Armada, on its Settings page
 * (FC-057).
 *
 * The Fleet asks while staying where it is: its request waits on the other
 * Armada's managers, and on approval it leaves its old Armada and takes its
 * new place in one change. The panel says where the Fleet sits, offers the
 * other Armadas it could join, and shows an open request with the means to
 * withdraw it. A Fleet in no Armada is sent to its own page, where joining
 * one is asked for.
 */
@Component({
  selector: 'app-fleet-armada-move',
  templateUrl: './fleet-armada-move.component.html',
  styleUrls: ['./fleet-armada-move.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppDatePipe,
    LcarsErrorMessageComponent,
    LcarsPanelComponent,
    RouterLink,
  ],
})
export class FleetArmadaMoveComponent {
  private readonly _armadas = inject(FleetArmadaService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly positionLabels = ARMADA_POSITION_LABELS;
  readonly textLimit = ARMADA_TEXT_LIMIT;

  /** The Community holding the Fleet. */
  readonly communityId = input.required<string>();
  readonly fleetId = input.required<string>();
  readonly fleetName = input.required<string>();
  readonly communitySlug = input.required<string>();
  readonly platformSegment = input.required<string>();
  readonly fleetSlug = input.required<string>();

  /** The Fleet's Armada as the server answers it, or null until read. */
  readonly view = signal<FleetArmadaView | null>(null);

  /** The Armada chosen to move to, by ID, or empty. */
  readonly armadaId = signal('');

  /** What to say to its managers, typed. */
  readonly message = signal('');

  /** Whether a change is under way. */
  readonly busy = signal(false);

  /** What the last change came to, if made. */
  readonly notice = signal<string | null>(null);

  /** What the last change came to, if refused or failed. */
  readonly error = signal<string | null>(null);

  constructor() {
    // Read again whenever the Fleet changes; one that cannot be read shows
    // nothing, since the panel is not what the page is for.
    effect(() => {
      const communityId = this.communityId();
      const fleetId = this.fleetId();

      this.view.set(null);
      this._armadas
        .fleetView(communityId, fleetId)
        .pipe(takeUntilDestroyed(this._destroyRef))
        .subscribe({
          next: view => this.view.set(view),
          error: () => undefined,
        });
    });
  }

  /**
   * An Armada's page.
   *
   * @param armada - The Armada.
   * @returns The router link.
   */
  armadaLink(armada: ArmadaRef): string[] {
    return FLEET_LINKS.armada(
      this.communitySlug(),
      armada.platformSegment,
      armada.slug,
    );
  }

  /**
   * The Fleet's own page, where joining an Armada is asked for.
   *
   * @returns The router link.
   */
  fleetPageLink(): string[] {
    return FLEET_LINKS.fleet(
      this.communitySlug(),
      this.platformSegment(),
      this.fleetSlug(),
    );
  }

  /**
   * A Fleet's page, where the reader may see it.
   *
   * @param fleet - The Fleet.
   * @returns The link, or null for a hidden one.
   */
  fleetLink(fleet: ArmadaFleetRef): string[] | null {
    return fleetLinkOf(fleet, this.communitySlug());
  }

  /**
   * Names a Fleet, or says it is hidden.
   *
   * @param fleet - The Fleet.
   * @returns Its name.
   */
  fleetNameOf(fleet: ArmadaFleetRef): string {
    return fleet.name ?? HIDDEN_FLEET;
  }

  /** Asks to move to the Armada chosen. */
  onRequest(): void {
    const message = this.message().trim();

    if (this.armadaId() === '' || this.busy()) {
      return;
    }

    this.run(
      this._armadas.request(
        this.communityId(),
        this.fleetId(),
        this.armadaId(),
        message === '' ? null : message,
      ),
      'Your request is on its way to the Armada’s managers. The Fleet stays ' +
        'where it is until they approve it.',
    );
  }

  /**
   * Withdraws the open request.
   *
   * @param requestId - The request.
   */
  onWithdraw(requestId: string): void {
    this.run(
      this._armadas.withdraw(this.communityId(), this.fleetId(), requestId),
      'Your request was withdrawn.',
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
        this.armadaId.set('');
        this.message.set('');
        this.notice.set(done);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(recruitmentRefusalOf(error, FLEET_ARMADA_MOVE_FAILED));
      },
    });
  }
}
