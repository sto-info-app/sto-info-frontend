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
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  private readonly alertThemeService = inject(AlertThemeService);

  ngOnDestroy(): void {
    this.alertThemeService.clearAlertStylesheet(
      this.renderer,
      this.el.nativeElement,
    );
    this.alertThemeService.clearTimers(this.el.nativeElement);
  }
}
