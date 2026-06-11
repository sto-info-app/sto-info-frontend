import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  Renderer2,
} from '@angular/core';
import { distinctUntilChanged, filter, Subscription } from 'rxjs';
import { alertStateFromHttpStatus } from 'src/app/shared/_helpers/alert-state-from-http-status';
import { AlertPanelComponent } from 'src/app/shared/alert-panel';
import {
  API_HEALTH_STATE,
  API_HEALTH_STATE_DOWN,
  API_HEALTH_STATE_UNKNOWN,
  API_HEALTH_STATE_UP,
} from 'src/app/shared/constants/health.constants';
import { AlertState } from 'src/app/shared/constants/lcars-theme.constants';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
import { HealthService } from '../../../core/health/health.service';

@Component({
  selector: 'app-service-interruption-content',
  templateUrl: './service-interruption-content.component.html',
  styleUrls: ['./service-interruption-content.component.scss'],
  imports: [AlertPanelComponent],
  standalone: true,
})
export class ServiceInterruptionContentComponent implements OnDestroy {
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  private readonly alertThemeService = inject(AlertThemeService);
  private readonly subs = new Subscription();
  readonly _backendHealth = inject(HealthService);
  errorCode = 400;
  errorTitle = 'Service Unavailable';
  errorDescription = 'TRIBBLES! Tribbles are in the computer core!';
  alertState: AlertState = 'yellow';
  alertTitle = 'ALERT';
  alertSubtitle = 'Condition: Yellow';

  constructor() {
    this.subs.add(
      this._backendHealth.state$
        .pipe(
          filter((state): state is API_HEALTH_STATE => state != null),
          distinctUntilChanged(),
        )
        .subscribe(state => {
          if (state === API_HEALTH_STATE_UP) {
            this.errorCode = 200;
            this.errorTitle = 'All Systems Operational';
            this.errorDescription = `
                <p>Our sensors indicated a temporary failure within the primary data core.</p>
                <p>This interruption should now be resolved, please attempt your request again.</p>`;
          } else if (state === API_HEALTH_STATE_DOWN) {
            this.set503ErrorState();
            this.errorDescription = `
              <p>We're unable to establish a reliable connection to Memory Alpha at this time.
              Access to mission records and archived intelligence has been interrupted, 
              preventing us from retrieving the information you requested.</p>
              <p>Our engineers are actively investigating the issue and working to restore full access.
              Please try again later.</p>`;
          } else if (state === API_HEALTH_STATE_UNKNOWN) {
            this.set503ErrorState();
            this.errorDescription = `
              <p>We have encountered an unexpected systems failure. Our primary computer 
              core is currently unable to respond to incoming requests, and subspace 
              communication with Starfleet Command. Please try your request shortly.</p>`;
          } else {
            this.set503ErrorState();
            this.errorDescription = `
              <p>Our sensors indicated a temporary failure within the primary data core.</p>
              <p>Initial diagnostics are underway, please attempt your request again shortly.</p>`;
          }

          this.updateAlertFromStatusCode(this.errorCode);

          this.applyAlertStylesheet(this.alertState);
        }),
    );
  }

  ngOnDestroy(): void {
    this.subs?.unsubscribe();

    this.alertThemeService.clearAlertStylesheet(
      this.renderer,
      this.el.nativeElement,
    );
    this.alertThemeService.clearTimers(this.el.nativeElement);
  }

  private applyAlertStylesheet(colour: AlertState = 'yellow') {
    this.alertThemeService.applyAlertThemeThenApplyStaticTheme(
      this.renderer,
      this.el.nativeElement,
      colour,
    );
  }

  private updateAlertFromStatusCode(statusCode: number): void {
    this.alertState = alertStateFromHttpStatus(statusCode);

    const label =
      this.alertState.charAt(0).toUpperCase() + this.alertState.slice(1);
    this.alertTitle = this.alertState === 'green' ? 'All Clear' : 'ALERT';
    this.alertSubtitle = `Condition: ${label}`;
  }

  private set503ErrorState() {
    this.errorCode = 503;
    this.errorTitle = 'Service Unavailable';
  }
}
