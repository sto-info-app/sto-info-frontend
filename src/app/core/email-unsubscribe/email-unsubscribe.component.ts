import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { NotificationEmailType } from 'src/app/dashboard/models/notification-email.model';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsSuccessMessageComponent } from 'src/app/shared/components/lcars-success-message/lcars-success-message.component';
import { API_URLS } from 'src/app/shared/constants/api-routing.constants';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT } from 'src/app/shared/constants/error-messages.constants';

/** What a link turns off, as the API describes it. */
export interface UnsubscribeResult {
  types: { type: NotificationEmailType; label: string }[];
}

/** Where the page stands. */
export type UnsubscribeState =
  'loading' | 'confirm' | 'saving' | 'done' | 'invalid' | 'failed';

/** Said for a link the API does not accept. */
export const INVALID_LINK_MESSAGE =
  'That unsubscribe link is not valid. Sign in and use your email notification settings instead.';

/**
 * Stops the emails an unsubscribe link names, without signing in (sc-1067).
 *
 * Opening the link changes nothing: mail scanners open links too. The page
 * says what the link turns off and waits for the reader to confirm.
 */
@Component({
  selector: 'app-email-unsubscribe',
  templateUrl: './email-unsubscribe.component.html',
  styleUrls: ['./email-unsubscribe.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    LcarsErrorMessageComponent,
    LcarsSuccessMessageComponent,
  ],
})
export class EmailUnsubscribeComponent implements OnInit {
  readonly state = signal<UnsubscribeState>('loading');
  /** The labels of the emails the link names. */
  readonly labels = signal<string[]>([]);
  readonly errorMessage = signal('');
  readonly settingsLink = `/${APP_ROUTES.STO_DASHBOARD_SETTINGS}`;
  readonly settingsQuery = { tab: 'notifications' };

  private readonly _http = inject(HttpClient);
  private readonly _route = inject(ActivatedRoute);
  private _token = '';

  ngOnInit(): void {
    this._token = this._route.snapshot.queryParamMap.get('token') ?? '';

    if (this._token === '') {
      this.fail(400);

      return;
    }

    this._http
      .get<UnsubscribeResult>(API_URLS.EMAIL_UNSUBSCRIBE, {
        params: { token: this._token },
      })
      .subscribe({
        next: result => {
          this.labels.set(result.types.map(type => type.label));
          this.state.set('confirm');
        },
        error: (error: { status?: number }) => this.fail(error.status),
      });
  }

  /** Turns the emails off. */
  confirm(): void {
    this.state.set('saving');
    this._http
      .post<UnsubscribeResult>(API_URLS.EMAIL_UNSUBSCRIBE, null, {
        params: { token: this._token },
      })
      .subscribe({
        next: result => {
          this.labels.set(result.types.map(type => type.label));
          this.state.set('done');
        },
        error: (error: { status?: number }) => this.fail(error.status),
      });
  }

  /**
   * Says why nothing changed.
   *
   * @param status - The HTTP status, if any.
   */
  private fail(status: number | undefined): void {
    if (status === 400) {
      this.state.set('invalid');
      this.errorMessage.set(INVALID_LINK_MESSAGE);

      return;
    }

    this.state.set('failed');
    this.errorMessage.set(
      status === 0
        ? MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT
        : 'Your emails could not be changed just now. Please try again.',
    );
  }
}
