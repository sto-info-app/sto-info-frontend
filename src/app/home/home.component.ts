import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';
import { LcarsInformationMessageComponent } from '../shared/components/lcars-information-message/lcars-information-message.component';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { NewsPost } from '../models/news.models';
import { NewsService } from '../news/news.service';
import { NewsCardComponent } from '../shared/components/news-card/news-card.component';
import { APP_ROUTES } from '../shared/constants/app-routing.constants';
import { observeInZone } from '../shared/rxjs/observe-in-zone.operator';
import { RoutingService } from '../shared/services/routing.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  styleUrl: './home.component.scss',
  imports: [
    CommonModule,
    RouterModule,
    LcarsInformationMessageComponent,
    NewsCardComponent,
  ],
  providers: [RoutingService],
})
export class HomeComponent implements OnDestroy {
  appTitle: string = environment.appTitle;
  isLoggedIn = false;
  appRoutes = APP_ROUTES;
  recentNews: NewsPost[] = [];
  newsLoading = true;
  newsError = false;

  private readonly _authService = inject(AuthService);
  private readonly _newsService = inject(NewsService);
  private readonly _routingService = inject(RoutingService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  /**
   * Initializes the component.
   *
   * Subscribes to the authentication service to determine if the user is logged in.
   */
  constructor() {
    this._authService.isAuthenticated$
      .pipe(takeUntil(this._destroy$))
      .subscribe(loggedIn => {
        this.isLoggedIn = loggedIn;
      });

    this._newsService
      .getPublishedNews({ page: 1, pageSize: 3 })
      .pipe(takeUntil(this._destroy$), observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: result => {
          this.recentNews = result.items;
          this.newsLoading = false;
        },
        error: () => {
          this.newsError = true;
          this.newsLoading = false;
        },
      });
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   * Completes the destroy$ subject to unsubscribe from all active subscriptions.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Returns the link for the given route.
   *
   * @param route The route to get the link for.
   * @returns The link for the given route.
   */
  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }
}
