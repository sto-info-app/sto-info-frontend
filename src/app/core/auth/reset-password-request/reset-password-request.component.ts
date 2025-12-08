import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { FORM_ERROR_INVALID_EMAIL_FORMAT } from 'src/app/shared/constants/error-messages.constants';
import { EMAIL_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
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
  appRoutes = APP_ROUTES;

  // Allow contstants to be used in the HTML
  errorTextInvalidEmailFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;

  private readonly authService = inject(AuthService);
  private readonly routingService = inject(RoutingService);

  validateEmail(email: string): boolean {
    return EMAIL_PATTERN.test(email);
  }

  validateInputs(): void {
    if (this.validateEmail(this.email)) {
      this.inputsValid = true;
      this.errorMessage = '';
    } else {
      this.inputsValid = false;
      this.errorMessage = 'Invalid email format';
    }
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
      error: error => {
        if (typeof error === 'object' && error.message) {
          console.error('Login error:', error);
          this.errorMessage = error.message;
        } else {
          console.error('Login error:', error);
          this.errorMessage = 'An error occurred while resetting the password';
        }
      },
    });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
