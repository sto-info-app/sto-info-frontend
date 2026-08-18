import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ChapterStatus, ManagedChapter } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ChapterService } from '../../chapter.service';
import { PUBLICATION_STATUS_LABELS } from '../../storytime.constants';

/**
 * The Chapters of one of the creator's Stories, with the actions on each.
 */
@Component({
  selector: 'app-chapter-list',
  templateUrl: './chapter-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ChapterListComponent implements OnInit {
  /** The Chapters, in reading order. */
  chapters: ManagedChapter[] = [];

  /** The Story these Chapters belong to. */
  storyId = '';

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  /** Status labels, so a raw enum value is never shown. */
  readonly statusLabels = PUBLICATION_STATUS_LABELS;

  private readonly _route = inject(ActivatedRoute);
  private readonly _chapterService = inject(ChapterService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the Chapters of the Story named in the route.
   */
  ngOnInit(): void {
    this.storyId = this._route.snapshot.paramMap.get('storyId') ?? '';
    this.load();
  }

  /**
   * Publishes a Chapter and refreshes the list.
   *
   * @param chapter - The Chapter to publish.
   */
  publish(chapter: ManagedChapter): void {
    this.runAction(this._chapterService.publishChapter(chapter.id));
  }

  /**
   * Withdraws a Chapter from publication and refreshes the list.
   *
   * @param chapter - The Chapter to unpublish.
   */
  unpublish(chapter: ManagedChapter): void {
    this.runAction(this._chapterService.unpublishChapter(chapter.id));
  }

  /**
   * Whether publishing is a sensible next action for a Chapter.
   *
   * @param chapter - The Chapter to test.
   * @returns True when it is not already published.
   */
  canPublish(chapter: ManagedChapter): boolean {
    return chapter.status !== ChapterStatus.PUBLISHED;
  }

  /**
   * Loads the Chapters.
   */
  private load(): void {
    this.isLoading = true;

    this._chapterService
      .getMyChapters(this.storyId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: chapters => {
          this.chapters = chapters;
          this.errorMessage = '';
        },
        error: () => {
          this.errorMessage =
            'The Chapters could not be loaded. Please try again shortly.';
        },
      });
  }

  /**
   * Runs a Chapter action, surfacing whatever the server says went wrong.
   *
   * The server's message is shown rather than a generic one, because a refused
   * publish names exactly what the Chapter is still missing.
   *
   * @param action - The action observable.
   */
  private runAction(
    action: ReturnType<ChapterService['publishChapter']>,
  ): void {
    action
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => this.load(),
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            (error.error as { message?: string } | undefined)?.message ??
            'That action could not be completed. Please try again shortly.';
        },
      });
  }
}
