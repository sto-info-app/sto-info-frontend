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
import { finalize, forkJoin } from 'rxjs';
import { Spotlight } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { SpotlightService } from '../../spotlight.service';

/**
 * The Spotlight: what is showing now, and everything that has shown before.
 *
 * The archive is kept rather than discarded because being chosen is worth
 * something to the person chosen, and a selection that evaporates the moment
 * it ends would take that with it.
 */
@Component({
  selector: 'app-spotlight-archive',
  templateUrl: './spotlight-archive.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class SpotlightArchiveComponent implements OnInit {
  /** The selections showing now. */
  showing: Spotlight[] = [];

  /** The selections that have finished showing. */
  past: Spotlight[] = [];

  /** Whether the page is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _spotlightService = inject(SpotlightService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads both halves of the page together.
   */
  ngOnInit(): void {
    forkJoin({
      showing: this._spotlightService.getSpotlight(),
      past: this._spotlightService.getArchive(),
    })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: spotlight => {
          this.showing = spotlight.showing;
          this.past = spotlight.past;
        },
        error: () => {
          this.errorMessage =
            'The Spotlight could not be loaded. Please try again shortly.';
        },
      });
  }

  /**
   * Where a selection sends a reader.
   *
   * @param entry - The selection.
   * @returns The router link for the featured work.
   */
  linkFor(entry: Spotlight): unknown[] {
    return entry.story
      ? ['/', this.appRoutes.STORYTIME, 'stories', entry.story.slug]
      : ['/', this.appRoutes.STORYTIME, 'arcs', entry.arc?.slug];
  }

  /**
   * What a selection features.
   *
   * @param entry - The selection.
   * @returns The title of the featured work.
   */
  titleFor(entry: Spotlight): string {
    return entry.story?.title ?? entry.arc?.title ?? '';
  }
}
