import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MustMatch } from 'src/app/shared/_helpers/must-match.validator';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  FORM_ERROR_CONFIRMATION_PASSWORD_REQUIRED,
  FORM_ERROR_PASSWORDS_DO_NOT_MATCH,
  FORM_ERROR_PASSWORD_COMPLEXITY,
  FORM_ERROR_PASSWORD_MIN_LENGTH,
  FORM_ERROR_PASSWORD_REQUIRED,
} from 'src/app/shared/constants/error-messages.constants';
import { MIN_CHARS_PASSWORD } from 'src/app/shared/constants/forms.constants';
import { PASSWORD_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class ChangePasswordComponent implements OnInit {
  token = '';
  changePasswordForm: FormGroup;
  seriousErrorMessage = '';
  errorMessage = '';
  successMessage = '';
  appRoutes = APP_ROUTES;

  // Allow constants to be used in the HTML
  errorTextPasswordRequired: string = FORM_ERROR_PASSWORD_REQUIRED;
  errorTextPasswordMinLength: string = FORM_ERROR_PASSWORD_MIN_LENGTH;
  errorTextPasswordComplexity: string = FORM_ERROR_PASSWORD_COMPLEXITY;
  errorTextConfirmationPasswordRequired: string =
    FORM_ERROR_CONFIRMATION_PASSWORD_REQUIRED;
  errorTextPasswordsDoNotMatch: string = FORM_ERROR_PASSWORDS_DO_NOT_MATCH;

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _route = inject(ActivatedRoute);
  private readonly _authService = inject(AuthService);
  private readonly _routingService = inject(RoutingService);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _logoutAfterSuccessDelayMs = 3000;

  /**
   * Builds the change-password form.
   */
  constructor() {
    this.changePasswordForm = this._formBuilder.nonNullable.group(
      {
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(MIN_CHARS_PASSWORD),
            Validators.pattern(PASSWORD_PATTERN),
          ],
        ],
        confirmPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(MIN_CHARS_PASSWORD),
            Validators.pattern(PASSWORD_PATTERN),
          ],
        ],
      },
      {
        validators: MustMatch('password', 'confirmPassword') as ValidatorFn,
      },
    );
  }

  /**
   * Reads the password reset token from the query string.
   */
  ngOnInit() {
    this.token = this._route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.seriousErrorMessage =
        'Invalid or missing token. Please request a new password reset.';
    }
  }

  /**
   * Submits the password change request.
   */
  onSubmit() {
    if (this.changePasswordForm.valid) {
      // Clear previous result states so stale messages do not leak between attempts.
      this.successMessage = '';
      this.errorMessage = '';
      this.seriousErrorMessage = '';

      this._authService
        .changePassword(this.token, this.changePasswordForm.value.password)
        .subscribe({
          next: () => {
            this.successMessage =
              'Your password has been changed successfully.';
            if (this._authService.isLoggedIn()) {
              this.successMessage +=
                ' For security, you will be redirected to login.';

              // Give the user time to read the confirmation before redirecting.
              setTimeout(() => {
                this._authService.performLogout();
              }, this._logoutAfterSuccessDelayMs);
            }

            this._cdr.detectChanges();
          },
          error: error => {
            console.error(error);

            const nestedError =
              typeof error?.error === 'object' && error?.error !== null
                ? error.error
                : {};

            const statusCode: number | undefined =
              typeof error?.status === 'number'
                ? error.status
                : typeof error?.statusCode === 'number'
                  ? error.statusCode
                  : typeof nestedError?.['statusCode'] === 'number'
                    ? (nestedError['statusCode'] as number)
                    : undefined;

            const rawMessage =
              nestedError?.['message'] ??
              error?.message ??
              (typeof error?.error === 'string' ? error.error : '');
            const normalizedMessage =
              typeof rawMessage === 'string'
                ? rawMessage
                : Array.isArray(rawMessage)
                  ? rawMessage.join(' ')
                  : '';

            const normalizedMessageLower = normalizedMessage.toLowerCase();

            if (
              normalizedMessageLower.includes('invalid token') ||
              normalizedMessageLower.includes('token expired') ||
              statusCode === 400 ||
              statusCode === 404
            ) {
              this.seriousErrorMessage =
                'Your password reset link is invalid or has expired. Please request a new reset email.';
            } else {
              this.errorMessage =
                'There was an error changing your password. Please try again in a moment.';
              this.resetErrorMessage();
            }

            this._cdr.detectChanges();
          },
        });
    }
  }

  /**
   * Clears the transient error message after a short delay.
   */
  resetErrorMessage(): void {
    setTimeout(() => {
      this.errorMessage = ''; // Reset error message
    }, MILLISECONDS_SHOW_ERROR_MSG);
  }

  /**
   * Resolves a route key into a router link.
   *
   * @param route The route key.
   * @returns The resolved link.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
