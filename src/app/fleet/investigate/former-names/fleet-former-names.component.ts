import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { filter, map, Observable, switchMap } from 'rxjs';

import { UserSettingsService } from 'src/app/dashboard/services/user-settings.service';
import { FleetExactNameComponent } from 'src/app/fleet/components/fleet-exact-name/fleet-exact-name.component';
import { FleetPageShellComponent } from 'src/app/fleet/components/fleet-page-shell/fleet-page-shell.component';
import { FleetTabsComponent } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import {
  RosterIdentityDecisionDialogComponent,
  RosterIdentityDecisionDialogData,
  RosterIdentityDecisionDialogResult,
} from 'src/app/fleet/identities/roster-identity-decision-dialog/roster-identity-decision-dialog.component';
import {
  ROSTER_INVESTIGATION_READERS,
  ROSTER_READ_ONLY_NOTE,
} from 'src/app/fleet/imports/roster-import.constants';
import {
  EXACT_GAME_NAME_MAX_CODEPOINTS,
  EXACT_GAME_NAME_TOO_LONG,
  inputCeilingFor,
  maxCodepointsValidator,
} from 'src/app/fleet/fleet-name-length';
import {
  FleetSection,
  FleetSectionPageDirective,
} from 'src/app/fleet/scope/fleet-section-page.directive';
import {
  FleetFormerName,
  FleetFormerNameList,
} from 'src/app/models/fleet-former-name.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import {
  startOfLocalDay,
  startOfNextLocalDay,
} from 'src/app/shared/utils/zoned-day.utils';

import { FleetFormerNameService } from './fleet-former-name.service';

/** What to say to somebody who may not read a Fleet's former names. */
export const FLEET_FORMER_NAMES_NOT_PERMITTED =
  'Recording this Fleet’s former names is for its roster investigators.';

/** What to say when a name could not be recorded for a reason not given. */
export const FLEET_FORMER_NAME_RECORD_FAILED =
  'That name could not be recorded. Please try again.';

/** What to say once a name is recorded. */
export const FLEET_FORMER_NAME_RECORDED =
  'Recorded. An export named for it, and taken while it was in use, now ' +
  'matches this Fleet.';

/** What to say when a name could not be removed for a reason not given. */
export const FLEET_FORMER_NAME_REMOVE_FAILED =
  'That name could not be removed. Please try again.';

/** What to say when the name to remove is no longer there to remove. */
export const FLEET_FORMER_NAME_GONE =
  'That name is no longer recorded, so there was nothing to remove.';

/** What to say once a name is removed. */
export const FLEET_FORMER_NAME_REMOVED =
  'Removed. Imports that matched it keep their match, and it matches ' +
  'nothing new.';

/** Who recorded or removed a name, once their account is gone. */
export const FLEET_FORMER_NAME_ACTOR_GONE = 'an account since closed';

/** The most a reason may say, as the server allows. */
export const FLEET_FORMER_NAME_REASON_LIMIT = 500;

/** What the removal dialog says will happen. */
const REMOVAL_DIALOG: RosterIdentityDecisionDialogData = {
  title: 'Remove this former name',
  message:
    '<p>Imports that already matched it keep their match, and it matches ' +
    'nothing new.</p>' +
    '<p>It stays listed under Removed names, with who removed it and why.</p>',
  confirmText: 'Remove',
  reasonRequired: true,
};

/** A Fleet's former names, and the Fleet. */
export interface FleetFormerNamesData {
  readonly section: FleetSection;
  readonly list: FleetFormerNameList;
}

/**
 * The names a Fleet was known by before it was renamed in game, for its
 * roster investigators to record (FC-050).
 *
 * An export's filename names the Fleet as it was when the export was taken,
 * so an export from before a rename names a Fleet that no longer answers.
 * A former name recorded here, with the days it was used, lets it match.
 * Nothing is ever learned from a file: a name is used only once somebody
 * records it.
 *
 * The name is kept exactly as typed, edge spaces included (ADR-0003). The
 * days are the reader's, in their display timezone: a name is used from the
 * start of its first day to the end of its last, which the server is sent as
 * the start of the day after.
 *
 * Removing a name keeps it, with who removed it and why, beneath the names in
 * use. A site admin looking in reads both and changes neither (FC-036).
 */
@Component({
  selector: 'app-fleet-former-names',
  templateUrl: './fleet-former-names.component.html',
  styleUrls: ['./fleet-former-names.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    AppDatePipe,
    FleetExactNameComponent,
    FleetPageShellComponent,
    FleetTabsComponent,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class FleetFormerNamesComponent extends FleetSectionPageDirective<FleetFormerNamesData> {
  private readonly _formerNames = inject(FleetFormerNameService);
  private readonly _settings = inject(UserSettingsService);
  private readonly _dialog = inject(MatDialog);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);

  readonly notPermittedMessage = FLEET_FORMER_NAMES_NOT_PERMITTED;
  readonly readOnlyNote = ROSTER_READ_ONLY_NOTE;
  readonly actorGone = FLEET_FORMER_NAME_ACTOR_GONE;
  readonly nameMaxLength = inputCeilingFor(EXACT_GAME_NAME_MAX_CODEPOINTS);

  /** Shown when the name is over the server's budget. */
  readonly nameTooLong = EXACT_GAME_NAME_TOO_LONG;
  readonly reasonLimit = FLEET_FORMER_NAME_REASON_LIMIT;

  protected readonly _requiredCapabilities = ROSTER_INVESTIGATION_READERS;

  readonly form = this._formBuilder.nonNullable.group(
    {
      // No trim on the way in and none on the way out: an edge space is part
      // of the name the game wrote into the filename. Counted in codepoints,
      // as the server counts it, so a name in fancy Unicode gets the same
      // budget as any other.
      exactName: [
        '',
        [
          Validators.required,
          maxCodepointsValidator(EXACT_GAME_NAME_MAX_CODEPOINTS),
        ],
      ],
      usedFrom: ['', [Validators.required]],
      usedUntil: ['', [Validators.required]],
      reason: [
        '',
        [notBlank, Validators.maxLength(FLEET_FORMER_NAME_REASON_LIMIT)],
      ],
    },
    { validators: [untilNotBeforeFrom] },
  );

  /** Whether a name is being recorded or removed. */
  readonly busy = signal(false);

  /** Why the last change was refused or failed, if it was. */
  readonly changeError = signal<string | null>(null);

  /** How the last refusal is titled. */
  readonly refusedTitle = signal('Not recorded');

  /** What the last change came to, if it was made. */
  readonly changeNotice = signal<string | null>(null);

  /**
   * The last instant a name was in use: a millisecond before it stopped, so
   * a name recorded as used until a day reads as used until that day rather
   * than the one after it.
   *
   * @param validTo - When it stopped being used.
   * @returns The instant, as an ISO string.
   */
  lastInstantOf(validTo: string): string {
    return new Date(Date.parse(validTo) - 1).toISOString();
  }

  /**
   * How many imports matched a name, in words.
   *
   * @param name - The name.
   * @returns The sentence.
   */
  matchedLabel(name: FleetFormerName): string {
    if (name.matchedImports === 0) {
      // A removed name matches nothing new, so it will never have any.
      return name.removedAt === null
        ? 'Matched no imports yet'
        : 'Matched no imports';
    }

    return name.matchedImports === 1
      ? 'Matched 1 import'
      : `Matched ${name.matchedImports} imports`;
  }

  /**
   * Records the name typed, used between the days chosen, then reads the
   * names again.
   *
   * @param data - The page.
   */
  onRecord(data: FleetFormerNamesData): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    if (this.busy()) {
      return;
    }

    const { exactName, usedFrom, usedUntil, reason } = this.form.getRawValue();
    const zone = this._settings.displayTimezone();

    this.startChange('Not recorded');
    this._formerNames
      .record(data.section.communityId, data.section.fleetId, {
        exactName,
        // A date control gives a day or nothing, and nothing is refused
        // above, so each of these is an instant.
        validFrom: startOfLocalDay(usedFrom, zone) as string,
        validTo: startOfNextLocalDay(usedUntil, zone) as string,
        reason: reason.trim(),
      })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.form.reset();
          this.changeNotice.set(FLEET_FORMER_NAME_RECORDED);
          this.reload();
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(false);
          this.changeError.set(recordRefusalOf(error));
        },
      });
  }

  /**
   * Asks why a name is to be removed, then removes it and reads the names
   * again: refused or removed, what the page showed is no longer how things
   * stand.
   *
   * @param data - The page.
   * @param name - The name.
   */
  onRemove(data: FleetFormerNamesData, name: FleetFormerName): void {
    this._dialog
      .open<
        RosterIdentityDecisionDialogComponent,
        RosterIdentityDecisionDialogData,
        RosterIdentityDecisionDialogResult
      >(RosterIdentityDecisionDialogComponent, {
        width: '75%',
        data: REMOVAL_DIALOG,
      })
      .afterClosed()
      .pipe(
        filter(
          (result): result is RosterIdentityDecisionDialogResult =>
            result !== undefined,
        ),
        switchMap(result => {
          this.startChange('Not removed');

          return this._formerNames.remove(
            data.section.communityId,
            data.section.fleetId,
            name.id,
            // The dialog will not close without a reason when one is required.
            result.reason as string,
          );
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.changeNotice.set(FLEET_FORMER_NAME_REMOVED);
          this.reload();
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(false);
          this.changeError.set(
            error.status === HttpStatusCode.NotFound
              ? FLEET_FORMER_NAME_GONE
              : FLEET_FORMER_NAME_REMOVE_FAILED,
          );
          this.reload();
        },
      });
  }

  /**
   * Reads the Fleet's former names.
   *
   * @param section - The Fleet.
   * @returns The names, with the Fleet.
   */
  protected load(section: FleetSection): Observable<FleetFormerNamesData> {
    return this._formerNames
      .list(section.communityId, section.fleetId)
      .pipe(map(list => ({ section, list })));
  }

  /**
   * Marks a change as under way, forgetting what the last one came to.
   *
   * @param refusedTitle - How a refusal of this change is titled.
   */
  private startChange(refusedTitle: string): void {
    this.busy.set(true);
    this.changeError.set(null);
    this.changeNotice.set(null);
    this.refusedTitle.set(refusedTitle);
  }
}

/**
 * Refuses a reason that says nothing: only white space is no reason at all,
 * which is how the server reads it too.
 *
 * @param control - The reason.
 * @returns A required error when it is blank, or null.
 */
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() === '' ? { required: true } : null;
}

/**
 * Refuses a name used until a day before it was first used. Days as a date
 * control gives them sort as they read, so they are compared as they are.
 *
 * @param group - The form.
 * @returns A backwards error when the days are the wrong way round, or null.
 */
function untilNotBeforeFrom(
  group: AbstractControl<{ usedFrom: string; usedUntil: string }>,
): ValidationErrors | null {
  const { usedFrom, usedUntil } = group.value;

  // No day sorts before the empty string, so an empty from is never passed.
  return usedUntil !== '' && usedUntil < usedFrom ? { backwards: true } : null;
}

/**
 * Says why a name was not recorded.
 *
 * @param error - The refusal.
 * @returns The server's own sentence when it refused a name it understood —
 *   the days the wrong way round or not yet over, the Fleet's name now, or a
 *   name already recorded for part of that time — and a general one
 *   otherwise.
 */
function recordRefusalOf(error: HttpErrorResponse): string {
  const message: unknown = error.error?.message;

  return (error.status === HttpStatusCode.BadRequest ||
    error.status === HttpStatusCode.Conflict) &&
    typeof message === 'string'
    ? message
    : FLEET_FORMER_NAME_RECORD_FAILED;
}
