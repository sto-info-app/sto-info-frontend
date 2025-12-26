import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RegistrationFormValues } from 'src/app/models/user-auth.models';
import { progressBarAnimation } from 'src/app/shared/animation/progress-bar.animation';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  FORM_ERROR_CONFIRMATION_PASSWORD_REQUIRED,
  FORM_ERROR_EMAIL_ALREADY_REGISTERED,
  FORM_ERROR_EMAIL_REQUIRED,
  FORM_ERROR_FIRSTNAME_REQUIRED,
  FORM_ERROR_INVALID_EMAIL_FORMAT,
  FORM_ERROR_LASTNAME_REQUIRED,
  FORM_ERROR_NAME_MAX_LENGTH,
  FORM_ERROR_PASSWORDS_DO_NOT_MATCH,
  FORM_ERROR_PASSWORD_COMPLEXITY,
  FORM_ERROR_PASSWORD_MAX_LENGTH,
  FORM_ERROR_PASSWORD_MIN_LENGTH,
  FORM_ERROR_PASSWORD_REQUIRED,
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
  MAX_CHARS_GENERAL_STRING,
  MAX_CHARS_NAMES,
  MAX_CHARS_PASSWORD,
  MAX_CHARS_USERNAME,
  MIN_CHARS_PASSWORD,
  MIN_CHARS_USERNAME,
} from 'src/app/shared/constants/forms.constants';
import {
  EMAIL_PATTERN,
  PASSWORD_PATTERN,
  USERNAME_PATTERN,
} from 'src/app/shared/constants/regex-patterns.constants';
import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { MustMatch } from '../../shared/_helpers/must-match.validator';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  animations: [progressBarAnimation],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  errorMessage = '';
  isSubmitting = false;
  appRoutes = APP_ROUTES;

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
  errorTextEmailRequired: string = FORM_ERROR_EMAIL_REQUIRED;
  errorTextEmailInvalidFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;
  errorTextEmailAlreadyRegistered: string = FORM_ERROR_EMAIL_ALREADY_REGISTERED;
  errorTextPasswordsDoNotMatch: string = FORM_ERROR_PASSWORDS_DO_NOT_MATCH;
  errorTextPasswordRequired: string = FORM_ERROR_PASSWORD_REQUIRED;
  errorTextPasswordMinLength: string = FORM_ERROR_PASSWORD_MIN_LENGTH;
  errorTextPasswordMaxLength: string = FORM_ERROR_PASSWORD_MAX_LENGTH;
  errorTextPasswordComplexity: string = FORM_ERROR_PASSWORD_COMPLEXITY;
  errorTextConfirmationPasswordRequired: string =
    FORM_ERROR_CONFIRMATION_PASSWORD_REQUIRED;

  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly routingService = inject(RoutingService);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  private readonly alertThemeService = inject(AlertThemeService);

  ngOnInit() {
    this.registerForm = this.formBuilder.nonNullable.group(
      {
        firstName: [
          '',
          [Validators.required, Validators.maxLength(MAX_CHARS_NAMES)],
        ],
        lastName: [
          '',
          [Validators.required, Validators.maxLength(MAX_CHARS_NAMES)],
        ],
        username: [
          '',
          [
            Validators.required,
            Validators.minLength(MIN_CHARS_USERNAME),
            Validators.maxLength(MAX_CHARS_USERNAME),
            Validators.pattern(USERNAME_PATTERN),
          ],
        ],
        email: [
          '',
          [
            Validators.required,
            Validators.pattern(EMAIL_PATTERN),
            Validators.maxLength(MAX_CHARS_GENERAL_STRING),
          ],
        ],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(MIN_CHARS_PASSWORD),
            Validators.maxLength(MAX_CHARS_PASSWORD),
            Validators.pattern(PASSWORD_PATTERN),
          ],
        ],
        confirmPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(MIN_CHARS_PASSWORD),
            Validators.maxLength(MAX_CHARS_PASSWORD),
            Validators.pattern(PASSWORD_PATTERN),
          ],
        ],
      },
      { validators: MustMatch('password', 'confirmPassword') as ValidatorFn },
    );
  }

  onRegister() {
    this.isSubmitting = true;

    if (this.registerForm.invalid) {
      // If there's a mustMatch error on the form group, set a separate error on the confirmPassword control
      if (this.registerForm.errors?.['mustMatch']) {
        this.registerForm.controls['confirmPassword'].setErrors({
          mustMatch: true,
        });
      }
      this.isSubmitting = false;
      return;
    }

    const registrationFormValues: RegistrationFormValues =
      this.registerForm.value;

    this.authService.register(registrationFormValues).subscribe({
      next: () => {
        this.router.navigate(['/register/complete']);
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
          console.error('Registration Conflict Exception error:', error);
          if (error.error.message.includes('Email')) {
            this.registerForm.controls['email'].setErrors({
              uniqueEmail: true,
            });
          } else if (error.error.message.includes('Username')) {
            this.registerForm.controls['username'].setErrors({
              uniqueUsername: true,
            });
          }
        } else {
          console.error('Registration error:', error);
        }
        this.displayErrorMessage(errMessage);
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  displayErrorMessage(message: string) {
    this.alertThemeService.applyAlertThemeThenApplyStaticTheme(
      this.renderer,
      this.el.nativeElement,
      'red',
    );
    this.errorMessage = message;

    setTimeout(() => {
      this.resetErrorMessage();
    }, this.showErrorMilliseconds);
  }

  resetErrorMessage(): void {
    this.errorMessage = ''; // Reset error message
  }
}
