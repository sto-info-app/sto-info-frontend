import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { finalize, switchMap } from 'rxjs';
import {
  CONTENT_RATING_DESCRIPTIONS,
  CONTENT_RATING_LABELS,
  ContentRating,
  Story,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { COMPLETION_STATE_LABELS } from '../../storytime.constants';
import { StoryService } from '../../story.service';

/**
 * A published Story's own page.
 *
 * The description arrives as HTML the server has already rendered and
 * sanitised. It is trusted here rather than re-sanitised, because Angular's
 * sanitiser would strip the block anchors reading progress depends on — and
 * because the server, not the client, is the security boundary for Storytime
 * content.
 */
@Component({
  selector: 'app-story-detail',
  templateUrl: './story-detail.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsWarningMessageComponent,
  ],
})
export class StoryDetailComponent implements OnInit {
  /** The Story being read. */
  story: Story | null = null;

  /** The rendered description, ready to insert. */
  descriptionHtml: SafeHtml | null = null;

  /** Whether the Story is still loading. */
  isLoading = true;

  /** A message to show when the Story could not be loaded. */
  errorMessage = '';

  /** Rating labels, so a raw enum value is never shown. */
  readonly ratingLabels = CONTENT_RATING_LABELS;

  /** Rating explanations for the warning banner. */
  readonly ratingDescriptions = CONTENT_RATING_DESCRIPTIONS;

  /** Completion labels. */
  readonly completionLabels = COMPLETION_STATE_LABELS;

  private readonly _route = inject(ActivatedRoute);
  private readonly _storyService = inject(StoryService);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the Story named in the route.
   */
  ngOnInit(): void {
    this._route.paramMap
      .pipe(
        switchMap(params =>
          this._storyService.getStory(params.get('storySlug') ?? ''),
        ),
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: story => {
          this.story = story;
          this.descriptionHtml = story.descriptionHtml
            ? // NOSONAR - server-rendered and sanitised; see the class comment.
              this._sanitizer.bypassSecurityTrustHtml(story.descriptionHtml)
            : null;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 404
              ? 'That Story could not be found. It may have been removed or made private.'
              : 'This Story could not be read. Please try again shortly.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Whether the Story's rating warrants a warning banner.
   *
   * @returns True for Mature and Adults Only.
   */
  get needsRatingWarning(): boolean {
    return (
      this.story !== null && this.story.contentRating !== ContentRating.GENERAL
    );
  }
}
