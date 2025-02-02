import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Renderer2 } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LoginCredentials,
  LoginResponse,
} from 'src/app/models/user-auth.models';
import { progressBarAnimation } from 'src/app/shared/animation/progress-bar.animation';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  FORM_ERROR_INVALID_EMAIL_FORMAT,
  MSG_ERROR_EMAIL_NOT_VERIFIED_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_INVALID_LOGIN_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { EMAIL_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';
import { RedAlertThemeService } from 'src/app/shared/services/red-alert-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    animations: [progressBarAnimation],
  standalone: false,
})
export class LoginComponent {
  // Allow environment contstants to be used in the HTML
  appLoggedInHome: string = environment.appLoggedInHome;

  // Allow contstants to be used in the HTML
  showErrorMilliseconds: number = MILLISECONDS_SHOW_ERROR_MSG;
  errorTextInvalidEmailFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;

  email = '';
  password = '';
  errorMessage = '';
  inputsValid = false;
  isSubmitting = false;

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly renderer: Renderer2,
    private readonly el: ElementRef,
    private readonly redAlertThemeService: RedAlertThemeService,
    private readonly routingService: RoutingService,
  ) {}
  appRoutes = APP_ROUTES;

  onLogin() {
    if (!this.inputsValid) return;
    this.isSubmitting = true;

    const credentials: LoginCredentials = {
      email: this.email,
      password: this.password,
    };

    this.authService.login(credentials).subscribe({
      next: (response: LoginResponse) => {
        this.authService.saveToken(
          response.access_token,
          response.refresh_token,
          response.expires_in,
        );

        // Get the URL the user was originally trying to access
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // If there's a return URL, navigate to it. Otherwise, navigate to a default page.
        this.router.navigate([returnUrl || this.appLoggedInHome]);
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
              error.error?.message === 'Email not verified'
                ? MSG_ERROR_EMAIL_NOT_VERIFIED_DISPLAY_TEXT
                : MSG_ERROR_INVALID_LOGIN_DISPLAY_TEXT;
            break;
          case 408:
            console.error('Request timed out.');
            errMessage = 'The request timed out. Please try again.';
            break;
          default:
            errMessage = error.error?.message || 'Unknown error!';
            break;
        }
        this.displayErrorMessage(errMessage);
        this.isSubmitting = false;
      },
      complete: () => {
        this.resetErrorMessage();
        this.isSubmitting = false;
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
