import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, debounceTime, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  Chapter,
  ChapterLink,
  ChapterMedia,
  ChapterProgressUpdate,
  ReaderChapterStatus,
  StoryProgress,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { ChapterService } from '../../chapter.service';
import { MediaService } from '../../media.service';
import { ProgressService } from '../../progress.service';
import { CommentThreadComponent } from '../../shared/comment-thread/comment-thread.component';
import { ReactionControlComponent } from '../../shared/reaction-control/reaction-control.component';
import { MediaEmbedComponent } from '../media-embed/media-embed.component';
import { PROGRESS_WRITE_DEBOUNCE_MS } from '../../storytime.constants';
import { resolveReadingPosition } from '../../reading-position.utility';

/**
 * Reading a Chapter.
 *
 * The body arrives as HTML the server has already rendered and sanitised. It
 * is trusted here rather than re-sanitised, because Angular's sanitiser would
 * strip the block anchors reading progress depends on — and because the
 * server, not the client, is the security boundary for Storytime content.
 *
 * Progress is only tracked for a signed-in reader, and only ever as a best
 * effort: a failure to record where somebody is must never interrupt their
 * reading, so every progress request swallows its error.
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
    MediaEmbedComponent,
    ReactionControlComponent,
    CommentThreadComponent,
  ],
})
export class ChapterReaderComponent implements OnInit {
  /** The kinds of thing the social controls act on. */
  readonly targetTypes = StorytimeTargetType;

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

  /** Whether this Chapter is marked read. */
  isRead = false;

  /** The reader's progress through the Story, once known. */
  storyProgress: StoryProgress | null = null;

  /** Where the reader left off, offered rather than jumped to. */
  resumeBlockId: string | null = null;

  /** The videos embedded in this Chapter, in order. */
  media: ChapterMedia[] = [];

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  /** The rendered body, measured to work out where the reader is. */
  @ViewChild('chapterBody') bodyElement?: ElementRef<HTMLElement>;

  private readonly _route = inject(ActivatedRoute);
  private readonly _chapterService = inject(ChapterService);
  private readonly _progressService = inject(ProgressService);
  private readonly _mediaService = inject(MediaService);
  private readonly _authService = inject(AuthService);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Reported positions, written at most once per debounce window.
   *
   * Each carries the Chapter it was measured in. A reader who scrolls and then
   * moves on within the debounce window would otherwise have their position
   * recorded against whichever Chapter had loaded by the time it was written.
   */
  private readonly _positions = new Subject<{
    chapterId: string;
    update: ChapterProgressUpdate;
  }>();

  /**
   * Whether progress is worth tracking at all.
   *
   * @returns True when a signed-in reader has a Chapter open.
   */
  get isTrackingProgress(): boolean {
    return this._authService.isLoggedIn() && this.chapter !== null;
  }

  /**
   * Loads the Chapter named in the route, and reloads when the route changes.
   *
   * Reacting to the parameters rather than reading them once matters here:
   * moving to the next Chapter changes the URL without leaving the component.
   */
  ngOnInit(): void {
    this.watchPositions();

    this._route.paramMap
      .pipe(
        switchMap(params => {
          this.isLoading = true;
          this.errorMessage = '';
          this.resetProgress();
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
          this.loadProgress();
          // Taken from the Chapter rather than the route, so a request that
          // arrived by a retired slug still asks for the right videos.
          this.loadMedia(result.chapter.slug);
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

  /**
   * Notes where the reader has got to as they scroll.
   */
  @HostListener('window:scroll')
  onScroll(): void {
    const body = this.bodyElement?.nativeElement;

    if (!this.isTrackingProgress || !body || !this.chapter) {
      return;
    }

    const position = resolveReadingPosition(body, window.innerHeight);

    this._positions.next({
      chapterId: this.chapter.id,
      update: position.blockId
        ? {
            progressPercent: position.progressPercent,
            blockId: position.blockId,
          }
        : { progressPercent: position.progressPercent },
    });
  }

  /**
   * Marks this Chapter read, or puts it back to unread.
   *
   * @param isRead - Whether it should now be read.
   */
  setRead(isRead: boolean): void {
    if (!this.isTrackingProgress || !this.chapter) {
      return;
    }

    this._progressService
      .setChapterRead(this.chapter.id, isRead)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(progress => {
        if (progress) {
          this.isRead = isRead;
          this.storyProgress = progress;
        }
      });
  }

  /**
   * Scrolls to where the reader left off.
   */
  resume(): void {
    const anchor = this.resumeBlockId;

    if (!anchor) {
      return;
    }

    document.getElementById(anchor)?.scrollIntoView();
    this.resumeBlockId = null;
  }

  /**
   * Writes reported positions, at most one per debounce window.
   *
   * Debounced because a scroll fires continuously: without it a reader moving
   * down a long Chapter would send a request per frame.
   */
  private watchPositions(): void {
    this._positions
      .pipe(
        debounceTime(PROGRESS_WRITE_DEBOUNCE_MS),
        switchMap(({ chapterId, update }) =>
          this._progressService
            .updateChapterProgress(chapterId, update)
            .pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(progress => {
        if (progress) {
          this.storyProgress = progress;
        }
      });
  }

  /**
   * Loads where the reader had got to with this Chapter.
   */
  private loadProgress(): void {
    if (!this.isTrackingProgress || !this.chapter) {
      return;
    }

    this._progressService
      .getChapterProgress(this.chapter.id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(progress => {
        if (!progress) {
          return;
        }

        this.isRead = progress.status === ReaderChapterStatus.READ;
        // Offered rather than jumped to. Moving somebody's page under them as
        // it loads is disorienting, and a reader who wanted the start of the
        // Chapter would have no way back to it.
        this.resumeBlockId =
          progress.status === ReaderChapterStatus.IN_PROGRESS
            ? progress.blockId
            : null;
      });
  }

  /**
   * Loads the videos embedded in this Chapter.
   *
   * Silently: most Chapters have no video at all, and a failure here must
   * leave the writing readable rather than taking the page down. The server
   * already returns nothing when embedding is switched off.
   *
   * @param chapterSlug - The Chapter slug from the route.
   */
  private loadMedia(chapterSlug: string): void {
    this._mediaService
      .getChapterMedia(this.storySlug, chapterSlug)
      .pipe(
        catchError(() => of([] as ChapterMedia[])),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(media => {
        this.media = media;
      });
  }

  /**
   * Forgets the previous Chapter's progress before another one loads.
   */
  private resetProgress(): void {
    this.isRead = false;
    this.resumeBlockId = null;
    this.media = [];
  }
}
