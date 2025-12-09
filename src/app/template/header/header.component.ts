import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { TimeFormatPipe } from 'src/app/shared/pipes/time-format.pipe';
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
export class HeaderComponent implements AfterViewInit, OnDestroy {
  @Input() showScrollButton = false;
  @Input() isLoggedIn!: boolean;
  @Input() autoLogoutCountdown = 0;
  @Input() logout!: () => void;

  @ViewChild('scrollTopButton')
  scrollTopButton!: ElementRef;

  private readonly zone = inject(NgZone);
  private readonly routingService = inject(RoutingService);
  private readonly generalThemeService = inject(GeneralThemeService);
  private readonly debuggingService = inject(DebuggingService);

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

  constructor() {
    this.dataCascade = this.generalThemeService.createDynamicDataCascade();
    this.themePanel2RandomText =
      this.generalThemeService.createDynamicSideColumnText();
  }

  ngAfterViewInit() {
    globalThis.addEventListener?.('scroll', this.scrollCallbackFunction);
  }

  ngOnDestroy() {
    // Unsubscribe from the Observables when the component is destroyed
    globalThis.removeEventListener?.('scroll', this.scrollCallbackFunction);
  }

  toggleScrollTopButton() {
    const scrollY = (globalThis as Window | typeof globalThis).scrollY ?? 0;
    this.showScrollButton = scrollY > 100;
  }

  scrollToTop() {
    (globalThis as Window | typeof globalThis).scrollTo?.({
      top: 0,
      behavior: 'smooth',
    });
  }

  getRouteLink(route: string): string {
    return this.routingService.getLink(route);
  }
}
