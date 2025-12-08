import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TimeFormatPipe } from 'src/app/shared/pipes/time-format.pipe';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { DebuggingService } from 'src/app/shared/services/debugging.service';
import { GeneralThemeService } from 'src/app/shared/services/general-theme.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, TimeFormatPipe],
})
export class HeaderComponent implements AfterViewInit {
  @Input() showScrollButton = false;
  @Input() isLoggedIn!: boolean;
  @Input() autoLogoutCountdown = 0;
  @Input() logout!: () => void;

  @ViewChild('scrollTopButton')
  scrollTopButton!: ElementRef;

  appTitle = environment.appTitle;
  appRoutes = APP_ROUTES;

  // Check debugging mode
  appDebugging = this.debuggingService.allowDebugging();

  dataCascade: string;
  themePanel2RandomText: string;

  scrollCallbackFunction = (): void => {
    this.zone.run(() => {
      this.toggleScrollTopButton();
    });
  };
  showScrollTop = false;

  constructor(
    private readonly zone: NgZone,
    private readonly routingService: RoutingService,
    private readonly generalThemeService: GeneralThemeService,
    private readonly debuggingService: DebuggingService,
  ) {
    this.dataCascade = this.generalThemeService.createDynamicDataCascade();
    this.themePanel2RandomText =
      this.generalThemeService.createDynamicSideColumnText();
  }

  ngAfterViewInit() {
    window.addEventListener('scroll', this.scrollCallbackFunction);
  }

  ngOnDestroy() {
    // Unsubscribe from the Observables when the component is destroyed
    window.addEventListener('scroll', this.scrollCallbackFunction);
  }

  toggleScrollTopButton() {
    this.showScrollButton = window.scrollY > 100;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
