import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { catchError, of, take } from 'rxjs';

import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { FleetDirectoryService } from 'src/app/fleet/fleet-directory.service';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import { ScopeDuplicateWarningComponent } from 'src/app/fleet/register/scope-duplicate-warning/scope-duplicate-warning.component';
import { ScopeDuplicateVm } from 'src/app/fleet/register/scope-register.models';
import {
  FleetDirectoryStatusFilter,
  FleetScopeStatus,
  StoFleetCard,
} from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** Column width the server enforces, repeated so the form says so first. */
export const STANDALONE_NAME_MAX_LENGTH = 255;

/** How many matches the preflight warning asks for. */
export const STANDALONE_DUPLICATE_LIMIT = 10;

/** Shown when the confirmation failed for a reason nobody can act on. */
export const STANDALONE_CONFIRM_FAILED =
  'The record could not be confirmed. Please try again.';

/**
 * Confirms a Fleet that belongs to no Community.
 *
 * The record exists so an imported roster has something to attach to when
 * the Fleet it describes belongs to nobody on this site. It has no owner,
 * which has two consequences the page states rather than designs around:
 * **nobody will be able to change or close it**, and two confirmations of
 * one name make two records.
 *
 * Hence the confirmation box, which the server refuses a request without.
 * It is not a checkbox for its own sake: creating one of these is almost
 * always a mistake by somebody who meant to register their own Fleet, and
 * an explicit flag is the difference between a considered act and a
 * mis-posted form.
 *
 * The warning before it is drawn from the public Fleet directory rather
 * than from the duplicates route, which lives under a Community and needs
 * a capability held at one. That makes the match looser — a search rather
 * than a folded-case equality — which for a warning is the better error to
 * make: showing somebody a near miss costs them a glance, and hiding one
 * costs the directory a second record nobody can remove.
 */
@Component({
  selector: 'app-standalone-register',
  templateUrl: './standalone-register.component.html',
  styleUrls: ['../register-page.scss', './standalone-register.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    ScopeDuplicateWarningComponent,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
  ],
})
export class StandaloneRegisterComponent {
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _registration = inject(FleetRegistrationService);
  private readonly _directory = inject(FleetDirectoryService);
  private readonly _accounts = inject(StoAccountService);
  private readonly _datePipe = inject(AppDatePipe);
  private readonly _router = inject(Router);
  private readonly _changeDetector = inject(ChangeDetectorRef);

  readonly nameMaxLength = STANDALONE_NAME_MAX_LENGTH;

  /** The platforms the catalogue knows about, for the picker. */
  readonly platforms$ = this._accounts.getPlatforms();

  /** Set while the confirmation is in flight, so it cannot be sent twice. */
  isSaving = false;

  /** Set while the duplicate question is in flight. */
  isChecking = false;

  /** What went wrong, where anything did. */
  errorMessage = '';

  /** What already answers to the name, or null while nobody has asked. */
  duplicates: ScopeDuplicateVm[] | null = null;

  readonly form = this._formBuilder.nonNullable.group({
    exactGameName: [
      '',
      [Validators.required, Validators.maxLength(STANDALONE_NAME_MAX_LENGTH)],
    ],
    platformId: ['', [Validators.required]],
    confirmUnregistered: [false, [Validators.requiredTrue]],
  });

  /**
   * Asks what already answers to the typed name on the chosen platform.
   */
  onCheck(): void {
    const values = this.form.getRawValue();

    if (
      values.exactGameName === '' ||
      values.platformId === '' ||
      this.isChecking
    ) {
      return;
    }

    this.isChecking = true;

    this._directory
      .listFleets({
        search: values.exactGameName,
        platformId: values.platformId,
        // Every record there has ever been, not only the operating ones. A
        // closed record still holds the name, and somebody about to
        // confirm a second one wants to know it exists.
        status: FleetDirectoryStatusFilter.ANY,
        pageSize: STANDALONE_DUPLICATE_LIMIT,
      })
      .pipe(
        take(1),
        catchError(() => of(null)),
      )
      .subscribe(page => {
        this.duplicates =
          page === null ? [] : page.items.map(card => this.toWarningRow(card));
        this.isChecking = false;
        this._changeDetector.markForCheck();
      });
  }

  /**
   * Confirms the record and opens it.
   */
  onSubmit(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();

      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const values = this.form.getRawValue();

    this._registration
      .confirmStandaloneFleet({
        exactGameName: values.exactGameName,
        platformId: values.platformId,
        confirmUnregistered: true,
      })
      .pipe(take(1))
      .subscribe({
        next: registered => {
          void this._router.navigate(
            FLEET_LINKS.standaloneFleet(
              registered.fleet.platformSegment,
              registered.fleet.slug,
            ),
          );
        },
        error: () => {
          this.isSaving = false;
          this.errorMessage = STANDALONE_CONFIRM_FAILED;
          this._changeDetector.markForCheck();
        },
      });
  }

  /**
   * Turns a directory card into the line the warning draws.
   *
   * @param card - The record the directory found.
   * @returns The line to draw.
   */
  private toWarningRow(card: StoFleetCard): ScopeDuplicateVm {
    return {
      id: card.id,
      name: card.exactGameName,
      heldBy: card.communityName ?? 'No Community — a standalone record',
      platform: card.platformName,
      freshness:
        card.lastEffectiveImportAt === null
          ? 'No roster has ever been imported'
          : `Roster last imported ${this._datePipe.transform(card.lastEffectiveImportAt) ?? card.lastEffectiveImportAt}`,
      lifecycle:
        card.status === FleetScopeStatus.ACTIVE
          ? null
          : `This record is ${card.status.toLowerCase()}`,
    };
  }
}
