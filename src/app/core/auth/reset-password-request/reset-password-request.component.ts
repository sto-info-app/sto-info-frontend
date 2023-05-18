import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FORM_ERROR_INVALID_EMAIL_FORMAT } from 'src/app/shared/constants/error-messages.constants';
import { EMAIL_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-reset-password-request',
  templateUrl: './reset-password-request.component.html',
  styleUrls: ['./reset-password-request.component.scss'],
})
export class ResetPasswordRequestComponent {
  email: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  inputsValid: boolean = false;

  // Allow contstants to be used in the HTML
  errorTextInvalidEmailFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;

  constructor(private authService: AuthService, private router: Router) {}

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

    this.authService.resetPassword(this.email).subscribe(
      response => {
        this.successMessage = `Check your email and follow the instructions to reset your password.`;
        this.errorMessage = '';
      },
      error => {
        // Handle error
        this.errorMessage = 'An error occurred while resetting the password';
      },
    );
  }
}
