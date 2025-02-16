import { Component, Input } from '@angular/core';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { GeneralThemeService } from 'src/app/shared/services/general-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  standalone: false,
})
export class SideBarComponent {
  @Input() isLoggedIn!: boolean;

  appRoutes = APP_ROUTES;
  themePanel6RandomText: string;

  isPenel5Hidden = false;
  isPenel7Hidden = false;
  isPenel8Hidden = false;
  isPenel10Hidden = false;

  constructor(
    private routingService: RoutingService,
    private generalThemeService: GeneralThemeService,
  ) {
    this.themePanel6RandomText =
      this.generalThemeService.createDynamicSideColumnText();
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }

  onResize(event: DOMRectReadOnly): void {
    this.isPenel5Hidden = event.height >= 900;
    this.isPenel7Hidden = event.height >= 1200;
    this.isPenel10Hidden = event.height >= 1500;
    this.isPenel8Hidden = event.height >= 1800;
  }
}
