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

import { take } from 'rxjs';

import {
  GovernanceReasonDialogComponent,
  GovernanceReasonDialogData,
} from 'src/app/fleet/governance/governance-reason-dialog/governance-reason-dialog.component';
import { FeatureSwitchState } from 'src/app/models/feature-switches.models';
import { ADMIN_REASON_MAX_LENGTH } from 'src/app/models/moderation.models';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

import { FeatureSwitchesAdminService } from './feature-switches-admin.service';

/** What the panel is showing. */
export type FeatureSwitchesState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'ERROR' }
  | {
      readonly kind: 'READY';
      readonly switches: readonly FeatureSwitchState[];
    };

/** What to say when a change fails and the server gave no reason. */
export const FEATURE_SWITCH_ERROR = 'That could not be done. Please try again.';

/**
 * Who last changed a switch, in words.
 *
 * @param entry - The switch.
 * @returns Their username, or "Not recorded" when a migration or SQL set
 *   it, or their account has gone.
 */
export function changedByOf(entry: FeatureSwitchState): string {
  return entry.changedByUsername ?? 'Not recorded';
}

/**
 * What the dialog says before a feature is switched.
 *
 * @param entry - The switch, as the page shows it.
 * @returns The dialog's title, message and button.
 */
export function switchCopy(entry: FeatureSwitchState): {
  readonly title: string;
  readonly message: string;
  readonly confirmText: string;
} {
  const { label } = entry;

  if (entry.isEnabled) {
    return {
      title: `Switch ${label} off`,
      message:
        `Within ten seconds every page and route ${label} has disappears ` +
        'for everybody, as though it did not exist. Nothing it holds is ' +
        'deleted, and switching it on again brings it all back. Uploads are ' +
        'still scanned and published.',
      confirmText: 'Switch off',
    };
  }

  return {
    title: `Switch ${label} on`,
    message:
      `Within ten seconds ${label} is open to everybody, as far as the ` +
      'capability flags beneath it allow.',
    confirmText: 'Switch on',
  };
}

/**
 * What to say once a feature is switched, as the server now has it.
 *
 * @param entry - The switch, as the server now has it.
 * @returns The sentence.
 */
export function switchOutcome(entry: FeatureSwitchState): string {
  return (
    `${entry.label} switched ${entry.isEnabled ? 'on' : 'off'}. Pages ` +
    'already open in a browser show it once they are reloaded.'
  );
}

/**
 * The site features' master switches, on the Admin page (FC-045).
 *
 * Steve's decisions of 6 October 2026: Fleet Communities, Storytime and
 * Custom Tracking are each switched here rather than with SQL; each change
 * asks for a reason, kept in the Security Log; and the capability flags
 * beneath each, which the environment sets, are shown but cannot be changed.
 */
@Component({
  selector: 'app-feature-switches',
  templateUrl: './feature-switches.component.html',
  styleUrls: ['./feature-switches.component.scss'],
  standalone: true,
  imports: [AppDatePipe, HelpLinkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureSwitchesComponent implements OnInit {
  private readonly _switches = inject(FeatureSwitchesAdminService);
  private readonly _dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  readonly state = signal<FeatureSwitchesState>({ kind: 'LOADING' });
  readonly message = signal<string | null>(null);
  readonly failure = signal<string | null>(null);

  readonly changedBy = changedByOf;

  /**
   * Reads the switches on arrival.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Reads the switches.
   */
  load(): void {
    this._switches
      .list()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: switches => this.state.set({ kind: 'READY', switches }),
        error: () => this.state.set({ kind: 'ERROR' }),
      });
  }

  /**
   * Switches a feature the other way, once a reason is given.
   *
   * @param entry - The switch, as the page shows it.
   */
  toggle(entry: FeatureSwitchState): void {
    const copy = switchCopy(entry);

    this._dialog
      .open<
        GovernanceReasonDialogComponent,
        GovernanceReasonDialogData,
        string
      >(GovernanceReasonDialogComponent, {
        width: '75%',
        data: {
          title: copy.title,
          message: copy.message,
          label: 'Reason',
          confirmText: copy.confirmText,
          max: ADMIN_REASON_MAX_LENGTH,
        },
      })
      .afterClosed()
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe(reason => {
        if (reason) {
          this.send(entry, reason);
        }
      });
  }

  /**
   * Sends the change, and shows the switch as the server now has it.
   *
   * @param entry - The switch, as the page showed it.
   * @param reason - Why.
   */
  private send(entry: FeatureSwitchState, reason: string): void {
    this.message.set(null);
    this.failure.set(null);
    this._switches
      .set(entry.feature, !entry.isEnabled, reason)
      .pipe(take(1), takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: changed => {
          const current = this.state();

          if (current.kind === 'READY') {
            this.state.set({
              kind: 'READY',
              switches: current.switches.map(each =>
                each.feature === changed.feature ? changed : each,
              ),
            });
          }

          this.message.set(switchOutcome(changed));
        },
        error: (error: unknown) => {
          const said =
            error instanceof HttpErrorResponse
              ? (error.error as { message?: unknown } | null)?.message
              : undefined;

          this.failure.set(
            typeof said === 'string' ? said : FEATURE_SWITCH_ERROR,
          );
          this.load();
        },
      });
  }
}
