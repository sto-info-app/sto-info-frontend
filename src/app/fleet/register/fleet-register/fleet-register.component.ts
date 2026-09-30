import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { map, Observable, take } from 'rxjs';

import { CharacterLookupService } from 'src/app/dashboard/services/character-lookup.service';
import {
  FLEET_AUDIENCE_CHOICES,
  FLEET_RECRUITMENT_CHOICES,
} from 'src/app/fleet/constants/fleet-scope.constants';
import { fleetFreshnessOf } from 'src/app/fleet/fleet-card.builders';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import {
  EXACT_GAME_NAME_MAX_CODEPOINTS,
  EXACT_GAME_NAME_TOO_LONG,
  inputCeilingFor,
  maxCodepointsValidator,
} from 'src/app/fleet/fleet-name-length';
import { ScopeDuplicateWarningComponent } from 'src/app/fleet/register/scope-duplicate-warning/scope-duplicate-warning.component';
import { ScopeRegisterPageDirective } from 'src/app/fleet/register/scope-register-page.directive';
import {
  ScopeDuplicateVm,
  ScopeRegisterContext,
} from 'src/app/fleet/register/scope-register.models';
import {
  FleetAudience,
  FleetDuplicate,
  FleetRecruitmentState,
  FleetScopeStatus,
} from 'src/app/models/fleet.models';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/**
 * The longest name the server holds, in codepoints, repeated so the form says
 * so first. Not the column width: ADR-0003's rule is 64.
 */
export const FLEET_NAME_MAX_LENGTH = EXACT_GAME_NAME_MAX_CODEPOINTS;

/** Column width the server enforces, repeated so the form says so first. */
export const FLEET_SLUG_MAX_LENGTH = 80;

/**
 * Registers a Fleet under a Community.
 *
 * The name is never trimmed on its way anywhere. An edge space is part of
 * an in-game name and may be the only thing telling two Fleets apart, so
 * the field holds what the game shows, character for character — which is
 * also why the duplicate warning draws every name through the component
 * that makes those spaces visible.
 *
 * The platform is half of a Fleet's identity rather than a detail about
 * it: the same name exists separately on PC and on Xbox, and the duplicate
 * question is asked per platform for that reason.
 */
@Component({
  selector: 'app-fleet-register',
  templateUrl: './fleet-register.component.html',
  styleUrls: ['../register-page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AppDatePipe],
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    ScopeDuplicateWarningComponent,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LoadingBarComponent,
  ],
})
export class FleetRegisterComponent extends ScopeRegisterPageDirective {
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _registration = inject(FleetRegistrationService);
  private readonly _lookup = inject(CharacterLookupService);

  /** The name field's `maxlength`: a ceiling, since the rule is codepoints. */
  readonly nameMaxLength = inputCeilingFor(FLEET_NAME_MAX_LENGTH);

  /** Shown when the name is over the server's budget. */
  readonly nameTooLong = EXACT_GAME_NAME_TOO_LONG;
  readonly slugMaxLength = FLEET_SLUG_MAX_LENGTH;

  readonly recruitmentChoices = Object.entries(FLEET_RECRUITMENT_CHOICES);
  readonly audienceChoices = Object.entries(FLEET_AUDIENCE_CHOICES);

  /** What a record that cannot be read is called, for the absent notice. */
  readonly missingMessage =
    'No Community answers to that address, so there is nothing to register ' +
    'a Fleet into.';

  /**
   * The allegiances a Fleet can be recorded as.
   *
   * Optional, and never guessed. A Fleet whose faction nobody stated is
   * recorded as unknown rather than as whatever its first roster looked
   * like, so the picker offers an empty choice and starts on it.
   */
  readonly allegiances$ = this._lookup.getGeneralFactions();

  readonly form = this._formBuilder.nonNullable.group({
    // No trim on the way in and none on the way out: what the game shows is
    // what gets stored.
    exactGameName: [
      '',
      [Validators.required, maxCodepointsValidator(FLEET_NAME_MAX_LENGTH)],
    ],
    platformId: ['', [Validators.required]],
    allegianceFactionId: [''],
    slug: ['', [Validators.maxLength(FLEET_SLUG_MAX_LENGTH)]],
    // Replaced by the Community's own state before the form is drawn, since
    // a Community's recruitment state pre-fills its new Fleets. The value
    // here is never seen; it is the column's own default.
    recruitmentState: [FleetRecruitmentState.CLOSED],
    visibility: [FleetAudience.PUBLIC],
  });

  /**
   * Starts the recruitment choice on the Community's own.
   *
   * The registrant may still change it before registering; it is where the
   * form starts, not a rule.
   *
   * @param context - The Community and the platform catalogue.
   */
  protected override prepareForm(context: ScopeRegisterContext): void {
    this.form.controls.recruitmentState.setValue(
      context.community.recruitmentState,
    );
  }

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
   * Registers the Fleet and opens it.
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
      .registerFleet(context.community.id, {
        exactGameName: values.exactGameName,
        platformId: values.platformId,
        ...(values.allegianceFactionId === ''
          ? {}
          : { allegianceFactionId: values.allegianceFactionId }),
        ...(values.slug.trim() === '' ? {} : { slug: values.slug.trim() }),
        recruitmentState: values.recruitmentState,
        visibility: values.visibility,
      })
      .pipe(take(1))
      .subscribe({
        next: registered => {
          void this._router.navigate(
            FLEET_LINKS.fleet(
              context.community.slug,
              registered.fleet.platformSegment,
              registered.fleet.slug,
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
      .findFleetDuplicates(communityId, platformId, name)
      .pipe(map(found => found.map(match => this.toWarningRow(match))));
  }

  /**
   * Turns a match into the line the warning draws.
   *
   * Whose it is and how current it is, which is what FC-013's third
   * acceptance criterion asks for: those are the two things that tell two
   * records of one in-game Fleet apart.
   *
   * @param match - The record the server found.
   * @returns The line to draw.
   */
  private toWarningRow(match: FleetDuplicate): ScopeDuplicateVm {
    return {
      id: match.id,
      name: match.exactGameName,
      heldBy: match.communityName ?? 'No Community — a standalone record',
      platform: match.platformName,
      freshness: fleetFreshnessOf(match, this.formatInstant),
      lifecycle:
        match.status === FleetScopeStatus.ACTIVE
          ? null
          : `This record is ${match.status.toLowerCase()}`,
    };
  }
}
