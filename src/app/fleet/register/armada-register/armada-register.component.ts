import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { map, Observable, take } from 'rxjs';

import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import { ScopeDuplicateWarningComponent } from 'src/app/fleet/register/scope-duplicate-warning/scope-duplicate-warning.component';
import { ScopeRegisterPageDirective } from 'src/app/fleet/register/scope-register-page.directive';
import {
  ScopeDuplicateVm,
  ScopeRegisterContext,
} from 'src/app/fleet/register/scope-register.models';
import { ArmadaDuplicate, FleetScopeStatus } from 'src/app/models/fleet.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** Column widths the server enforces, repeated so the form says so first. */
export const ARMADA_NAME_MAX_LENGTH = 255;
export const ARMADA_DISPLAY_NAME_MAX_LENGTH = 160;
export const ARMADA_SLUG_MAX_LENGTH = 80;

/**
 * Registers an Armada under a Community.
 *
 * The same shape as registering a Fleet, with fewer questions: an Armada
 * recruits nobody, and it is seen exactly as far as the Community holding
 * it, so there is no posture and no audience to choose.
 *
 * It gains one the Fleet has not. An Armada's in-game name is often long
 * and often abbreviated in conversation, so a Community may record what it
 * prefers to call it — beneath the name the game holds, never instead of.
 *
 * Its duplicate warning carries no freshness line: nothing imports a roster
 * for an Armada, so there is nothing to be fresh, and an empty line would
 * imply there was.
 */
@Component({
  selector: 'app-armada-register',
  templateUrl: './armada-register.component.html',
  styleUrls: ['../register-page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    ScopeDuplicateWarningComponent,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LoadingBarComponent,
  ],
})
export class ArmadaRegisterComponent extends ScopeRegisterPageDirective {
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _registration = inject(FleetRegistrationService);

  readonly nameMaxLength = ARMADA_NAME_MAX_LENGTH;
  readonly displayNameMaxLength = ARMADA_DISPLAY_NAME_MAX_LENGTH;
  readonly slugMaxLength = ARMADA_SLUG_MAX_LENGTH;

  /** What to say when nothing answers to the address. */
  readonly missingMessage =
    'No Community answers to that address, so there is nothing to register ' +
    'an Armada into.';

  readonly form = this._formBuilder.nonNullable.group({
    exactGameName: [
      '',
      [Validators.required, Validators.maxLength(ARMADA_NAME_MAX_LENGTH)],
    ],
    platformId: ['', [Validators.required]],
    displayName: ['', [Validators.maxLength(ARMADA_DISPLAY_NAME_MAX_LENGTH)]],
    slug: ['', [Validators.maxLength(ARMADA_SLUG_MAX_LENGTH)]],
  });

  /**
   * Asks what already answers to the typed name on the chosen platform.
   *
   * @param communityId - The Community being registered into.
   */
  onCheck(communityId: string): void {
    const values = this.form.getRawValue();

    this.onCheckDuplicates(
      communityId,
      values.platformId,
      values.exactGameName,
    );
  }

  /**
   * Registers the Armada and opens it.
   *
   * @param context - The Community and the platform catalogue.
   */
  onSubmit(context: ScopeRegisterContext): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();

      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const values = this.form.getRawValue();

    this._registration
      .registerArmada(context.community.id, {
        exactGameName: values.exactGameName,
        platformId: values.platformId,
        ...(values.displayName.trim() === ''
          ? {}
          : { displayName: values.displayName.trim() }),
        ...(values.slug.trim() === '' ? {} : { slug: values.slug.trim() }),
      })
      .pipe(take(1))
      .subscribe({
        next: registered => {
          void this._router.navigate(
            FLEET_LINKS.armada(
              context.community.slug,
              registered.armada.platformSegment,
              registered.armada.slug,
            ),
          );
        },
        error: (error: { status?: number }) => {
          this.reportFailure(error.status);
          this._changeDetector.markForCheck();
        },
      });
  }

  /**
   * Asks the server what already answers to the name.
   *
   * @param communityId - The Community being registered into.
   * @param platformId - The platform.
   * @param name - The name being registered.
   * @returns The matches, as the warning draws them.
   */
  protected findDuplicates(
    communityId: string,
    platformId: string,
    name: string,
  ): Observable<ScopeDuplicateVm[]> {
    return this._registration
      .findArmadaDuplicates(communityId, platformId, name)
      .pipe(map(found => found.map(match => this.toWarningRow(match))));
  }

  /**
   * Turns a match into the line the warning draws.
   *
   * @param match - The record the server found.
   * @returns The line to draw.
   */
  private toWarningRow(match: ArmadaDuplicate): ScopeDuplicateVm {
    return {
      id: match.id,
      name: match.exactGameName,
      heldBy: match.communityName,
      platform: match.platformName,
      // Nothing observes an Armada, so there is nothing to be fresh.
      freshness: null,
      lifecycle:
        match.status === FleetScopeStatus.ACTIVE
          ? null
          : `This record is ${match.status.toLowerCase()}`,
    };
  }
}
