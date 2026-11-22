import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Observable } from 'rxjs';

import { AuthService } from 'src/app/core/auth/auth.service';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

import { CommunityTabsComponent } from './community-tabs/community-tabs.component';
import { SettingsLinkComponent } from 'src/app/shared/components/settings-link/settings-link.component';
import { SETTINGS_LINKS } from 'src/app/shared/constants/settings-links.constants';

/**
 * The Community landing page — the About tab — introducing the Galactic
 * Personnel Registry, the friends list and the Fleet directory. Every other
 * section of the community is reached from the tab strip.
 */
@Component({
  selector: 'app-community',
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CommunityTabsComponent,
    CollapsibleSectionComponent,
    SettingsLinkComponent,
  ],
})
export class CommunityComponent {
  /** The cog on the registry's bar, to whether the reader is listed. */
  readonly settingsLink = SETTINGS_LINKS.registry;

  private readonly _authService = inject(AuthService);
  private readonly _fleetConfiguration = inject(FleetConfigurationService);

  /**
   * Whether to describe the Fleet section at all.
   *
   * The whole block goes when the server says the feature is off, rather
   * than its links alone: prose describing something that is not there is
   * worse than silence. An unreachable backend leaves it, because the
   * section's own page is what explains an outage.
   */
  readonly isFleetOffered$: Observable<boolean> =
    this._fleetConfiguration.isOffered();

  readonly fleetDirectoryLink = FLEET_LINKS.fleetDirectory();
  readonly communityDirectoryLink = FLEET_LINKS.communityDirectory();
  readonly armadaDirectoryLink = FLEET_LINKS.armadaDirectory();
  readonly registerLink = '/' + APP_ROUTES.FLEET_REGISTER;

  /**
   * Whether to offer registration.
   *
   * Signed in is the only condition checked, matching the Community
   * directory's own button: the registration page sits behind the auth
   * guard, and every other guarded destination in the navigation —
   * Friends, the dashboard, Your Accounts — is hidden rather than offered
   * and then refused.
   *
   * @returns True when somebody is signed in.
   */
  get canRegister(): boolean {
    return this._authService.isLoggedIn();
  }
}
