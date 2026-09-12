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
import { Observable, finalize } from 'rxjs';
import {
  ChapterStatus,
  ManagedChapter,
  StorytimeModerationStatus,
} from 'src/app/models/storytime.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
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
  private readonly _confirm = new ConfirmPrompt();

  /**
   * Loads the Chapters of the Story named in the route.
   */
  ngOnInit(): void {
    this.storyId = this._route.snapshot.paramMap.get('storyId') ?? '';
    this.load();
  }

  /**
   * Whether a Chapter has been taken down by an administrator.
   *
   * @param chapter - The Chapter.
   * @returns True when it has been removed.
   */
  isRemoved(chapter: ManagedChapter): boolean {
    return chapter.moderationStatus === StorytimeModerationStatus.REMOVED;
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
   * Whether a Chapter may be deleted from its current state.
   *
   * A published Chapter is part of what readers are already following, and
   * taking one out of the middle of a Story is not something to offer beside
   * an edit button. Unpublishing first is reversible; only then is the
   * irreversible action on the table. The server allows either; this is the
   * order the interface asks for them in.
   *
   * @param chapter - The Chapter to test.
   * @returns True when deleting is an action to offer.
   */
  canDelete(chapter: ManagedChapter): boolean {
    return chapter.status !== ChapterStatus.PUBLISHED;
  }

  /**
   * Deletes a Chapter, once the creator has agreed to lose it.
   *
   * @param chapter - The Chapter to delete.
   */
  remove(chapter: ManagedChapter): void {
    this._confirm
      .askToDestroy({
        title: 'Delete Chapter',
        question: 'Are you sure you want to delete this Chapter?',
        subject: chapter.title,
        consequence:
          'Its text, artwork and cast appearances go with it, and this cannot be undone.',
        confirmText: 'Delete Chapter',
      })
      .subscribe(confirmed => {
        if (confirmed) {
          this.runAction(this._chapterService.deleteChapter(chapter.id));
        }
      });
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
  private runAction<T>(action: Observable<T>): void {
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
