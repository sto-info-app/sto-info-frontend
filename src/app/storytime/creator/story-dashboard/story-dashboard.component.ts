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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  ManagedStory,
  StorytimeModerationStatus,
  StorytimeTargetType,
  StoryStatus,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  PUBLICATION_STATUS_LABELS,
  VISIBILITY_ICONS,
  VISIBILITY_LABELS,
} from '../../storytime.constants';
import { ChapterService } from '../../chapter.service';
import { CharacterService } from '../../character.service';
import { CrewService } from '../../crew.service';
import { ContentPolicyPanelComponent } from '../../shared/content-policy-panel/content-policy-panel.component';
import { StorytimeModerationService } from '../../storytime-moderation.service';
import { StoryService } from '../../story.service';

/**
 * How much of each kind of thing a Story holds.
 *
 * Shown on the buttons that open them, so a creator can see there are four
 * Chapters without opening the Chapter list to find out.
 */
export interface StoryCounts {
  chapters: number;
  cast: number;
  collaborators: number;
}

/**
 * What a Story counts as before its own counts have arrived.
 *
 * One shared object rather than a fresh one per call: the template asks for a
 * Story's counts on every check, and a new object each time would be a new
 * value each time.
 */
const NO_COUNTS: StoryCounts = { chapters: 0, cast: 0, collaborators: 0 };

/**
 * A creator's own Stories, with the actions available on each.
 */
@Component({
  selector: 'app-story-dashboard',
  templateUrl: './story-dashboard.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    ContentPolicyPanelComponent,
  ],
})
export class StoryDashboardComponent implements OnInit {
  /** The caller's Stories, in their chosen order. */
  stories: ManagedStory[] = [];

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  /** Status labels, so a raw enum value is never shown. */
  readonly statusLabels = PUBLICATION_STATUS_LABELS;

  /** Visibility labels. */
  readonly visibilityLabels = VISIBILITY_LABELS;

  /** The mark standing for each visibility on a Story's title bar. */
  readonly visibilityIcons = VISIBILITY_ICONS;

  /** What each Story holds, once counted, keyed by Story. */
  counts: Record<string, StoryCounts> = {};

  /** Publication states, for deciding which actions to offer. */
  readonly storyStatus = StoryStatus;

  private readonly _storyService = inject(StoryService);
  private readonly _chapterService = inject(ChapterService);
  private readonly _characterService = inject(CharacterService);
  private readonly _crewService = inject(CrewService);
  private readonly _moderationService = inject(StorytimeModerationService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /** The appeal a creator is writing, if any. */
  readonly appealForm = this._formBuilder.nonNullable.group({ body: [''] });

  /** The Story an appeal is being written about. */
  appealingStoryId: string | null = null;

  /** What to say after an appeal is sent. */
  appealMessage = '';

  /**
   * Loads the caller's Stories.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Whether a Story has been taken down by an administrator.
   *
   * @param story - The Story.
   * @returns True when it has been removed.
   */
  isRemoved(story: ManagedStory): boolean {
    return story.moderationStatus === StorytimeModerationStatus.REMOVED;
  }

  /**
   * Opens the appeal box for a removed Story.
   *
   * @param story - The Story.
   */
  startAppeal(story: ManagedStory): void {
    this.appealingStoryId = story.id;
    this.appealMessage = '';
    this.appealForm.reset();
  }

  /**
   * Sends the appeal.
   *
   * One appeal per removed Story, so the box closes on success and says so
   * rather than inviting a second attempt that the server would refuse.
   */
  sendAppeal(): void {
    const storyId = this.appealingStoryId;
    const body = this.appealForm.getRawValue().body.trim();

    if (!storyId || !body) {
      this.appealMessage = 'Say why you think this should come back.';
      return;
    }

    this._moderationService
      .appeal({
        targetType: StorytimeTargetType.STORY,
        targetId: storyId,
        body,
      })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => {
          this.appealingStoryId = null;
          this.appealMessage =
            'Your appeal has been sent. An administrator will read it.';
        },
        error: (error: HttpErrorResponse) => {
          this.appealMessage =
            (error.error as { message?: string } | undefined)?.message ??
            'That appeal could not be sent. Please try again shortly.';
        },
      });
  }

  /**
   * Publishes a Story and refreshes the list.
   *
   * @param story - The Story to publish.
   */
  publish(story: ManagedStory): void {
    this.runAction(this._storyService.publishStory(story.id));
  }

  /**
   * Withdraws a Story from publication and refreshes the list.
   *
   * @param story - The Story to unpublish.
   */
  unpublish(story: ManagedStory): void {
    this.runAction(this._storyService.unpublishStory(story.id));
  }

  /**
   * What a Story holds, for the buttons that open each part of it.
   *
   * @param story - The Story.
   * @returns Its counts, or zeroes while they are still being fetched.
   */
  countsFor(story: ManagedStory): StoryCounts {
    return this.counts[story.id] ?? NO_COUNTS;
  }

  /**
   * Whether a Story can be published from its current state.
   *
   * @param story - The Story to test.
   * @returns True when publishing is a sensible next action.
   */
  canPublish(story: ManagedStory): boolean {
    return story.status !== StoryStatus.PUBLISHED;
  }

  /**
   * Loads the caller's Stories.
   *
   * Public because the list is also refetched from the template, after the
   * publishing terms are accepted for one of them: the server settles what
   * that changed, so the list is asked again rather than patched here.
   */
  load(): void {
    this.isLoading = true;

    this._storyService
      .getMyStories()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: stories => {
          this.stories = stories;
          this.errorMessage = '';
          this.countContents(stories);
        },
        error: () => {
          this.errorMessage =
            'Your Stories could not be loaded. Please try again shortly.';
        },
      });
  }

  /**
   * Counts what each Story holds.
   *
   * The Story payload carries a published Chapter count and nothing else, and
   * a creator's own list wants the number of Chapters they have written rather
   * than the number readers can see — so each part is counted from the list
   * that the button beside it opens.
   *
   * A count that cannot be fetched is left at zero rather than reported: it is
   * a number on a button, and failing to load one is no reason to tell somebody
   * their Stories are broken.
   *
   * @param stories - The Stories to count.
   */
  private countContents(stories: ManagedStory[]): void {
    this.counts = {};

    for (const story of stories) {
      forkJoin({
        chapters: this._chapterService
          .getMyChapters(story.id)
          .pipe(catchError(() => of([]))),
        cast: this._characterService
          .getMyCharacters(story.id)
          .pipe(catchError(() => of([]))),
        collaborators: this._crewService
          .getCollaborators(story.id)
          .pipe(catchError(() => of([]))),
      })
        .pipe(
          takeUntilDestroyed(this._destroyRef),
          observeInZone(this._ngZone, this._cdr),
        )
        .subscribe(held => {
          this.counts[story.id] = {
            chapters: held.chapters.length,
            cast: held.cast.length,
            collaborators: held.collaborators.length,
          };
        });
    }
  }

  /**
   * Runs a Story action, surfacing whatever the server says went wrong.
   *
   * The server's message is shown rather than a generic one, because a refused
   * publish explains exactly what the Story is still missing.
   *
   * @param action - The action observable.
   */
  private runAction(action: ReturnType<StoryService['publishStory']>): void {
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
