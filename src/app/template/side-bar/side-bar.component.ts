import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
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
  themePanel6RandomText: string;

  isPanel5Hidden = false;
  isPanel7Hidden = false;
  isPanel8Hidden = false;
  isPanel10Hidden = false;

  private readonly routingService = inject(RoutingService);
  private readonly generalThemeService = inject(GeneralThemeService);

  constructor() {
    this.themePanel6RandomText =
      this.generalThemeService.createDynamicSideColumnText();
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
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
