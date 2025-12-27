import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
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
import { progressBarAnimation } from 'src/app/shared/animation/progress-bar.animation';
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
import { EMAIL_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
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
  animations: [progressBarAnimation],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class LoginComponent implements OnDestroy {
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

  private readonly sharedDataService = inject(SharedDataService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  private readonly alertThemeService = inject(AlertThemeService);
  private readonly routingService = inject(RoutingService);
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

        // Store the user ID in the shared data service
        this.sharedDataService.updateUserId(response.user_id);

        // Get the URL the user was originally trying to access
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // If there's a return URL, navigate to it. Otherwise, navigate to a default page.
        this.router.navigate([returnUrl ?? this.appLoggedInHome]);
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
        this.displayErrorMessage(errMessage, error.status);
        this.isSubmitting = false;
      },
      complete: () => {
        this.resetErrorMessage();
        this.isSubmitting = false;
      },
    });
  }

  displayErrorMessage(message: string, httpStatus?: number) {
    this.applyErrorStylesheet(httpStatus);
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

  private applyErrorStylesheet(httpStatus?: number) {
    const state =
      typeof httpStatus === 'number'
        ? alertStateFromHttpStatus(httpStatus)
        : 'red';

    this.alertThemeService.applyAlertThemeThenClearAfterAShortTime(
      this.renderer,
      this.el.nativeElement,
      state,
    );
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  ngOnDestroy(): void {
    this.alertThemeService.clearAlertStylesheet(
      this.renderer,
      this.el.nativeElement,
    );
    this.alertThemeService.clearTimers(this.el.nativeElement);
  }
}
