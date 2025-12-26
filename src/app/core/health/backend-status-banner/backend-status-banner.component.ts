import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HealthService } from '../health.service';

@Component({
  selector: 'app-backend-status-banner',
  templateUrl: './backend-status-banner.component.html',
  styleUrls: [
    '../../../../assets/lcars/lcars-yellow-alert.css',
    './backend-status-banner.component.scss',
  ],
  standalone: true,
  imports: [AsyncPipe],
})
export class BackendStatusBannerComponent {
  readonly backendHealth = inject(HealthService);
}
