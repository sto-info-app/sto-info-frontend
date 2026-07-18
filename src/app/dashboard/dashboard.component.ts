import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { LoadingBarComponent } from '../shared/components/loading-bar/loading-bar.component';
import { SRC_PHOTO_UNAVAILABLE_300PX } from '../shared/constants/app-image-assets.constants';
import { APP_ROUTES } from '../shared/constants/app-routing.constants';
import { RoutingService } from '../shared/services/routing.service';
import { User } from './models/user.model';
import { DashboardService } from './services/dashboard.service';
import { StoAccountService } from './services/sto-account.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, LoadingBarComponent],
})
export class DashboardComponent implements OnInit, OnDestroy {
  appRoutes = APP_ROUTES;
  unavailablePhotoSrc = SRC_PHOTO_UNAVAILABLE_300PX;

  user: User | undefined;
  isUserLoading = true;
  userLoadError = '';
  userGreeting = '';
  accountsCount = 0;

  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _dashboardService = inject(DashboardService);
  private readonly _authService = inject(AuthService);
  private readonly _routingService = inject(RoutingService);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  ngOnInit() {
    this.isUserLoading = true;
    this.userLoadError = '';

    this._dashboardService
      .getUser()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: user => {
          if (user.isAccountDisabled) this._authService.performLogout();

          this.user = user;
          this.isUserLoading = false;
          this.userLoadError = '';
          this.userGreeting = this.displayWelcomeText();
          this._cdr.detectChanges();
        },
        error: err => {
          this.isUserLoading = false;
          this.userLoadError = 'Failed to load dashboard data.';
          this._cdr.detectChanges();
          console.warn('Failed to load user data', err);
        },
      });

    this._stoAccountService
      .getAccounts()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: accounts => {
          this.accountsCount = accounts.length;
          this._cdr.detectChanges();
        },
        error: () => {
          this._cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  displayWelcomeText(): string {
    const greetings: string[] = [
      'Welcome',
      'Jolan tru', // Romulan
      'nuqneH', // Klingon (Hello [What do you want])
      'Peldor joi', // Bajoran greeting during the Gratitude Festival
    ];

    const randomGreeting: string =
      greetings[Math.floor(Math.random() * greetings.length)];

    if (this.user?.profile?.lastName)
      return randomGreeting + ', Captain ' + this.user.profile.lastName + '!';
    if (this.user?.profile?.firstName)
      return randomGreeting + ', ' + this.user.profile.firstName + '!';
    return randomGreeting + '!';
  }

  getRouteLink(route: string): string {
    return this._routingService.getLink(route);
  }

  onProfileImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.unavailablePhotoSrc;
  }
}
