import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';

import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';

import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetScopeService } from 'src/app/fleet/fleet-scope.service';
import { RosterImportService } from 'src/app/fleet/imports/roster-import.service';
import {
  describeUploadRefusal,
  ROSTER_FILENAME_REJECTIONS,
  ROSTER_ROW_REJECTIONS,
} from 'src/app/fleet/imports/roster-import.messages';
import {
  RosterDateResolution,
  RosterImportPreview,
  RosterPreviewDate,
  RosterPreviewProblem,
  RosterSourceHeaderShape,
} from 'src/app/models/fleet-import.models';
import { ResolvedStoFleet, StoFleet } from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  availableTimezones,
  describeTimezone,
  deviceTimezone,
} from 'src/app/shared/utils/timezone.utils';

/** The capability that lets somebody put a roster into a Fleet. */
export const ROSTER_IMPORT_CAPABILITY = 'roster.import';

/** What to say when the Fleet could not be read for any reason but absence. */
export const ROSTER_CHECK_ERROR =
  'This Fleet could not be read. Please try again.';

/** What to say when nothing answers to the address. */
export const ROSTER_CHECK_MISSING =
  'No Fleet here answers to that address. It may have been closed, or the ' +
  'address may have changed.';

/** What to say when the check itself could not be run. */
export const ROSTER_CHECK_FAILED =
  'The export could not be checked. Please try again.';

/** What to say about a Fleet no Community has registered. */
export const ROSTER_CHECK_NO_COMMUNITY =
  'No Community here has registered this Fleet, so there is nothing for a ' +
  'roster to be imported into. A record like this exists so that an imported ' +
  'roster has something to attach to and so nobody registers a second copy ' +
  'of the same Fleet; importing into it would mean deciding, on nobody’s ' +
  'authority, whose Fleet it is.';

/** What to say to somebody who may read the page and not act on it. */
export const ROSTER_CHECK_NOT_PERMITTED =
  'Importing a roster into this Fleet is not something your account may do. ' +
  'Somebody who runs the Fleet can grant it, or import the export themselves.';

/** What to say when a file reads but cannot yet be trusted. */
export const ROSTER_CHECK_NOT_READY =
  'This export was read, and something about it has to be settled before it ' +
  'could be imported. Nothing has been kept.';

/** What stands where the export instant would, while nobody has chosen. */
export const ROSTER_CHECK_EXPORT_CHOICE_NEEDED = 'Two moments — see below';

/** What stands where a date would, when the column was empty. */
export const ROSTER_CHECK_ABSENT = 'Not recorded';

/** Why this Fleet cannot take a roster import, when it cannot. */
export type RosterImportBlock =
  | { readonly kind: 'NO_COMMUNITY' }
  | { readonly kind: 'NO_EXPORT'; readonly platformName: string }
  | { readonly kind: 'NOT_PERMITTED' };

/** What the page is showing. */
export type RosterImportCheckState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'ERROR' }
  | {
      readonly kind: 'READY';
      readonly fleet: StoFleet;
      readonly communityId: string | null;
      readonly fleetLink: string[];
      readonly block: RosterImportBlock | null;
    };

/**
 * Checking a roster export before importing it.
 *
 * The step before an import rather than the import itself. Nothing on this
 * page writes anything: the file goes to the server, the server reads it as
 * far as it can and says what it found, and the bytes are gone by the time
 * the answer comes back. Whoever is checking can send the same file as often
 * as they like, change the timezone and send it again, and nothing about the
 * Fleet changes.
 *
 * ## Why there is a timezone to choose at all
 *
 * Because the file does not contain one. An STO export writes wall-clock
 * times in its filename and in all four of its date columns and never says
 * whose clock they were. Choosing the wrong zone does not fail: it silently
 * moves every date in the file by a few hours, which is invisible in a list
 * of dates and obvious when the same dates are drawn beside the instants they
 * were read as. That is what the sample is for.
 *
 * The control starts on the zone the reader's own browser reports, because
 * whoever is checking an export is far likelier to have taken it themselves
 * than to be uploading somebody else's. It is a starting point and not an
 * assumption — the whole page exists so that it can be corrected before
 * anything is committed to.
 *
 * ## Three ways a Fleet cannot take one
 *
 * A Fleet nobody has registered has no Community, and an import belongs to a
 * Community's Fleet rather than to a floating record. A console Fleet has no
 * export to send, because the game does not write one there. And somebody
 * without the capability may read the page and is told plainly, rather than
 * being offered a control the server would refuse.
 */
@Component({
  selector: 'app-roster-import-check',
  templateUrl: './roster-import-check.component.html',
  styleUrls: ['./roster-import-check.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LcarsSuccessMessageComponent,
    LcarsWarningMessageComponent,
    LoadingBarComponent,
  ],
})
export class RosterImportCheckComponent {
  private readonly _route = inject(ActivatedRoute);
  private readonly _scopeService = inject(FleetScopeService);
  private readonly _importService = inject(RosterImportService);
  private readonly _cdr = inject(ChangeDetectorRef);

  /** Every zone the browser can convert with, UTC first. */
  readonly timezones = availableTimezones();

  /** The timezone control, started on whatever clock this device is on. */
  readonly form = inject(FormBuilder).group({
    timezone: [deviceTimezone(), Validators.required],
  });

  /** The export chosen, or null while none has been. */
  selectedFile: File | null = null;

  /** True while the server is reading it. */
  checking = false;

  /** What the server made of it, or null before anything was sent. */
  preview: RosterImportPreview | null = null;

  /** Why the check could not be run, or null when it could. */
  errorMessage: string | null = null;

  /** Where to go back to when there is no import to make here. */
  readonly fleetDirectoryLink = FLEET_LINKS.fleetDirectory();

  /** What to say when nothing answers to the address. */
  readonly missingMessage = ROSTER_CHECK_MISSING;

  /** What to say when the Fleet could not be read. */
  readonly readErrorMessage = ROSTER_CHECK_ERROR;

  /** What to say about a Fleet no Community has registered. */
  readonly noCommunityMessage = ROSTER_CHECK_NO_COMMUNITY;

  /** What to say to a reader who may not import here. */
  readonly notPermittedMessage = ROSTER_CHECK_NOT_PERMITTED;

  /** What to say when a file reads but cannot yet be trusted. */
  readonly notReadyMessage = ROSTER_CHECK_NOT_READY;

  /** What stands where the export instant would, while nobody has chosen. */
  readonly exportChoiceNeeded = ROSTER_CHECK_EXPORT_CHOICE_NEEDED;

  /** What stands where a date would, when the column was empty. */
  readonly absent = ROSTER_CHECK_ABSENT;

  /** The Fleet, and whether it can take an import at all. */
  readonly state$: Observable<RosterImportCheckState> =
    this._route.paramMap.pipe(
      switchMap(params => this.resolve(params)),
      catchError((error: HttpErrorResponse) =>
        of<RosterImportCheckState>(
          error.status === 404 ? { kind: 'MISSING' } : { kind: 'ERROR' },
        ),
      ),
      startWith<RosterImportCheckState>({ kind: 'LOADING' }),
    );

  /**
   * Remembers the file the reader chose.
   *
   * The previous answer is cleared with it. A result drawn beside a different
   * file than the one it describes is worse than no result.
   *
   * @param event - The change event from the file control.
   */
  onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.selectedFile = input.files?.[0] ?? null;
    this.preview = null;
    this.errorMessage = null;
  }

  /**
   * Asks the server how the chosen export would be read.
   *
   * @param state - The page, with the Fleet it resolved.
   */
  onSubmit(state: RosterImportCheckState): void {
    const file = this.selectedFile;
    const timezone = this.form.controls.timezone.value;

    if (
      state.kind !== 'READY' ||
      state.communityId === null ||
      file === null ||
      !timezone
    ) {
      return;
    }

    this.checking = true;
    this.preview = null;
    this.errorMessage = null;

    this._importService
      .preview(state.communityId, state.fleet.id, file, timezone)
      .subscribe({
        next: preview => {
          this.preview = preview;
          this.checking = false;
          this._cdr.detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.describeFailure(error);
          this.checking = false;
          this._cdr.detectChanges();
        },
      });
  }

  /**
   * Says why the game writes no export on a platform.
   *
   * Names the platform, because the reader may well be the Fleet leader who
   * has spent ten minutes looking for a menu that is not there.
   *
   * @param platformName - The platform, as the catalogue names it.
   * @returns What to tell them.
   */
  noExportMessage(platformName: string): string {
    return (
      `The game provides no fleet roster export on ${platformName}, so ` +
      'there is nothing to check. If that changes, this site will accept one.'
    );
  }

  /**
   * Says what an export that could be imported holds.
   *
   * @param preview - What the server found.
   * @returns What to tell the reader.
   */
  readyMessage(preview: RosterImportPreview): string {
    return (
      `This export reads as ${preview.readableRowCount} members, taken on ` +
      `${preview.filename.localStamp} ${preview.timezone} time. Nothing has ` +
      'been kept: importing it is a separate step.'
    );
  }

  /**
   * Labels a timezone the way a picker should.
   *
   * @param timezone - The IANA identifier.
   * @returns The identifier with its current offset.
   */
  label(timezone: string): string {
    return describeTimezone(timezone);
  }

  /**
   * Says why the filename is not evidence of anything.
   *
   * @param preview - What the server found.
   * @returns The sentence, or null when the name was fine.
   */
  filenameProblem(preview: RosterImportPreview): string | null {
    const { rejection } = preview.filename;

    return rejection === null ? null : ROSTER_FILENAME_REJECTIONS[rejection];
  }

  /**
   * Says why one row could not be read.
   *
   * @param problem - What the server found.
   * @returns The sentence.
   */
  rowProblem(problem: RosterPreviewProblem): string {
    return ROSTER_ROW_REJECTIONS[problem.code];
  }

  /**
   * Writes a date's instants out beside the local time the file held.
   *
   * Two of them means the clock went back over that hour and both readings
   * are real, so both are shown rather than one being picked.
   *
   * @param date - The date as the server read it.
   * @returns What to draw in the UTC column.
   */
  instants(date: RosterPreviewDate): string {
    if (date.resolution === RosterDateResolution.ABSENT) {
      return '—';
    }

    return date.candidates.join(' or ');
  }

  /**
   * Reports whether an export carried officer notes that were discarded.
   *
   * @param preview - What the server found.
   * @returns True when the file was the fifteen-column form.
   */
  hadOfficerColumns(preview: RosterImportPreview): boolean {
    return preview.source.headerShape === RosterSourceHeaderShape.OFFICER;
  }

  /**
   * Resolves the Fleet the address names, and what may be done with it.
   *
   * @param params - The address, in segments.
   * @returns The page's state.
   */
  private resolve(params: ParamMap): Observable<RosterImportCheckState> {
    const communitySlug = params.get('communitySlug') ?? '';
    const platformSegment = params.get('platformSegment') ?? '';
    const slug = params.get('slug') ?? '';

    return this._scopeService
      .resolveFleet(communitySlug, platformSegment, slug)
      .pipe(map(resolved => this.present(resolved)));
  }

  /**
   * Decides what the page offers about a resolved Fleet.
   *
   * The three refusals are asked in the order they are true of the record
   * rather than of the reader: a Fleet with no Community could not take an
   * import from anybody, a console Fleet has no file to take, and only then
   * does it matter who is asking.
   *
   * @param resolved - The Fleet, as the server resolved it.
   * @returns The page's state.
   */
  private present(resolved: ResolvedStoFleet): RosterImportCheckState {
    const { fleet, viewer } = resolved;

    return {
      kind: 'READY',
      fleet,
      communityId: fleet.communityId,
      fleetLink: FLEET_LINKS.fleet(
        resolved.communitySlug,
        resolved.platformSegment,
        fleet.slug,
      ),
      block: this.blockFor(resolved, viewer.capabilities),
    };
  }

  /**
   * Works out why this Fleet cannot take an import, if it cannot.
   *
   * @param resolved - The Fleet, as the server resolved it.
   * @param capabilities - What the reader may do here.
   * @returns The reason, or null when an import may be checked.
   */
  private blockFor(
    resolved: ResolvedStoFleet,
    capabilities: string[],
  ): RosterImportBlock | null {
    if (resolved.fleet.communityId === null) {
      return { kind: 'NO_COMMUNITY' };
    }

    if (!resolved.fleet.platformProvidesRosterExport) {
      return { kind: 'NO_EXPORT', platformName: resolved.fleet.platformName };
    }

    return capabilities.includes(ROSTER_IMPORT_CAPABILITY)
      ? null
      : { kind: 'NOT_PERMITTED' };
  }

  /**
   * Turns a failed check into something worth reading.
   *
   * A refused file is answered with a structural code, which is precise and
   * means nothing to whoever exported the CSV twenty seconds ago. Anything
   * else is an outage, and says so.
   *
   * @param error - What the server answered.
   * @returns What to tell the reader.
   */
  private describeFailure(error: HttpErrorResponse): string {
    const body = error.error as
      { code?: string; line?: number | null } | undefined;

    return error.status === 400
      ? describeUploadRefusal(body?.code, body?.line)
      : ROSTER_CHECK_FAILED;
  }
}
