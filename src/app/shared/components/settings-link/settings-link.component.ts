import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from 'src/app/core/auth/auth.service';

import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { SettingsLinkTarget } from 'src/app/shared/constants/settings-links.constants';

/**
 * A cog beside a page's heading, going straight to the settings for that
 * place: the tab of the Settings page, and the setting itself when there is
 * one, which the page scrolls to and focuses.
 *
 * Only an icon, so it is named for screen readers and in its tooltip. It sits
 * with the heading in a `page-heading-row`, which the global styles lay out.
 * Shown only to somebody signed in: many of the pages it sits on are public,
 * and Settings would only ask a visitor to sign in.
 */
@Component({
  selector: 'app-settings-link',
  templateUrl: './settings-link.component.html',
  styleUrls: ['./settings-link.component.scss'],
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsLinkComponent {
  /** Where it leads, from `SETTINGS_LINKS`. */
  readonly target = input.required<SettingsLinkTarget>();

  readonly settingsPath = `/${APP_ROUTES.STO_DASHBOARD_SETTINGS}`;

  /** Read once: signing out leaves the page, so it never changes under it. */
  readonly isSignedIn = inject(AuthService).isLoggedIn();
}
