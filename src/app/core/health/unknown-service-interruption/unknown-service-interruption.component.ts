import { Component, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  API_HEALTH_STATE_DOWN,
  API_HEALTH_STATE_UNKNOWN,
  API_HEALTH_STATE_UP,
} from 'src/app/shared/constants/health.constants';
import { HealthService } from '../health.service';

@Component({
  selector: 'app-unknown-service-interruption',
  templateUrl: './unknown-service-interruption.component.html',
  styleUrls: [
    '../../../../assets/lcars/lcars-yellow-alert.css',
    './unknown-service-interruption.component.scss',
  ],
  standalone: true,
})
export class UnknownServiceInterruptionComponent implements OnDestroy {
  private readonly subs = new Subscription();
  readonly _backendHealth = inject(HealthService);
  errorCode = 400;
  errorTitle = 'Service Unavailable';
  errorDescription = 'TRIBBLES! Tribbles are in the computer core!';

  constructor() {
    this._backendHealth.state$.subscribe(state => {
      if (state === API_HEALTH_STATE_UP) {
        this.errorCode = 100;
        this.errorTitle = 'All Systems Operational';
        this.errorDescription = `Our sensors indicated a temporary failure within the primary data core. This interruption should now be resolved, please attempt your request again.`;
      } else if (state === API_HEALTH_STATE_DOWN) {
        this.errorCode = 503;
        this.errorTitle = 'Service Unavailable';
        this.errorDescription = `We're unable to establish a reliable connection at this time. Systems are
      being recalibrated. Please try again later.`;
      } else if (state === API_HEALTH_STATE_UNKNOWN) {
        this.errorCode = 503;
        this.errorTitle = 'Service Unavailable';
        this.errorDescription = ` We have encountered an unexpected systems failure. Our primary computer core is currently unable to respond to incoming requests, and subspace communication with Starfleet Command. Please try your request shortly.`;
      } else {
        this.errorCode = 503;
        this.errorTitle = 'Service Unavailable';
        this.errorDescription = `Our sensors indicated a temporary failure within the primary data core.
      Initial diagnostics are underway, please attempt your request again
      shortly.`;
      }
    });
  }

  ngOnDestroy(): void {
    this.subs?.unsubscribe();
  }
}
