import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { MessageType } from '../../shared/models/lcars-message-type.enum';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  messageType: MessageType = MessageType.Info;
  MessageType = MessageType;
  message = '';
  token = '';
  showResendVerificationEmailButton = false;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

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
    this.http;
    this.http
      .post(`${environment.apiUrl}/auth/verify-email`, { token: this.token })
      .subscribe({
        next: (response: any) => {
          this.message = 'Verification successful! You can now login.';
          this.messageType = MessageType.Success;
          this.showResendVerificationEmailButton = false;
        },
        error: error => {
          if (error.status === 400 && error.error.message === 'Token expired') {
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
          this.message =
            'Failed to resend verification email. Please try again.';
          this.messageType = MessageType.Error;
          this.showResendVerificationEmailButton = true;
        },
      });
  }
}
