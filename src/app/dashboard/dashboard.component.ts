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
import {
  catchError,
  filter,
  of,
  Subject,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { buildRegistryProfileLink } from '../community/registry/registry-card.builders';
import { AuthService } from '../core/auth/auth.service';
import { CommunitySubscriptionService } from '../fleet/community-subscription.service';
import { LoadingBarComponent } from '../shared/components/loading-bar/loading-bar.component';
import { SRC_PHOTO_UNAVAILABLE_300PX } from '../shared/constants/app-image-assets.constants';
import { APP_ROUTES } from '../shared/constants/app-routing.constants';
import { FleetConfigurationService } from '../shared/services/fleet-configuration.service';
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

  /**
   * How many Communities the member follows, or null while nobody knows.
   *
   * Null rather than zero for the unknown case, because the tile draws a
   * count only when there is one to draw: a reader whose follows could
   * not be read is better told nothing than told they follow none.
   */
  followedCommunitiesCount: number | null = null;

  private readonly _stoAccountService = inject(StoAccountService);
  private readonly _dashboardService = inject(DashboardService);
  private readonly _authService = inject(AuthService);
  private readonly _fleetConfiguration = inject(FleetConfigurationService);
  private readonly _subscriptions = inject(CommunitySubscriptionService);
  private readonly _routingService = inject(RoutingService);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroy$ = new Subject<void>();

  /**
   * Whether to offer the Fleet section at all.
   *
   * Read through the async pipe rather than into a field: the tile and the
   * side-column button both ask, and the configuration behind them is
   * cached, so asking twice costs one request and no bookkeeping.
   */
  readonly isFleetOffered$ = this._fleetConfiguration.isOffered();

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

    // Asked only once the section is known to be offered, so a member
    // whose site has the feature switched off is never asked about
    // follows they cannot have made. A failure leaves the count unknown
    // rather than zero: the tile then says what it is without claiming a
    // number nobody has.
    this._fleetConfiguration
      .isOffered()
      .pipe(
        filter(isOffered => isOffered),
        take(1),
        switchMap(() => this._subscriptions.listFollowed()),
        catchError(() => of(null)),
        takeUntil(this._destroy$),
      )
      .subscribe(followed => {
        this.followedCommunitiesCount =
          followed === null ? null : followed.length;
        this._cdr.detectChanges();
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

  /**
   * Router link to the member's own entry in the Galactic Personnel Registry.
   *
   * Null while the user is loading, and null for a member who is not listed
   * publicly: the registry only serves publicly visible profiles, so a link
   * offered then would lead to a "member not found" page.
   *
   * @returns The profile router link segments, or null when there is no
   *   public profile to view.
   */
  get publicProfileLink(): string[] | null {
    const profile = this.user?.profile;
    if (!profile?.publiclyVisible) return null;

    return buildRegistryProfileLink(profile.username);
  }

  onProfileImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.unavailablePhotoSrc;
  }
}
