import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, Optional } from '@angular/core';
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
import { progressBarAnimation } from 'src/app/shared/animation/progress-bar.animation';
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
import { RoutingService } from 'src/app/shared/services/routing.service';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';

@Component({
  selector: 'app-edit-personal-details',
  templateUrl: './edit-personal-details.component.html',
  styleUrls: ['./edit-personal-details.component.scss'],
  animations: [progressBarAnimation],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
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

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly routingService: RoutingService,
    private readonly dashboardService: DashboardService,
    private readonly dialogRef: MatDialogRef<EditPersonalDetailsComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { user: User } | null,
  ) {}

  ngOnInit() {
    this.editPersonalDetailsForm = this.formBuilder.nonNullable.group({
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
    });
  }

  onSaveClick() {
    this.isSubmitting = true;

    const editPersonalDetailsFormValues: EditPersonalDetailsFormValues =
      this.editPersonalDetailsForm.value;

    this.dashboardService
      .updatePersonalDetails(editPersonalDetailsFormValues)
      .subscribe({
        next: () => {
          this.dialogRef?.close({
            stayLoggedIn: true,
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
            if (error.error.message.includes('Username')) {
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
        complete: () => {
          this.isSubmitting = false;
          this.dialogRef?.close(true);
        },
      });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  displayErrorMessage(message: string) {
    this.errorMessage = message;

    setTimeout(() => {
      this.resetErrorMessage();
    }, this.showErrorMilliseconds);
  }

  resetErrorMessage(): void {
    this.errorMessage = ''; // Reset error message
  }

  onCloseClick(): void {
    this.dialogRef?.close();
  }
}
