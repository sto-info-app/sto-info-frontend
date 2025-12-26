import { AsyncPipe } from '@angular/common';
import { Component, ElementRef, inject, Renderer2 } from '@angular/core';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';
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
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  private readonly alertThemeService = inject(AlertThemeService);
  readonly backendHealth = inject(HealthService);

  constructor() {
    this.applyErrorStylesheet();
  }

  private applyErrorStylesheet() {
    this.alertThemeService.applyAlertThemeThenClearAfterAShortTime(
      this.renderer,
      this.el.nativeElement,
      'yellow',
    );
  }
}
