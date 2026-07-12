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
  private readonly _alertThemeService = inject(AlertThemeService);
  private readonly _renderer = inject(Renderer2);
  private readonly _el = inject(ElementRef);

  /**
   * Applies the red alert styling used by the 404 page.
   */
  ngOnInit(): void {
    this._alertThemeService.applyAlertThemeThenApplyStaticTheme(
      this._renderer,
      this._el.nativeElement,
      'red',
    );
  }

  /**
   * Removes alert styling when the page is destroyed.
   */
  ngOnDestroy(): void {
    this._alertThemeService.clearAlertStylesheet(
      this._renderer,
      this._el.nativeElement,
    );
    this._alertThemeService.clearTimers(this._el.nativeElement);
  }
}
