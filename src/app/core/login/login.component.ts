import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import {
  LoginCredentials,
  LoginResponse,
} from 'src/app/models/user-auth.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
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
import { RedAlertThemeService } from 'src/app/shared/services/red-alert-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
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
  inputsValid = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private renderer: Renderer2,
    private el: ElementRef,
    private redAlertThemeService: RedAlertThemeService,
    private routingService: RoutingService,
  ) {}
  appRoutes = APP_ROUTES;

  onLogin() {
    const credentials: LoginCredentials = {
      email: this.email,
      password: this.password,
    };

    this.authService.login(credentials).subscribe({
      next: (response: LoginResponse) => {
        this.authService.saveToken(response.access_token, response.expires_in);
        this.router.navigate([this.appLoggedInHome]);
      },
      error: (error: HttpErrorResponse) => {
        let errMessage = '';
        switch (error.status) {
          case 0:
            console.error(MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT);
            errMessage = MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT;
            break;
          case 401:
            errMessage =
              error.error.message === 'Email not verified'
                ? MSG_ERROR_EMAIL_NOT_VERIFIED_DISPLAY_TEXT
                : MSG_ERROR_INVALID_LOGIN_DISPLAY_TEXT;
            break;
          default:
            errMessage = error.error.message;
            break;
        }
        this.displayErrorMessage(errMessage);
      },
      complete: () => {
        this.resetErrorMessage();
      },
    });
  }

  displayErrorMessage(message: string) {
    this.applyErrorStylesheet();
    this.errorMessage = message;

    setTimeout(() => {
      this.resetErrorMessage();
    }, this.showErrorMilliseconds);
  }

  resetErrorMessage(): void {
    this.errorMessage = ''; // Reset error message
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
    this.redAlertThemeService.applyRedAlertThemeThenClearAfterAShortTime(
      this.renderer,
      this.el.nativeElement,
    );
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
