import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';
import { MessageType } from '../../shared/models/lcars-message-type.enum';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
  standalone: false,
})
export class VerifyEmailComponent implements OnInit {
  messageType: MessageType = MessageType.Info;
  MessageType = MessageType;
  message = '';
  token = '';
  showResendVerificationEmailButton = false;
  appRoutes = APP_ROUTES;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly routingService: RoutingService,
  ) {}

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
      .post(`${environment.apiUrl}/auth/verify-email`, { token: this.token })
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
      .post(`${environment.apiUrl}/auth/resend-verification-email`, {
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
