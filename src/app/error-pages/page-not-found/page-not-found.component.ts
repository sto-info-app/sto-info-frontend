import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
} from '@angular/core';
import { RedAlertThemeService } from 'src/app/shared/services/red-alert-theme.service';

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
  private readonly redAlertThemeService = inject(RedAlertThemeService);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);

  ngOnInit(): void {
    this.redAlertThemeService.applyRedAlertThemeThenApplyStaticRedTheme(
      this.renderer,
      this.el.nativeElement,
    );
  }

  ngOnDestroy(): void {
    this.redAlertThemeService.clearRedAlertStylesheet(
      this.renderer,
      this.el.nativeElement,
    );
    this.redAlertThemeService.clearTimers();
  }
}
