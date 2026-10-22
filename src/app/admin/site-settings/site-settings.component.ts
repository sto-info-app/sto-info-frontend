import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AdminSideNavigationComponent } from 'src/app/admin/admin-side-navigation/admin-side-navigation.component';
import { FeatureSwitchesComponent } from 'src/app/admin/feature-switches/feature-switches.component';
import { PublicationPauseComponent } from 'src/app/admin/publication-pause/publication-pause.component';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';

/**
 * The site's own settings, for site administrators (FC-054): the publication
 * pause (FC-042) and the features' master switches (FC-045), moved here from
 * the Admin page, where they used to sit beneath the Operations cards.
 *
 * Every setting is an LCARS panel of its own, one to a row: Publication
 * first, then one panel a feature. The grid rotates the palette across them,
 * Publication taking the first colour and the features the rest in turn, and
 * Publication turns red while it is paused.
 */
@Component({
  selector: 'app-site-settings',
  templateUrl: './site-settings.component.html',
  styleUrls: [
    '../news-admin/news-admin.component.scss',
    './site-settings.component.scss',
  ],
  standalone: true,
  imports: [
    AdminSideNavigationComponent,
    FeatureSwitchesComponent,
    HelpLinkComponent,
    PublicationPauseComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteSettingsComponent {}
