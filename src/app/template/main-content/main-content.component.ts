import { HttpClient, HttpResponse } from '@angular/common/http';
import { Component, Input, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  HTTP_RESPONSE_TYPE_TEXT,
  HTTP_STATUS_OK,
} from 'src/app/shared/constants/http.constants';
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
  frontendAppVersion = environment.version || '';
  backendAppVersion = '';
  appRoutes = APP_ROUTES;
  themePanel6RandomText: string;

  private readonly routingService = inject(RoutingService);
  private readonly generalThemeService = inject(GeneralThemeService);
  private readonly http = inject(HttpClient);

  /**
   * Initializes the main content component and kicks off
   * generation of side panel text and retrieval of the
   * backend application version from the API.
   */
  constructor() {
    this.themePanel6RandomText =
      this.generalThemeService.createDynamicSideColumnText();

    this.http
      .get(`${environment.apiUrl}/version`, {
        observe: 'response',
        responseType: HTTP_RESPONSE_TYPE_TEXT,
      })
      .subscribe(response => {
        this.updateBackendVersion(response);
      });
  }

  /**
   * Updates the tracked backend application version based on the
   * HTTP response from the version endpoint.
   *
   * @param response The HTTP response containing the backend version payload.
   */
  private updateBackendVersion(response: HttpResponse<string>): void {
    if (
      response.status === HTTP_STATUS_OK &&
      typeof response.body === 'string'
    ) {
      this.backendAppVersion = response.body;
    }
  }

  /**
   * Builds a router link for the provided route identifier.
   *
   * @param route The route key or path segment to navigate to.
   * @returns A normalized link string suitable for routerLink.
   */
  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
