import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MustMatch } from 'src/app/shared/_helpers/must-match.validator';
import { MIN_CHARS_PASSWORD } from 'src/app/shared/constants/forms.constants';
import { PASSWORD_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
})
export class ChangePasswordComponent implements OnInit {
  token: string = '';
  changePasswordForm: FormGroup;
  seriousErrorMessage: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  minCharsInPassword: number = MIN_CHARS_PASSWORD;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {
    this.changePasswordForm = this.formBuilder.group(
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
        validator: MustMatch('password', 'confirmPassword'),
      },
    );
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.seriousErrorMessage =
        'Invalid or missing token. Please request a new password reset.';
      return; // No need to continue the function execution
    }
  }

  onSubmit() {
    if (this.changePasswordForm.valid) {
      this.authService
        .changePassword(this.token, this.changePasswordForm.value.password)
        .subscribe(
          () => {
            this.successMessage = 'Your password has been changed.';
            if (this.authService.isLoggedIn()) {
              // Logout the user after successfully changing the password
              this.authService.performLogout();
              this.successMessage += ' You will need to login again.';
            }
          },
          error => {
            console.error(error);

            if (
              error.status === 400 &&
              error.error.message === 'Token expired'
            ) {
              this.seriousErrorMessage =
                'Your password reset link has expired. You need to request a new another reset email.';
            } else {
              this.errorMessage =
                'There was an error changing your password. Please try again in a moment.';
              this.resetErrorMessage();
            }
          },
        );
    }
  }

  resetErrorMessage(): void {
    setTimeout(() => {
      this.errorMessage = ''; // Reset error message
    }, MILLISECONDS_SHOW_ERROR_MSG);
  }
}
