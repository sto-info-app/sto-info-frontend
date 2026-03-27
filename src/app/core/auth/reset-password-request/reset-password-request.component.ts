import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { FORM_ERROR_INVALID_EMAIL_FORMAT } from 'src/app/shared/constants/error-messages.constants';
import { validateEmail } from 'src/app/shared/_helpers/validate-email';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-reset-password-request',
  templateUrl: './reset-password-request.component.html',
  styleUrls: ['./reset-password-request.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
  ],
})
export class ResetPasswordRequestComponent {
  email = '';
  errorMessage = '';
  successMessage = '';
  inputsValid = false;
  emailTouched = false;
  appRoutes = APP_ROUTES;

  // Allow constants to be used in the HTML
  errorTextInvalidEmailFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;

  private readonly authService = inject(AuthService);
  private readonly routingService = inject(RoutingService);

  validateEmail(email: string): boolean {
    return validateEmail(email);
  }

  validateInputs(): void {
    this.inputsValid = validateEmail(this.email);
  }

  onPasswordReset(): void {
    if (!this.inputsValid) {
      return;
    }

    this.authService.resetPassword(this.email).subscribe({
      next: () => {
        this.successMessage = `Check your email and follow the instructions to reset your password.`;
        this.errorMessage = '';
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
      },
    });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
