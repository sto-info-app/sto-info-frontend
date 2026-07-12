import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { validateEmail } from 'src/app/shared/_helpers/validate-email';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { FORM_ERROR_INVALID_EMAIL_FORMAT } from 'src/app/shared/constants/error-messages.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-reset-password-request',
  templateUrl: './reset-password-request.component.html',
  styleUrls: ['./reset-password-request.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
  ],
})
export class ResetPasswordRequestComponent {
  /** Precomputed router link to the dashboard. */
  readonly dashboardLink = `/${APP_ROUTES.STO_DASHBOARD}`;

  /** Precomputed router link to the accounts list. */
  readonly accountsLink = `/${APP_ROUTES.STO_DASHBOARD_ACCOUNTS}`;

  /** Precomputed router link to the login page. */
  readonly loginLink = `/${APP_ROUTES.LOGIN}`;

  /** Precomputed router link to the registration page. */
  readonly registerLink = `/${APP_ROUTES.REGISTER}`;

  email = '';
  errorMessage = '';
  successMessage = '';
  inputsValid = false;
  emailTouched = false;

  /** Whether the current email value passes format validation. Updated by validateInputs(). */
  isEmailValid = false;

  // Allow constants to be used in the HTML
  errorTextInvalidEmailFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;

  protected readonly _authService = inject(AuthService);
  private readonly _routingService = inject(RoutingService);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Validates an email address using the shared helper.
   *
   * @param email The email address to validate.
   * @returns `true` when the email is valid.
   */
  validateEmail(email: string): boolean {
    return validateEmail(email);
  }

  /**
   * Validates the current input state and updates the submit flag.
   */
  validateInputs(): void {
    this.isEmailValid = validateEmail(this.email);
    this.inputsValid = this.isEmailValid;
  }

  /**
   * Requests a password reset email for the entered address.
   */
  onPasswordReset(): void {
    if (!this.inputsValid) {
      return;
    }

    this._authService.resetPassword(this.email).subscribe({
      next: () => {
        this.successMessage = `Check your email and follow the instructions to reset your password.`;
        this.errorMessage = '';
        this._cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        const message = error?.error?.message;
        if (message) {
          console.error('Reset password error:', error);
          this.errorMessage = message;
        } else {
          console.error('Reset password error:', error);
          this.errorMessage =
            'An error occurred while resetting the password. Please try again.';
        }
        this._cdr.markForCheck();
      },
    });
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
