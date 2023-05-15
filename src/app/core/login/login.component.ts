import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import {
  FORM_ERROR_INVALID_EMAIL_FORMAT,
  MSG_ERROR_EMAIL_NOT_VERIFIED_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_INVALID_LOGIN_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { EMAIL_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import {
  MILLISECONDS_SHOW_ERROR_MSG,
  MILLISECONDS_SHOW_RED_ALERT_THEME,
} from 'src/app/shared/constants/timings.constants';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  // Allow environment contstants to be used in the HTML
  appLoggedInHome: string = environment.appLoggedInHome;

  // Allow contstants to be used in the HTML
  showErrorMilliseconds: number = MILLISECONDS_SHOW_ERROR_MSG;
  showRedAlertMilliseconds: number = MILLISECONDS_SHOW_RED_ALERT_THEME;
  errorTextInvalidEmailFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;

  email = '';
  password = '';
  errorMessage = '';
  inputsValid: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private el: ElementRef,
  ) {}

  onLogin() {
    const credentials = {
      email: this.email,
      password: this.password,
    };

    this.authService.login(credentials).subscribe({
      next: (response: any) => {
        this.authService.saveToken(response.access_token);
        this.router.navigate([this.appLoggedInHome]);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 0) {
          console.error(MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT);
          this.displayErrorMessage(MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT);
        } else if (error.status === 401) {
          let errMessage = MSG_ERROR_INVALID_LOGIN_DISPLAY_TEXT;
          if (error.error.message === 'Email not verified') {
            errMessage = MSG_ERROR_EMAIL_NOT_VERIFIED_DISPLAY_TEXT;
          }
          console.error('Login error:', errMessage);
          this.displayErrorMessage(errMessage);
        } else {
          console.error('Login error:', error);
          this.displayErrorMessage(error.error.message);
        }
      },
      complete: () => {
        // console.log('Login complete');
      },
    });
    //TODO: Delete console logging!
  }

  displayErrorMessage(message: string) {
    this.applyErrorStylesheet();
    this.errorMessage = message;

    setTimeout(() => {
      this.errorMessage = ''; // Reset error message
    }, this.showErrorMilliseconds);
  }

  validateInputs() {
    // check if both inputs are non-empty and email is valid
    this.inputsValid =
      this.email.trim() !== '' &&
      this.password.trim() !== '' &&
      this.validateEmail(this.email);
  }

  validateEmail(email: string): boolean {
    const regex = new RegExp(EMAIL_PATTERN);
    return regex.test(email);
  }

  private applyErrorStylesheet() {
    // Create a link element for the red alert stylesheet
    const errorStyleLink = this.renderer.createElement('link');

    // Set the link element attributes
    this.renderer.setAttribute(errorStyleLink, 'rel', 'stylesheet');
    this.renderer.setAttribute(
      errorStyleLink,
      'href',
      'assets/lcars/lcars-red-alert.css',
    );
    this.renderer.setAttribute(errorStyleLink, 'id', 'red-alert-style-link');

    // Add the red alert stylesheet to the head of the document
    this.renderer.appendChild(
      this.el.nativeElement.ownerDocument.head,
      errorStyleLink,
    );

    // Remove the red alert stylesheet after 30 seconds
    setTimeout(() => {
      this.renderer.removeChild(
        this.el.nativeElement.ownerDocument.head,
        errorStyleLink,
      );
    }, this.showRedAlertMilliseconds);
  }
}
