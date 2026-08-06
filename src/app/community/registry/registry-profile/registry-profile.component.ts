import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AccountCardComponent } from 'src/app/shared/components/account-card/account-card.component';
import { AccountCardVm } from 'src/app/shared/components/account-card/account-card.model';
import { EntityAvatarComponent } from 'src/app/shared/components/entity-avatar/entity-avatar.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  APP_ROUTES,
  APP_ROUTE_TITLES,
} from 'src/app/shared/constants/app-routing.constants';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import {
  RegistryAccountSummary,
  RegistryProfile,
} from '../../models/registry.models';
import { buildRegistryAccountCard } from '../registry-card.builders';
import { RegistryPageBaseDirective } from '../registry-page-base.directive';
import { RegistryService } from '../registry.service';

/**
 * A registry member's public profile: their identity and the STO accounts they
 * have chosen to show.
 */
@Component({
  selector: 'app-registry-profile',
  templateUrl: './registry-profile.component.html',
  styleUrls: ['./registry-profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    EntityAvatarComponent,
    AccountCardComponent,
  ],
})
export class RegistryProfileComponent
  extends RegistryPageBaseDirective
  implements OnInit
{
  private readonly _registryService = inject(RegistryService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _routingService = inject(RoutingService);
  private readonly _seoService = inject(SeoService);
  private readonly _pageTitleService = inject(PageTitleService);

  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;

  username = '';
  profile: RegistryProfile | null = null;

  /** Presentation models for the member's public accounts. */
  accountCards: AccountCardVm[] = [];

  /**
   * Reads the username from the route and loads the member's profile.
   */
  ngOnInit(): void {
    this.username = this._route.snapshot.paramMap.get('username') ?? '';

    this.runLoad(
      this._registryService.getProfile(this.username),
      profile => {
        this.profile = profile;
        this.accountCards = profile.accounts.map(account =>
          this.buildAccountCard(account),
        );
        this.applyProfileMeta(profile);
      },
      'Something went wrong loading this profile.',
    );
  }

  /**
   * Builds the read-only account card for one of this member's accounts.
   *
   * @param account - The public account summary.
   * @returns The card presentation model.
   */
  private buildAccountCard(account: RegistryAccountSummary): AccountCardVm {
    return buildRegistryAccountCard(account, this.username);
  }

  /**
   * Sets the page title and social meta once the member has loaded.
   *
   * @param profile - The loaded member profile.
   */
  private applyProfileMeta(profile: RegistryProfile): void {
    this._pageTitleService.setTitle(profile.username);
    this._seoService.setPageMeta(
      profile.username,
      `${profile.username} in the Galactic Personnel Registry: ` +
        `${profile.publicAccountCount} account(s) and ` +
        `${profile.publicCharacterCount} captain(s).`,
      profile.profilePicture300 ?? undefined,
    );
  }

  /**
   * Builds a router link for a route constant.
   *
   * @param route - The route constant.
   * @returns The path string.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
