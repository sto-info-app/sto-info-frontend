import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParamMap, Router } from '@angular/router';

import { forkJoin, map, Observable } from 'rxjs';

import {
  ARMADA_MANAGE_CAPABILITY,
  ARMADA_POSITION_LABELS,
  ARMADA_REQUEST_STATUS_LABELS,
  ARMADA_TEXT_LIMIT,
  HIDDEN_FLEET,
} from 'src/app/fleet/armadas/armada.constants';
import {
  ArmadaSection,
  ArmadaSectionPageDirective,
} from 'src/app/fleet/armadas/armada-section-page.directive';
import { ArmadaTabsComponent } from 'src/app/fleet/armadas/armada-tabs/armada-tabs.component';
import { FleetArmadaService } from 'src/app/fleet/armadas/fleet-armada.service';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  ArmadaFleetRef,
  ArmadaPosition,
  ArmadaRequest,
  ArmadaRequestPage,
  ArmadaRequestStatus,
  ArmadaView,
} from 'src/app/models/fleet-armada.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What to say to somebody who may not answer requests. */
export const ARMADA_REQUESTS_NOT_PERMITTED =
  'Answering requests to join is for the Armada’s managers.';

/** What to say when an answer failed for a reason the server did not give. */
export const ARMADA_ANSWER_FAILED = 'That did not work. Please try again.';

/** An Armada's requests, its shape, and the Armada. */
export interface ArmadaRequestsData {
  readonly section: ArmadaSection;
  readonly status: ArmadaRequestStatus;
  readonly page: ArmadaRequestPage;
  readonly view: ArmadaView;
}

/** What a manager is doing to one request. */
export interface ArmadaAnswer {
  readonly mode: 'APPROVE' | 'REJECT';
  readonly request: ArmadaRequest;
}

/**
 * An Armada's requests to join, for its managers (FC-026).
 *
 * Open ones by default, and any status on asking, a page at a time.
 * Approving asks where the Fleet goes — Alpha, Beta, or a Gamma under one of the Betas — and a
 * rejection asks why, which the requesting Fleet is shown. The server checks
 * the room, the platform and the allegiance, and its refusal is shown as it
 * was given.
 */
@Component({
  selector: 'app-armada-requests',
  templateUrl: './armada-requests.component.html',
  styleUrls: ['./armada-requests.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    AppDatePipe,
    ArmadaTabsComponent,
    FleetPageShellComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ArmadaRequestsComponent extends ArmadaSectionPageDirective<ArmadaRequestsData> {
  private readonly _router = inject(Router);
  private readonly _armadas = inject(FleetArmadaService);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = ARMADA_REQUESTS_NOT_PERMITTED;
  readonly statusLabels = ARMADA_REQUEST_STATUS_LABELS;
  readonly positionLabels = ARMADA_POSITION_LABELS;
  readonly statuses = Object.values(ArmadaRequestStatus);
  readonly positions = Object.values(ArmadaPosition);
  readonly textLimit = ARMADA_TEXT_LIMIT;

  protected readonly _requiredCapabilities = [ARMADA_MANAGE_CAPABILITY];

  /** The answer being given, if any. */
  readonly answering = signal<ArmadaAnswer | null>(null);

  /** Where an approved Fleet goes. */
  readonly position = signal<ArmadaPosition>(ArmadaPosition.BETA);

  /** The Beta it goes under, as a Gamma. */
  readonly parentFleetId = signal('');

  /** The rejection's reason. */
  readonly reason = signal('');

  /** Whether an answer is under way. */
  readonly busy = signal(false);

  /** What the last answer came to, if given. */
  readonly notice = signal<string | null>(null);

  /** What the last answer came to, if refused or failed. */
  readonly error = signal<string | null>(null);

  /**
   * Names a Fleet, or says it is hidden.
   *
   * @param fleet - The Fleet.
   * @returns Its name.
   */
  fleetName(fleet: ArmadaFleetRef): string {
    return fleet.name ?? HIDDEN_FLEET;
  }

  /**
   * Shows the requests in another status.
   *
   * @param status - The status.
   */
  onStatus(status: string): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      // Another status starts from its first page.
      queryParams: {
        status: status === ArmadaRequestStatus.PENDING ? null : status,
        page: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * How many pages of requests there are.
   *
   * @param page - The page shown.
   * @returns The count, 0 when there is nothing.
   */
  totalPages(page: ArmadaRequestPage): number {
    return page.pageSize > 0 ? Math.ceil(page.total / page.pageSize) : 0;
  }

  /**
   * Shows another page of requests.
   *
   * @param page - The page, from 1.
   */
  onPage(page: number): void {
    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Opens a form to answer a request.
   *
   * @param mode - Approve or reject.
   * @param request - The request.
   */
  onAnswer(mode: ArmadaAnswer['mode'], request: ArmadaRequest): void {
    this.answering.set({ mode, request });
    this.position.set(ArmadaPosition.BETA);
    this.parentFleetId.set('');
    this.reason.set('');
    this.notice.set(null);
    this.error.set(null);
  }

  /** Closes the form. */
  onCancel(): void {
    this.answering.set(null);
  }

  /**
   * Whether the answer form says all it needs.
   *
   * @returns True when it may be sent.
   */
  ready(): boolean {
    const answer = this.answering();

    if (answer === null || this.busy()) {
      return false;
    }

    return answer.mode === 'REJECT'
      ? this.reason().trim() !== ''
      : this.position() !== ArmadaPosition.GAMMA || this.parentFleetId() !== '';
  }

  /**
   * Sends the answer. Pressing Enter submits the form whatever the button
   * says, so this checks again.
   *
   * @param data - The page.
   */
  onSubmit(data: ArmadaRequestsData): void {
    const answer = this.answering();

    if (answer === null || !this.ready()) {
      return;
    }

    const { communityId, armadaId } = data.section;
    const name = this.fleetName(answer.request.fleet);

    this.busy.set(true);
    this.error.set(null);
    (answer.mode === 'APPROVE'
      ? this._armadas.approve(communityId, armadaId, answer.request.id, {
          position: this.position(),
          ...(this.position() === ArmadaPosition.GAMMA
            ? { parentFleetId: this.parentFleetId() }
            : {}),
        })
      : this._armadas.reject(
          communityId,
          armadaId,
          answer.request.id,
          this.reason().trim(),
        )
    )
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.answering.set(null);
          this.notice.set(
            answer.mode === 'APPROVE'
              ? `${name} joined the Armada.`
              : `The request from ${name} was rejected.`,
          );
          this.reload();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(recruitmentRefusalOf(error, ARMADA_ANSWER_FAILED));
        },
      });
  }

  /**
   * Reads the requests the address asks for, and the Armada's shape.
   *
   * @param section - The Armada.
   * @param query - The address's query.
   * @returns Both, with the Armada.
   */
  protected load(
    section: ArmadaSection,
    query: ParamMap,
  ): Observable<ArmadaRequestsData> {
    const asked = query.get('status') as ArmadaRequestStatus | null;
    const status =
      asked !== null && this.statuses.includes(asked)
        ? asked
        : ArmadaRequestStatus.PENDING;
    const page = Number(query.get('page'));

    return forkJoin({
      page: this._armadas.requests(
        section.communityId,
        section.armadaId,
        status,
        Number.isInteger(page) && page > 1 ? page : 1,
      ),
      view: this._armadas.view(section.communityId, section.armadaId),
    }).pipe(map(({ page, view }) => ({ section, status, page, view })));
  }
}
