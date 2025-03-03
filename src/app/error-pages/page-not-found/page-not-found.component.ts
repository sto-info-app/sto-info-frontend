import { Component, ElementRef, Renderer2 } from '@angular/core';
import { RedAlertThemeService } from 'src/app/shared/services/red-alert-theme.service';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html',
  styleUrls: [
    '../../../assets/lcars/lcars-red-alert.css',
    './page-not-found.component.scss',
  ],
  standalone: false,
})
export class PageNotFoundComponent {
  constructor(
    private readonly redAlertThemeService: RedAlertThemeService,
    private readonly renderer: Renderer2,
    private readonly el: ElementRef,
  ) {}

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
