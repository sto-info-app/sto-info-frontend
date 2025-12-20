import { Component, Input, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { GeneralThemeService } from 'src/app/shared/services/general-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';
import { FooterComponent } from '../footer/footer.component';
import { MainContentBarPanelComponent } from '../main-content-bar-panel/main-content-bar-panel.component';
import { SideBarComponent } from '../side-bar/side-bar.component';

@Component({
  selector: 'app-main-content',
  templateUrl: './main-content.component.html',
  standalone: true,
  imports: [
    SideBarComponent,
    MainContentBarPanelComponent,
    RouterOutlet,
    FooterComponent,
  ],
})
export class MainContentComponent {
  @Input() isLoggedIn!: boolean;

  appTitle = environment.appTitle;
  appVersion = environment.version;
  appRoutes = APP_ROUTES;
  themePanel6RandomText: string;

  private readonly routingService = inject(RoutingService);
  private readonly generalThemeService = inject(GeneralThemeService);

  constructor() {
    this.themePanel6RandomText =
      this.generalThemeService.createDynamicSideColumnText();
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
