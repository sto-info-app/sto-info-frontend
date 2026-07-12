import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  Renderer2,
} from '@angular/core';
import { ServiceInterruptionContentComponent } from 'src/app/error-pages/service-interruption/service-interruption-content/service-interruption-content.component';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';

@Component({
  selector: 'app-service-interruption',
  templateUrl: './service-interruption.component.html',
  standalone: true,
  imports: [ServiceInterruptionContentComponent],
})
export class ServiceInterruptionComponent implements OnDestroy {
  private readonly _renderer = inject(Renderer2);
  private readonly _el = inject(ElementRef);
  private readonly _alertThemeService = inject(AlertThemeService);

  /**
   * Removes alert styling when the interruption page is destroyed.
   */
  ngOnDestroy(): void {
    this._alertThemeService.clearAlertStylesheet(
      this._renderer,
      this._el.nativeElement,
    );
    this._alertThemeService.clearTimers(this._el.nativeElement);
  }
}
