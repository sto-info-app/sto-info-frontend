import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { finalize, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  Character,
  ChapterSummary,
  CrewCredit,
  CONTENT_RATING_DESCRIPTIONS,
  CONTENT_RATING_LABELS,
  ContentRating,
  DELIBERATE_READER_STATUSES,
  ReaderStoryStatus,
  Story,
  StoryProgress,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsWarningMessageComponent } from 'src/app/shared/components/lcars-warning-message/lcars-warning-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ChapterService } from '../../chapter.service';
import { CharacterService } from '../../character.service';
import { CrewService } from '../../crew.service';
import { ProgressService } from '../../progress.service';
import {
  COMPLETION_STATE_LABELS,
  READER_STORY_STATUS_LABELS,
} from '../../storytime.constants';
import { StorytimeModerationService } from '../../storytime-moderation.service';
import { StoryService } from '../../story.service';
import {
  ReportContentDialogComponent,
  ReportContentDialogResult,
} from '../report-content-dialog/report-content-dialog.component';

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

  /** The readable Chapters of this Story, in reading order. */
  chapters: ChapterSummary[] = [];

  /** The slug from the route, for building Chapter links. */
  storySlug = '';

  /** The rendered description, ready to insert. */
  descriptionHtml: SafeHtml | null = null;

  /** Whether the Story is still loading. */
  isLoading = true;

  /** A message to show when the Story could not be loaded. */
  errorMessage = '';

  /** A message to show when the Chapter list could not be loaded. */
  chapterErrorMessage = '';

  /** What to say after a reader reports the Story. */
  reportMessage = '';

  /** Rating labels, so a raw enum value is never shown. */
  readonly ratingLabels = CONTENT_RATING_LABELS;

  /** Rating explanations for the warning banner. */
  readonly ratingDescriptions = CONTENT_RATING_DESCRIPTIONS;

  /** Completion labels. */
  readonly completionLabels = COMPLETION_STATE_LABELS;

  /** The Story's cast, in display order. */
  characters: Character[] = [];

  /** The Story's credits, in credits-roll order. */
  credits: CrewCredit[] = [];

  /** The reader's own progress, once known. */
  progress: StoryProgress | null = null;

  /** Reader status labels, so a raw enum value is never shown. */
  readonly readerStatusLabels = READER_STORY_STATUS_LABELS;

  /** The statuses a reader may set for themselves. */
  readonly deliberateStatuses = DELIBERATE_READER_STATUSES;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _storyService = inject(StoryService);
  private readonly _chapterService = inject(ChapterService);
  private readonly _characterService = inject(CharacterService);
  private readonly _crewService = inject(CrewService);
  private readonly _progressService = inject(ProgressService);
  private readonly _authService = inject(AuthService);
  private readonly _moderationService = inject(StorytimeModerationService);
  private readonly _dialog = inject(MatDialog);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the Story named in the route.
   */
  ngOnInit(): void {
    this._route.paramMap
      .pipe(
        switchMap(params => {
          this.storySlug = params.get('storySlug') ?? '';
          return this._storyService.getStory(this.storySlug);
        }),
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
          this.loadChapters();
          this.loadCharacters();
          this.loadCredits();
          this.loadProgress();
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
   * Loads the Story's readable Chapters.
   *
   * Fetched separately from the Story so a failure to list Chapters leaves the
   * Story itself readable rather than taking the whole page down.
   */
  private loadChapters(): void {
    this._chapterService
      .getChapters(this.storySlug)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: chapters => {
          this.chapters = chapters;
        },
        error: () => {
          this.chapterErrorMessage =
            'The Chapter list could not be loaded. Please try again shortly.';
        },
      });
  }

  /**
   * Loads the Story's cast.
   *
   * Fetched separately, and silently: not every Story has a cast, and a
   * failure to list one must leave the Story readable rather than taking the
   * page down over a section that may well be empty anyway.
   */
  private loadCharacters(): void {
    this._characterService
      .getCharacters(this.storySlug)
      .pipe(
        catchError(() => of([] as Character[])),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(characters => {
        this.characters = characters;
      });
  }

  /**
   * Loads the Story's credits.
   *
   * Silently, for the same reason as the cast: most Stories are written by one
   * person and have no credits roll at all, and a failure here must not take
   * the Story down with it.
   */
  private loadCredits(): void {
    this._crewService
      .getCredits(this.storySlug)
      .pipe(
        catchError(() => of([] as CrewCredit[])),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(credits => {
        this.credits = credits;
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

  /**
   * Whether the reader has progress worth showing.
   *
   * @returns True when a signed-in reader has started this Story.
   */
  get hasProgress(): boolean {
    return (
      this.progress !== null &&
      this.progress.status !== ReaderStoryStatus.NOT_STARTED
    );
  }

  /**
   * The Chapter Continue Reading should open, if any.
   *
   * @returns The Chapter, or null when there is nothing to continue to.
   */
  get continueChapter(): ChapterSummary | null {
    const chapterId = this.progress?.continueChapterId;

    return chapterId
      ? (this.chapters.find(chapter => chapter.id === chapterId) ?? null)
      : null;
  }

  /**
   * Whether the reader is signed in, and so has progress at all.
   *
   * @returns True when progress applies.
   */
  get isTrackingProgress(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * Opens the report dialog, and sends whatever the reader chose.
   *
   * Only offered to a signed-in reader, because an anonymous report cannot be
   * followed up or answered.
   *
   * The outcome is deliberately quiet: a reporter is told their report
   * arrived, and nothing else. What an administrator decides about somebody
   * else's Story is not theirs to read, and a failure is not worth taking the
   * Story off the screen for.
   */
  report(): void {
    if (!this.story) {
      return;
    }

    this._dialog
      .open(ReportContentDialogComponent, {
        data: {
          targetType: StorytimeTargetType.STORY,
          targetId: this.story.id,
          label: 'Story',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((result?: ReportContentDialogResult) => {
        if (!result || !this.story) {
          return;
        }

        this._moderationService
          .report({
            targetType: StorytimeTargetType.STORY,
            targetId: this.story.id,
            reasonCode: result.reasonCode,
            description: result.description,
          })
          .pipe(takeUntilDestroyed(this._destroyRef))
          .subscribe({
            next: () => {
              this.reportMessage =
                'Thank you. An administrator will look at this.';
            },
            error: (error: HttpErrorResponse) => {
              this.reportMessage =
                (error.error as { message?: string } | undefined)?.message ??
                'That report could not be sent. Please try again shortly.';
            },
          });
      });
  }

  /**
   * Sets the reader's own status for this Story.
   *
   * @param status - The chosen status.
   */
  setStatus(status: ReaderStoryStatus): void {
    this.withStory(storyId =>
      this._progressService.setStoryStatus(storyId, status),
    );
  }

  /**
   * Marks the whole Story as read.
   */
  completeStory(): void {
    this.withStory(storyId => this._progressService.completeStory(storyId));
  }

  /**
   * Discards the reader's progress and starts the Story again.
   */
  resetStory(): void {
    this.withStory(storyId => this._progressService.resetStory(storyId));
  }

  /**
   * Loads the reader's progress through this Story.
   *
   * Best effort throughout: a failure here leaves the Story readable without
   * progress rather than taking the page down over bookkeeping.
   */
  private loadProgress(): void {
    this.withStory(storyId => this._progressService.getStoryProgress(storyId));
  }

  /**
   * Runs a progress request for the loaded Story and keeps what comes back.
   *
   * @param request - Builds the request from the Story identifier.
   */
  private withStory(
    request: (storyId: string) => ReturnType<ProgressService['resetStory']>,
  ): void {
    if (!this.isTrackingProgress || !this.story) {
      return;
    }

    request(this.story.id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(progress => {
        if (progress) {
          this.progress = progress;
        }
      });
  }
}
