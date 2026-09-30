import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { catchError, map, Observable, of, take } from 'rxjs';

import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import {
  COMMUNITY_AUDIENCE_HINT,
  FLEET_AUDIENCE_CHOICES,
  FLEET_RECRUITMENT_CHOICES,
} from 'src/app/fleet/constants/fleet-scope.constants';
import { defaultCommunityName } from 'src/app/fleet/fleet-default-name';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  COMMUNITY_NAME_MAX_CODEPOINTS,
  COMMUNITY_NAME_TOO_LONG,
  inputCeilingFor,
  maxCodepointsValidator,
} from 'src/app/fleet/fleet-name-length';
import { FleetRegistrationService } from 'src/app/fleet/fleet-registration.service';
import {
  FleetAudience,
  FleetRecruitmentState,
} from 'src/app/models/fleet.models';
import { FeatureUnavailableComponent } from 'src/app/shared/components/feature-unavailable/feature-unavailable.component';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { FEATURE_UNAVAILABLE_DISABLED } from 'src/app/shared/constants/feature-availability.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';
import {
  availableTimezones,
  deviceTimezone,
} from 'src/app/shared/utils/timezone.utils';

/**
 * The longest name the server holds, in codepoints once trimmed, repeated so
 * the form says so first.
 */
export const COMMUNITY_NAME_MAX_LENGTH = COMMUNITY_NAME_MAX_CODEPOINTS;

/** Column widths the server enforces, repeated so the form says so first. */
export const COMMUNITY_SLUG_MAX_LENGTH = 80;
export const COMMUNITY_DESCRIPTION_MAX_LENGTH = 2000;

/** Shown when the address somebody asked for was taken in the meantime. */
export const COMMUNITY_SLUG_TAKEN =
  'Somebody registered that web address a moment before you did. Change it, ' +
  'or leave it blank and one will be made from the name.';

/**
 * Shown when the registrant already owns as many Communities as anybody may.
 *
 * A closed Community still counts towards the ten, so the advice is to ask
 * rather than to close one: closing would not free a place.
 */
export const COMMUNITY_OWNER_LIMIT_REACHED =
  'You may own at most 10 Fleet Communities, closed ones included. If you ' +
  'need more, use Contact us.';

/**
 * The part of the server's owner-limit refusal that tells it apart.
 *
 * The limit and a web address taken in a race are both a 409, so the
 * sentence is what separates them.
 */
const OWNER_LIMIT_REFUSAL_FRAGMENT = 'Fleet Communities';

/** Shown when the registration failed for a reason nobody can act on. */
export const COMMUNITY_REGISTER_FAILED =
  'The Community could not be registered. Please try again.';

/**
 * Registers a Fleet Community.
 *
 * A page rather than a dialogue. A registration is several fields and a
 * decision about who can see the result, and a reader who wants to go back
 * and think about it should be able to use the back button.
 *
 * The name starts as the registrant's own — FC-013's first acceptance
 * criterion — and is an ordinary editable field. A default is a starting
 * point rather than a rule: somebody with a name in mind types over it, and
 * somebody without is spared inventing one to get past the field.
 *
 * The web address is optional and derived from the name when left out. The
 * server suffixes a taken one while registering, so the only collision that
 * reaches this page is between two registrations racing for the same typed
 * address — which is worth saying plainly rather than retrying silently
 * under a name the registrant chose deliberately.
 */
@Component({
  selector: 'app-community-register',
  templateUrl: './community-register.component.html',
  styleUrls: ['./community-register.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    FeatureUnavailableComponent,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    LoadingBarComponent,
  ],
})
export class CommunityRegisterComponent implements OnInit {
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _changeDetector = inject(ChangeDetectorRef);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _registration = inject(FleetRegistrationService);
  private readonly _configuration = inject(FleetConfigurationService);
  private readonly _dashboard = inject(DashboardService);
  private readonly _router = inject(Router);

  /** The name field's `maxlength`: a ceiling, since the rule is codepoints. */
  readonly nameMaxLength = inputCeilingFor(COMMUNITY_NAME_MAX_LENGTH);

  /** Shown when the name is over the server's budget. */
  readonly nameTooLong = COMMUNITY_NAME_TOO_LONG;
  readonly slugMaxLength = COMMUNITY_SLUG_MAX_LENGTH;
  readonly descriptionMaxLength = COMMUNITY_DESCRIPTION_MAX_LENGTH;

  readonly recruitmentChoices = Object.entries(FLEET_RECRUITMENT_CHOICES);
  readonly audienceChoices = Object.entries(FLEET_AUDIENCE_CHOICES);

  /** Who each audience means when it is a Community's own. */
  readonly audienceHint = COMMUNITY_AUDIENCE_HINT;
  readonly timezones = availableTimezones();

  /** The unavailable notice's reason, for a switch that is off. */
  readonly disabledReason = FEATURE_UNAVAILABLE_DISABLED;

  /** The feature's name, for that notice. */
  readonly featureName = 'Fleet Community';

  /** Set while the registration is in flight, so the form cannot be sent twice. */
  isSaving = false;

  /** What went wrong, where anything did. */
  errorMessage = '';

  readonly form = this._formBuilder.nonNullable.group({
    name: [
      '',
      // Measured trimmed, because that is what is sent and what the server
      // measures.
      [
        Validators.required,
        maxCodepointsValidator(COMMUNITY_NAME_MAX_LENGTH, true),
      ],
    ],
    slug: ['', [Validators.maxLength(COMMUNITY_SLUG_MAX_LENGTH)]],
    description: ['', [Validators.maxLength(COMMUNITY_DESCRIPTION_MAX_LENGTH)]],
    recruitmentState: [FleetRecruitmentState.OPEN],
    visibility: [FleetAudience.PUBLIC],
    preferredTimezone: [deviceTimezone()],
  });

  /**
   * Whether registration is open, so the page can say so before asking for
   * anything.
   *
   * The master switch and the registration flag are separate, and either
   * being off means the server will refuse: a form that let somebody fill
   * in six fields and then said no would be a form that wasted their time.
   */
  readonly isOpen$: Observable<boolean> = this._configuration
    .getFeatures()
    .pipe(map(features => features.isEnabled && features.registrationEnabled));

  /**
   * Fills the name in with the registrant's own, once it is known.
   *
   * Written into the control rather than bound to it, because the field is
   * editable and what is in it after the first keystroke is theirs. Only
   * while the control is pristine, so an answer arriving late cannot
   * overwrite something already typed.
   */
  ngOnInit(): void {
    this._dashboard
      .getUser()
      .pipe(
        take(1),
        // A profile that cannot be read leaves the field empty rather than
        // stopping the registration. The name is a convenience, and
        // somebody who came here to register a Community can type one.
        catchError(() => of(null)),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(user => {
        // The username lives on the profile rather than the account, and a
        // profile is optional: no profile means no name to suggest, which
        // the helper answers with an empty field.
        const suggested = defaultCommunityName(user?.profile?.username ?? null);

        if (suggested === '' || !this.form.controls.name.pristine) {
          return;
        }

        this.form.controls.name.setValue(suggested);
        this._changeDetector.markForCheck();
      });
  }

  /**
   * Registers the Community and opens it.
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
      .registerCommunity({
        name: values.name.trim(),
        // An empty optional field is left out rather than sent empty. The
        // server derives a web address from the name when none is given,
        // and refuses an empty string as a name for one.
        ...(values.slug.trim() === '' ? {} : { slug: values.slug.trim() }),
        ...(values.description.trim() === ''
          ? {}
          : { description: values.description.trim() }),
        recruitmentState: values.recruitmentState,
        visibility: values.visibility,
        preferredTimezone: values.preferredTimezone,
      })
      .pipe(take(1))
      .subscribe({
        next: community => {
          void this._router.navigate(FLEET_LINKS.community(community.slug));
        },
        error: (error: { status?: number; error?: { message?: unknown } }) => {
          this.isSaving = false;
          this.errorMessage = refusalOf(error);
        },
      });
  }
}

/**
 * Says why a registration was refused.
 *
 * @param error - The refusal.
 * @returns The limit when that is what the server named, the taken address
 *   for any other conflict, and a general sentence otherwise.
 */
function refusalOf(error: {
  status?: number;
  error?: { message?: unknown };
}): string {
  if (error.status !== 409) {
    return COMMUNITY_REGISTER_FAILED;
  }

  const message = error.error?.message;

  return typeof message === 'string' &&
    message.includes(OWNER_LIMIT_REFUSAL_FRAGMENT)
    ? COMMUNITY_OWNER_LIMIT_REACHED
    : COMMUNITY_SLUG_TAKEN;
}
