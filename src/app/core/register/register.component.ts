import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  FORM_ERROR_CONFIRMATION_PASSWORD_REQUIRED,
  FORM_ERROR_EMAIL_ALREADY_REGISTERED,
  FORM_ERROR_EMAIL_REQUIRED,
  FORM_ERROR_FIRSTNAME_REQUIRED,
  FORM_ERROR_INVALID_EMAIL_FORMAT,
  FORM_ERROR_LASTNAME_REQUIRED,
  FORM_ERROR_PASSWORDS_DO_NOT_MATCH,
  FORM_ERROR_PASSWORD_COMPLEXITY,
  FORM_ERROR_PASSWORD_MIN_LENGTH,
  FORM_ERROR_PASSWORD_REQUIRED,
  FORM_ERROR_USERNAME_MIN_LENGTH,
  FORM_ERROR_USERNAME_PATTERN,
  FORM_ERROR_USERNAME_REQUIRED,
  FORM_ERROR_USERNAME_TAKEN,
} from 'src/app/shared/constants/error-messages.constants';
import {
  MIN_CHARS_PASSWORD,
  MIN_CHARS_USERNAME,
} from 'src/app/shared/constants/forms.constants';
import {
  EMAIL_PATTERN,
  PASSWORD_PATTERN,
  USERNAME_PATTERN,
} from 'src/app/shared/constants/regex-patterns.constants';
import { MustMatch } from '../../shared/_helpers/must-match.validator';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  submitted = false;

  // Allow contstants to be used in the HTML
  errorTextFirstNameRequired: string = FORM_ERROR_FIRSTNAME_REQUIRED;
  errorTextLastNameRequired: string = FORM_ERROR_LASTNAME_REQUIRED;
  errorTextUsernameRequired: string = FORM_ERROR_USERNAME_REQUIRED;
  errorTextUsernameMinLength: string = FORM_ERROR_USERNAME_MIN_LENGTH;
  errorTextUsernameTaken: string = FORM_ERROR_USERNAME_TAKEN;
  errorTextUsernamePattern: string = FORM_ERROR_USERNAME_PATTERN;
  errorTextEmailRequired: string = FORM_ERROR_EMAIL_REQUIRED;
  errorTextEmailInvalidFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;
  errorTextEmailAlreadyRegistered: string = FORM_ERROR_EMAIL_ALREADY_REGISTERED;
  errorTextPasswordsDoNotMatch: string = FORM_ERROR_PASSWORDS_DO_NOT_MATCH;
  errorTextPasswordRequired: string = FORM_ERROR_PASSWORD_REQUIRED;
  errorTextPasswordMinLength: string = FORM_ERROR_PASSWORD_MIN_LENGTH;
  errorTextPasswordComplexity: string = FORM_ERROR_PASSWORD_COMPLEXITY;
  errorTextConfirmationPasswordRequired: string =
    FORM_ERROR_CONFIRMATION_PASSWORD_REQUIRED;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.registerForm = this.formBuilder.group(
      {
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        username: [
          '',
          [
            Validators.required,
            Validators.minLength(MIN_CHARS_USERNAME),
            Validators.pattern(USERNAME_PATTERN),
          ],
        ],
        email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
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
          Validators.required,
          Validators.minLength(MIN_CHARS_PASSWORD),
          Validators.pattern(PASSWORD_PATTERN),
        ],
      },
      { validator: MustMatch('password', 'confirmPassword') },
    );
  }

  onRegister() {
    this.submitted = true;

    if (this.registerForm.invalid) {
      return;
    }

    const credentials = this.registerForm.value;

    this.authService.register(credentials).subscribe({
      next: (response: any) => {
        this.router.navigate(['/register/complete']);
      },
      error: error => {
        if (error.status === 409) {
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
          // Handle other types of errors
        }
      },
      complete: () => {
        console.log('Registration complete');
      },
    });
  }
}
