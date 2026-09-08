import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { take } from 'rxjs';

import {
  STORYTIME_AVAILABILITY_ENABLED,
  STORYTIME_AVAILABILITY_UNAVAILABLE,
} from 'src/app/models/storytime.models';
import { FeatureUnavailableComponent } from 'src/app/shared/components/feature-unavailable/feature-unavailable.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  FEATURE_UNAVAILABLE_DISABLED,
  FEATURE_UNAVAILABLE_OFFLINE,
  FeatureUnavailableReason,
} from 'src/app/shared/constants/feature-availability.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

import { STORYTIME_COPY } from '../storytime.constants';
import { StorytimeService } from '../storytime.service';

/**
 * What a visitor sees instead of Storytime when Storytime is not there.
 *
 * Where {@link StorytimeEnabledGuard} sends everybody it turns away. It is a
 * page of its own rather than a redirect to the not-found page because neither
 * reason for turning somebody away is a wrong address: the master switch in
 * `app_setting` may be off, or the backend holding that switch may not be
 * answering. Both are temporary, and a visitor told "page not found" has no
 * reason to come back.
 *
 * The availability is read here rather than handed over by the guard, so the
 * address works when it is opened directly — and so a visitor who arrives
 * after the backend has recovered is sent on to Storytime rather than shown a
 * notice about an outage that has ended.
 */
@Component({
  selector: 'app-storytime-unavailable',
  templateUrl: './storytime-unavailable.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, FeatureUnavailableComponent, LoadingBarComponent],
})
export class StorytimeUnavailableComponent implements OnInit {
  /** User-facing copy, held centrally so wording stays consistent. */
  readonly copy = STORYTIME_COPY;

  /** Route constants, for the way back out. */
  readonly appRoutes = APP_ROUTES;

  /** Whether the availability is still being read. */
  isLoading = true;

  /** Why Storytime cannot be reached, once that is known. */
  reason: FeatureUnavailableReason = FEATURE_UNAVAILABLE_DISABLED;

  private readonly _storytimeService = inject(StorytimeService);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Reads why Storytime is out of reach.
   *
   * @returns void
   */
  ngOnInit(): void {
    this._storytimeService
      .getAvailability()
      .pipe(
        take(1),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(availability => {
        if (availability === STORYTIME_AVAILABILITY_ENABLED) {
          void this._router.navigate([`/${this.appRoutes.STORYTIME}`]);
          return;
        }

        this.reason =
          availability === STORYTIME_AVAILABILITY_UNAVAILABLE
            ? FEATURE_UNAVAILABLE_OFFLINE
            : FEATURE_UNAVAILABLE_DISABLED;
        this.isLoading = false;
      });
  }
}
