import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { Chapter, ChapterLink } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ChapterService } from '../../chapter.service';

/**
 * Reading a Chapter.
 *
 * The body arrives as HTML the server has already rendered and sanitised. It
 * is trusted here rather than re-sanitised, because Angular's sanitiser would
 * strip the block anchors reading progress depends on — and because the
 * server, not the client, is the security boundary for Storytime content.
 */
@Component({
  selector: 'app-chapter-reader',
  templateUrl: './chapter-reader.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ChapterReaderComponent implements OnInit {
  /** The Chapter being read. */
  chapter: Chapter | null = null;

  /** The rendered body, ready to insert. */
  contentHtml: SafeHtml | null = null;

  /** The Chapter before this one, if any. */
  previous: ChapterLink | null = null;

  /** The Chapter after this one, if any. */
  next: ChapterLink | null = null;

  /** The Story slug, for building links back and sideways. */
  storySlug = '';

  /** Whether the Chapter is still loading. */
  isLoading = true;

  /** A message to show when the Chapter could not be loaded. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _chapterService = inject(ChapterService);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the Chapter named in the route, and reloads when the route changes.
   *
   * Reacting to the parameters rather than reading them once matters here:
   * moving to the next Chapter changes the URL without leaving the component.
   */
  ngOnInit(): void {
    this._route.paramMap
      .pipe(
        switchMap(params => {
          this.isLoading = true;
          this.errorMessage = '';
          this.storySlug = params.get('storySlug') ?? '';

          return this._chapterService.getChapter(
            this.storySlug,
            params.get('chapterSlug') ?? '',
          );
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: result => {
          this.chapter = result.chapter;
          this.previous = result.previous;
          this.next = result.next;
          this.contentHtml = result.chapter.contentHtml
            ? // NOSONAR - server-rendered and sanitised; see the class comment.
              this._sanitizer.bypassSecurityTrustHtml(
                result.chapter.contentHtml,
              )
            : null;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 404
              ? 'That Chapter could not be found. It may have been removed or not published yet.'
              : 'This Chapter could not be read. Please try again shortly.';
          this.isLoading = false;
        },
      });
  }
}
