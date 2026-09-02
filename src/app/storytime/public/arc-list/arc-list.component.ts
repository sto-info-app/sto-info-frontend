import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { Arc } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ArcService } from '../../arc.service';
import { StorytimeTagRowComponent } from '../../shared/tag-row/tag-row.component';

/**
 * The Arcs anybody may discover.
 *
 * Unlisted Arcs are absent by design: they are readable by anybody holding the
 * link, and not being discoverable here is the entire difference between
 * unlisted and public.
 */
@Component({
  selector: 'app-arc-list',
  templateUrl: './arc-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    StorytimeTagRowComponent,
  ],
})
export class ArcListComponent implements OnInit {
  /** The published Arcs, newest first. */
  arcs: Arc[] = [];

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when the list could not be loaded. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _arcService = inject(ArcService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the published Arcs.
   */
  ngOnInit(): void {
    this._arcService
      .getArcs()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: arcs => {
          this.arcs = arcs;
        },
        error: () => {
          this.errorMessage =
            'Arcs could not be loaded. Please try again shortly.';
        },
      });
  }
}
