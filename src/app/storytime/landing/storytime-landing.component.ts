import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { switchMap, of } from 'rxjs';
import { Spotlight } from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { SpotlightService } from '../spotlight.service';
import { STORYTIME_COPY } from '../storytime.constants';
import { StorytimeService } from '../storytime.service';

/**
 * The Storytime landing page.
 *
 * The Spotlight leads, because a landing page that opens with a list is asking
 * a visitor to choose before they know anything; opening with one thing
 * somebody chose and said why is an introduction.
 *
 * It does not check the master switch itself: the route guard has already
 * refused the visitor if Storytime is off, so re-checking here would duplicate
 * the decision and risk the two disagreeing. The Spotlight's own switch is
 * checked, because it decides whether this page has a Spotlight at all.
 */
@Component({
  selector: 'app-storytime-landing',
  templateUrl: './storytime-landing.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class StorytimeLandingComponent implements OnInit {
  /** The selections showing now, best first. */
  spotlight: Spotlight[] = [];

  /** User-facing copy, held centrally so wording stays consistent. */
  readonly copy = STORYTIME_COPY;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _spotlightService = inject(SpotlightService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the Spotlight, when there is one to load.
   */
  ngOnInit(): void {
    this._storytimeService
      .getFeatureState()
      .pipe(
        switchMap(features =>
          features.spotlightEnabled
            ? this._spotlightService.getSpotlight()
            : of([]),
        ),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: spotlight => {
          this.spotlight = spotlight;
        },
        // The Spotlight is the best of the page, not the whole of it. A
        // failure leaves the rest of Storytime reachable rather than
        // replacing the entry point with an apology.
        error: () => {
          this.spotlight = [];
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
   * The image to show with a selection.
   *
   * The editor's override wins when there is one; otherwise the work's own
   * banner, which is what a reader would see when they arrive.
   *
   * @param entry - The selection.
   * @returns The image URL, or null when there is nothing to show.
   */
  imageFor(entry: Spotlight): string | null {
    return (
      entry.overrideImageUrl ??
      entry.story?.bannerImageUrl ??
      entry.arc?.bannerImageUrl ??
      null
    );
  }

  /**
   * The alternative text for a selection's image.
   *
   * @param entry - The selection.
   * @returns The alternative text, empty when the image is decorative.
   */
  imageAltFor(entry: Spotlight): string {
    return (
      entry.overrideImageAlt ??
      entry.story?.bannerImageAlt ??
      entry.arc?.bannerImageAlt ??
      ''
    );
  }
}
