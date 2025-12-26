import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { MessageType } from '../../shared/models/lcars-message-type.enum';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class VerifyEmailComponent implements OnInit {
  messageType: MessageType = MessageType.Info;
  MessageType = MessageType;
  message = '';
  token = '';
  showResendVerificationEmailButton = false;
  appRoutes = APP_ROUTES;

  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly routingService = inject(RoutingService);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.message = 'Invalid token!';
        this.messageType = MessageType.Error;
      }
    });
  }

  verifyEmail() {
    this.http
      .post(API_URLS.AUTH_VERIFICATION_EMAIL, { token: this.token })
      .subscribe({
        next: () => {
          this.message = 'Verification successful! You can now login.';
          this.messageType = MessageType.Success;
          this.showResendVerificationEmailButton = false;
        },
        error: error => {
          if (error.status === 0) {
            console.error(MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT);
            this.message = MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT;
          } else if (
            error.status === 400 &&
            error.error.message === 'Token expired'
          ) {
            this.message = 'Your verification link has expired';
          } else {
            this.message = 'Verification failed. Please try again.';
          }
          this.messageType = MessageType.Error;
          this.showResendVerificationEmailButton = true;
        },
      });
  }

  resendVerificationEmail() {
    this.http
      .post(API_URLS.AUTH_RESEND_VERIFICATION_EMAIL, {
        token: this.token,
      })
      .subscribe({
        next: () => {
          this.message = 'Verification email sent. Please check your email.';
          this.messageType = MessageType.Info;
          this.showResendVerificationEmailButton = false;
        },
        error: error => {
          if (error.status === 0) {
            console.error(MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT);
            this.message = MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT;
          } else {
            this.message =
              'Failed to resend verification email. Please try again.';
          }
          this.messageType = MessageType.Error;
          this.showResendVerificationEmailButton = true;
        },
      });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
