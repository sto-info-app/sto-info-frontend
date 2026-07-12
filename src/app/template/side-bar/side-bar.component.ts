import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  APP_ROUTE_TITLES,
  APP_ROUTES,
} from 'src/app/shared/constants/app-routing.constants';
import { GeneralThemeService } from 'src/app/shared/services/general-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class SideBarComponent {
  @Input() isLoggedIn!: boolean;

  appRoutes = APP_ROUTES;
  appRouteTitles = APP_ROUTE_TITLES;
  themePanel6RandomText: string;

  isPanel5Hidden = false;
  isPanel7Hidden = false;
  isPanel8Hidden = false;
  isPanel10Hidden = false;

  private readonly _routingService = inject(RoutingService);
  private readonly _generalThemeService = inject(GeneralThemeService);
  private readonly _authService = inject(AuthService);

  constructor() {
    this.themePanel6RandomText =
      this._generalThemeService.createDynamicSideColumnText();
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  /**
   * Whether the current user is an administrator.
   *
   * @returns `true` when logged in as an admin user.
   */
  get isAdmin(): boolean {
    return this._authService.isLoggedInAsAdmin();
  }

  onResize(event: Event): void {
    const target = event.target as HTMLElement | null;
    const height = target?.getBoundingClientRect().height ?? 0;
    this.isPanel5Hidden = height >= 900;
    this.isPanel7Hidden = height >= 1200;
    this.isPanel10Hidden = height >= 1500;
    this.isPanel8Hidden = height >= 1800;
  }
}
