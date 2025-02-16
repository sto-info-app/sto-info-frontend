import { Component, Input } from '@angular/core';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { GeneralThemeService } from 'src/app/shared/services/general-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-main-content',
  templateUrl: './main-content.component.html',
  standalone: false,
})
export class MainContentComponent {
  @Input() isLoggedIn!: boolean;

  appTitle = environment.appTitle;
  appRoutes = APP_ROUTES;
  themePanel6RandomText: string;

  constructor(
    private readonly routingService: RoutingService,
    private readonly generalThemeService: GeneralThemeService,
  ) {
    this.themePanel6RandomText =
      this.generalThemeService.createDynamicSideColumnText();
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
