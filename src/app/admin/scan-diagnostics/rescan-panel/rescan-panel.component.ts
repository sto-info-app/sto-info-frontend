import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';

import { Observable, take } from 'rxjs';

import {
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';
import {
  RESCAN_COUNT_LABELS,
  RESCAN_KIND_LABELS,
  RESCAN_STATE_LABELS,
  RescanCampaign,
  RescanCampaignKind,
  RescanCampaignState,
  RescanOverview,
  RescanSelection,
} from 'src/app/models/rescan.models';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { RescanAdminService } from './rescan-admin.service';

/** What the panel is showing. */
export type RescanPanelState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR' }
  | { readonly kind: 'READY'; readonly overview: RescanOverview };

/** What a site admin chooses before starting a campaign. */
export interface RescanForm {
  kinds: string[];
  uploadedFrom: string;
  uploadedBefore: string;
  notScannedForDays: string;
  unverifiedOnly: boolean;
  priority: 'HIGH' | 'LOW';
}

/** A campaign action, as the dialog asks about it. */
const ACTIONS = {
  pause: {
    title: 'Pause the campaign',
    message:
      'It stops after the batch under way, and resumes where it stopped.',
    confirmText: 'Pause',
    done: 'Paused.',
  },
  resume: {
    title: 'Resume the campaign',
    message: 'It carries on after the last picture it staged.',
    confirmText: 'Resume',
    done: 'Resumed.',
  },
  cancel: {
    title: 'Cancel the campaign',
    message:
      'It stages nothing more. Rescans already asked for still get their verdicts.',
    confirmText: 'Cancel campaign',
    done: 'Cancelled.',
  },
} as const;

/**
 * Rescan campaigns, on Scan Diagnostics (FC-041).
 *
 * Steve's decisions of 29 September 2026. A site admin rescans a selection
 * of published pictures (by kind, upload date and how long since each was
 * last scanned), behind new uploads, with a reason. Each campaign can be
 * paused, resumed and cancelled. The page shows what each found, by count,
 * and every infection and policy refusal, by asset ID and code only: an
 * infection is taken down, a refusal is left up for a site admin to decide.
 */
@Component({
  selector: 'app-rescan-panel',
  templateUrl: './rescan-panel.component.html',
  styleUrls: [
    '../../news-admin/news-admin.component.scss',
    '../scan-diagnostics.component.scss',
    '../image-estate-panel/image-estate-panel.component.scss',
    './rescan-panel.component.scss',
  ],
  standalone: true,
  imports: [AppDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RescanPanelComponent implements OnInit {
  private readonly _rescans = inject(RescanAdminService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  readonly kindLabels = RESCAN_KIND_LABELS;
  readonly kinds = Object.keys(RESCAN_KIND_LABELS);
  readonly stateLabels = RESCAN_STATE_LABELS;
  readonly countLabels = RESCAN_COUNT_LABELS;
  readonly legacy = RescanCampaignKind.LEGACY;

  readonly state = signal<RescanPanelState>({ kind: 'LOADING' });
  readonly message = signal<string | null>(null);
  readonly failure = signal<string | null>(null);
  readonly form = signal<RescanForm>({
    kinds: [],
    uploadedFrom: '',
    uploadedBefore: '',
    notScannedForDays: '',
    unverifiedOnly: false,
    priority: 'LOW',
  });

  /**
   * Reads the campaigns on arrival.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Reads the campaigns.
   */
  load(): void {
    this._rescans
      .overview()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: overview => this.state.set({ kind: 'READY', overview }),
        error: () => this.state.set({ kind: 'ERROR' }),
      });
  }

  /**
   * Changes one field of the form.
   *
   * @param field - Which.
   * @param value - What to.
   */
  set<K extends keyof RescanForm>(field: K, value: RescanForm[K]): void {
    this.form.update(form => ({ ...form, [field]: value }));
  }

  /**
   * Ticks or unticks a kind.
   *
   * @param kind - The kind.
   * @param ticked - Whether it is ticked now.
   */
  toggleKind(kind: string, ticked: boolean): void {
    this.form.update(form => ({
      ...form,
      kinds: ticked
        ? [...form.kinds, kind]
        : form.kinds.filter(each => each !== kind),
    }));
  }

  /**
   * The counts of a campaign, in words.
   *
   * @param campaign - The campaign.
   * @returns Each count, labelled.
   */
  countsOf(campaign: RescanCampaign): { label: string; count: number }[] {
    return Object.entries(campaign.counts).map(([key, count]) => ({
      label: this.countLabels[key] ?? key,
      count,
    }));
  }

  /**
   * Whether a campaign is still open.
   *
   * @param campaign - The campaign.
   * @returns True while it can be paused, resumed or cancelled.
   */
  isOpen(campaign: RescanCampaign): boolean {
    return (
      campaign.state !== RescanCampaignState.DONE &&
      campaign.state !== RescanCampaignState.CANCELLED
    );
  }

  /**
   * Starts a campaign with the form's selection, once a reason is given.
   */
  start(): void {
    const selection = this.selection();

    this.askReason(
      'Start a rescan campaign',
      'Every picture the selection covers is copied for the scanner and rescanned, behind new uploads. An infected picture is taken down; one refused for policy stays up and is listed here.',
      'Start',
      reason =>
        this.run(
          this._rescans.start(selection, reason),
          'Campaign started. Refresh to follow it.',
        ),
    );
  }

  /**
   * Pauses, resumes or cancels a campaign, once a reason is given.
   *
   * @param campaign - The campaign.
   * @param action - Which.
   */
  act(campaign: RescanCampaign, action: keyof typeof ACTIONS): void {
    const copy = ACTIONS[action];

    this.askReason(copy.title, copy.message, copy.confirmText, reason =>
      this.run(this._rescans.act(campaign.id, action, reason), copy.done),
    );
  }

  /**
   * The selection the form describes: only what was filled in.
   *
   * @returns It.
   */
  private selection(): RescanSelection {
    const form = this.form();
    const days = Number.parseInt(form.notScannedForDays, 10);

    return {
      ...(form.kinds.length > 0 ? { kinds: [...form.kinds] } : {}),
      ...(form.uploadedFrom
        ? { uploadedFrom: new Date(form.uploadedFrom).toISOString() }
        : {}),
      ...(form.uploadedBefore
        ? { uploadedBefore: new Date(form.uploadedBefore).toISOString() }
        : {}),
      ...(Number.isNaN(days) ? {} : { notScannedForDays: days }),
      ...(form.unverifiedOnly ? { unverifiedOnly: true } : {}),
      priority: form.priority,
    };
  }

  /**
   * Sends an action, says how it went and reads the campaigns again.
   *
   * @param action - The request.
   * @param success - What to say when it works.
   */
  private run(action: Observable<unknown>, success: string): void {
    this.message.set(null);
    this.failure.set(null);
    action.pipe(take(1), takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        this.message.set(success);
        this.load();
      },
      error: (error: unknown) => {
        const said =
          error instanceof HttpErrorResponse
            ? (error.error as { message?: unknown } | null)?.message
            : undefined;

        this.failure.set(
          typeof said === 'string'
            ? said
            : 'That could not be done. Please try again.',
        );
      },
    });
  }

  /**
   * Asks why, and goes on with the reason once one is given. The reason is
   * kept in the site admin log.
   *
   * @param title - The dialog's title.
   * @param message - What is about to happen.
   * @param confirmText - The button.
   * @param onConfirm - Invoked with the reason.
   */
  private askReason(
    title: string,
    message: string,
    confirmText: string,
    onConfirm: (reason: string) => void,
  ): void {
    this._dialog
      .open<
        GovernanceReasonDialogComponent,
        GovernanceReasonDialogData,
        string
      >(GovernanceReasonDialogComponent, {
        width: '75%',
        data: {
          title,
          message,
          label: 'Reason',
          confirmText,
          max: ADMIN_REASON_MAX_LENGTH,
        },
      })
      .afterClosed()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe(reason => {
        if (reason) {
          onConfirm(reason);
        }
      });
  }
}
