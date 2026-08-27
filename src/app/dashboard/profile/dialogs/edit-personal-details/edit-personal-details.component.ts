import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { User } from 'src/app/dashboard/models/user.model';
import { DashboardService } from 'src/app/dashboard/services/dashboard.service';
import { EditPersonalDetailsFormValues } from 'src/app/models/user-auth.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  FORM_ERROR_FIRSTNAME_REQUIRED,
  FORM_ERROR_LASTNAME_REQUIRED,
  FORM_ERROR_NAME_MAX_LENGTH,
  FORM_ERROR_USERNAME_MAX_LENGTH,
  FORM_ERROR_USERNAME_MIN_LENGTH,
  FORM_ERROR_USERNAME_PATTERN,
  FORM_ERROR_USERNAME_REQUIRED,
  FORM_ERROR_USERNAME_TAKEN,
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import {
  MAX_CHARS_NAMES,
  MAX_CHARS_USERNAME,
  MIN_CHARS_USERNAME,
} from 'src/app/shared/constants/forms.constants';
import { USERNAME_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { RoutingService } from 'src/app/shared/services/routing.service';

@Component({
  selector: 'app-edit-personal-details',
  templateUrl: './edit-personal-details.component.html',
  styleUrls: ['./edit-personal-details.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsToggleComponent,
  ],
})
export class EditPersonalDetailsComponent implements OnInit {
  editPersonalDetailsForm!: FormGroup;
  errorMessage = '';
  isSubmitting = false;

  // Allow constants to be used in the HTML
  showErrorMilliseconds: number = MILLISECONDS_SHOW_ERROR_MSG;
  errorTextFirstNameRequired: string = FORM_ERROR_FIRSTNAME_REQUIRED;
  errorTextLastNameRequired: string = FORM_ERROR_LASTNAME_REQUIRED;
  errorTextNamesMaxLength: string = FORM_ERROR_NAME_MAX_LENGTH;
  errorTextUsernameRequired: string = FORM_ERROR_USERNAME_REQUIRED;
  errorTextUsernameMinLength: string = FORM_ERROR_USERNAME_MIN_LENGTH;
  errorTextUsernameMaxLength: string = FORM_ERROR_USERNAME_MAX_LENGTH;
  errorTextUsernameTaken: string = FORM_ERROR_USERNAME_TAKEN;
  errorTextUsernamePattern: string = FORM_ERROR_USERNAME_PATTERN;

  private static readonly _STAY_LOGGED_IN = true;

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _routingService = inject(RoutingService);
  private readonly _dashboardService = inject(DashboardService);
  private readonly _dialogRef = inject(
    MatDialogRef<EditPersonalDetailsComponent>,
  );
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  public data = inject(MAT_DIALOG_DATA, { optional: true }) as {
    user: User;
  } | null;

  /**
   * Angular lifecycle hook that initialises the form with the current user details.
   */
  ngOnInit() {
    this.editPersonalDetailsForm = this._formBuilder.nonNullable.group({
      firstName: [
        this.data?.user?.profile?.firstName ?? '',
        [Validators.required, Validators.maxLength(MAX_CHARS_NAMES)],
      ],
      lastName: [
        this.data?.user?.profile?.lastName ?? '',
        [Validators.required, Validators.maxLength(MAX_CHARS_NAMES)],
      ],
      username: [
        this.data?.user?.profile?.username ?? '',
        [
          Validators.required,
          Validators.minLength(MIN_CHARS_USERNAME),
          Validators.maxLength(MAX_CHARS_USERNAME),
          Validators.pattern(USERNAME_PATTERN),
        ],
      ],
      publiclyVisible: [this.data?.user?.profile?.publiclyVisible ?? false],
    });
  }

  /**
   * Submits the edited personal details to the dashboard service and handles response states.
   * Sets field-level validation errors when the username is not unique.
   */
  onSaveClick() {
    this.isSubmitting = true;

    const editPersonalDetailsFormValues: EditPersonalDetailsFormValues =
      this.editPersonalDetailsForm.value;

    this._dashboardService
      .updatePersonalDetails(editPersonalDetailsFormValues)
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: response => {
          this._dialogRef?.close({
            stayLoggedIn: EditPersonalDetailsComponent._STAY_LOGGED_IN,
            updatedProfile: response?.userProfileData ?? undefined,
          });
          this.isSubmitting = false;
        },
        error: error => {
          let errMessage = '';
          if (error.status === 0) {
            console.error(MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT);
            errMessage = MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT;
          } else if (error.status === 400) {
            console.error(MSG_ERROR_HTTP_STATUS_400_CONSOLE_TEXT);
            errMessage = MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT;
          } else if (error.status === 409) {
            console.error('Conflict Exception error:', error);
            if (error.error?.message?.includes('Username')) {
              this.editPersonalDetailsForm.controls['username'].setErrors({
                uniqueUsername: true,
              });
            }
          } else {
            console.error('Unexpected Error:', error);
            errMessage = MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT;
          }
          this.displayErrorMessage(errMessage);
          this.isSubmitting = false;
        },
      });
  }

  /**
   * Resolves a named application route to a router link string.
   *
   * @param route Application route key.
   * @returns Router link string for the given route.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Displays an error message for a limited duration before clearing it.
   *
   * @param message Error message text to display.
   */
  displayErrorMessage(message: string) {
    this.errorMessage = message;

    setTimeout(() => {
      this.resetErrorMessage();
    }, this.showErrorMilliseconds);
  }

  /**
   * Clears the currently displayed error message.
   */
  resetErrorMessage(): void {
    this.errorMessage = '';
  }

  /**
   * Closes the dialog without returning any specific result.
   */
  onCloseClick(): void {
    this._dialogRef?.close();
  }
}
