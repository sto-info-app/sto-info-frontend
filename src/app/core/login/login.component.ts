import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  Renderer2,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  LoginCredentials,
  LoginResponse,
} from 'src/app/models/user-auth.models';
import { alertStateFromHttpStatus } from 'src/app/shared/_helpers/alert-state-from-http-status';
import { validateEmail } from 'src/app/shared/_helpers/validate-email';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  FORM_ERROR_INVALID_EMAIL_FORMAT,
  MSG_ERROR_EMAIL_NOT_VERIFIED_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_INVALID_LOGIN_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { MILLISECONDS_SHOW_ERROR_MSG } from 'src/app/shared/constants/timings.constants';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SharedDataService } from 'src/app/shared/services/shared-data.service';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class LoginComponent implements OnDestroy {
  /** Precomputed router link to the registration page. */
  readonly registerLink = `/${APP_ROUTES.REGISTER}`;

  /** Precomputed router link to the reset-password page. */
  readonly resetPasswordLink = `/${APP_ROUTES.RESET_PASSWORD}`;

  // Allow environment constants to be used in the HTML
  appLoggedInHome: string = environment.appLoggedInHome;

  // Allow constants to be used in the HTML
  showErrorMilliseconds: number = MILLISECONDS_SHOW_ERROR_MSG;
  errorTextInvalidEmailFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;

  email = '';
  password = '';
  errorMessage = '';
  inputsValid = false;
  isSubmitting = false;
  emailTouched = false;

  /** Whether the current email value passes format validation. Updated by validateInputs(). */
  isEmailValid = false;

  private readonly _sharedDataService = inject(SharedDataService);
  private readonly _authService = inject(AuthService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _renderer = inject(Renderer2);
  private readonly _el = inject(ElementRef);
  private readonly _alertThemeService = inject(AlertThemeService);
  private readonly _routingService = inject(RoutingService);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Submits the login form, stores the session tokens, and routes the user onward.
   */
  onLogin() {
    if (!this.inputsValid) return;
    this.isSubmitting = true;

    const credentials: LoginCredentials = {
      email: this.email,
      password: this.password,
    };

    this._authService.login(credentials).subscribe({
      next: (response: LoginResponse) => {
        this._authService.saveToken(
          response.access_token,
          response.refresh_token,
          response.expires_in,
          response.session_timeout_minutes,
        );

        // Store the user ID in the shared data service
        this._sharedDataService.updateUserId(response.user_id);

        // Get the URL the user was originally trying to access
        const returnUrl = this._route.snapshot.queryParamMap.get('returnUrl');
        // Navigate to the return URL if present, otherwise the default page.
        // navigateByUrl parses the full URL string so any query params or
        // fragment on the return URL are preserved rather than being encoded
        // into a single path segment (as router.navigate([...]) would do).
        this._router.navigateByUrl(returnUrl ?? this.appLoggedInHome);
      },
      error: (error: HttpErrorResponse) => {
        let errMessage: string;
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
        this.displayErrorMessage(errMessage, error.status);
        this.isSubmitting = false;
        this._cdr.markForCheck();
      },
      complete: () => {
        this.resetErrorMessage();
        this.isSubmitting = false;
        this._cdr.markForCheck();
      },
    });
  }

  /**
   * Displays a transient login error message and applies the alert styling.
   *
   * @param message The message to display.
   * @param httpStatus The HTTP status used to derive the alert theme.
   */
  displayErrorMessage(message: string, httpStatus?: number) {
    this._applyErrorStylesheet(httpStatus);
    this.errorMessage = message;

    setTimeout(() => {
      this.resetErrorMessage();
      this._cdr.markForCheck();
    }, this.showErrorMilliseconds);
  }

  /**
   * Clears the current error message.
   */
  resetErrorMessage(): void {
    this.errorMessage = ''; // Reset error message
  }

  /**
   * Validates the login form inputs and updates the submit state.
   */
  validateInputs() {
    // check if both inputs are non-empty and email is valid
    this.isEmailValid = this.validateEmail(this.email);
    this.inputsValid =
      this.email.trim() !== '' &&
      this.password.trim() !== '' &&
      this.isEmailValid;
  }

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
   * Resolves a route key into a router link.
   *
   * @param route The route key.
   * @returns The resolved link.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Removes alert styling when the component is destroyed.
   */
  ngOnDestroy(): void {
    this._alertThemeService.clearAlertStylesheet(
      this._renderer,
      this._el.nativeElement,
    );
    this._alertThemeService.clearTimers(this._el.nativeElement);
  }

  /**
   * Applies an alert stylesheet that matches the current HTTP error status.
   *
   * @param httpStatus The HTTP status used to determine the alert state.
   */
  private _applyErrorStylesheet(httpStatus?: number) {
    const state =
      typeof httpStatus === 'number'
        ? alertStateFromHttpStatus(httpStatus)
        : 'red';

    this._alertThemeService.applyAlertThemeThenClearAfterAShortTime(
      this._renderer,
      this._el.nativeElement,
      state,
    );
  }
}
