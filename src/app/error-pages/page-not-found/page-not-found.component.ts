import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
} from '@angular/core';
import { AlertThemeService } from 'src/app/shared/services/alert-theme.service';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html',
  styleUrls: [
    '../../../assets/lcars/lcars-red-alert.css',
    './page-not-found.component.scss',
  ],
  standalone: true,
  imports: [],
})
export class PageNotFoundComponent implements OnInit, OnDestroy {
  private readonly alertThemeService = inject(AlertThemeService);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);

  ngOnInit(): void {
    this.alertThemeService.applyAlertThemeThenApplyStaticTheme(
      this.renderer,
      this.el.nativeElement,
      'red',
    );
  }

  ngOnDestroy(): void {
    this.alertThemeService.clearAlertStylesheet(
      this.renderer,
      this.el.nativeElement,
    );
    this.alertThemeService.clearTimers();
  }
}
