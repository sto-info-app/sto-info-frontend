import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ManagedStory,
  StorytimeModerationStatus,
  StorytimeTargetType,
  StoryStatus,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  PUBLICATION_STATUS_LABELS,
  VISIBILITY_LABELS,
} from '../../storytime.constants';
import { StorytimeModerationService } from '../../storytime-moderation.service';
import { StoryService } from '../../story.service';

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

  /** Publication states, for deciding which actions to offer. */
  readonly storyStatus = StoryStatus;

  private readonly _storyService = inject(StoryService);
  private readonly _moderationService = inject(StorytimeModerationService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);

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
   * Whether the creator still has to confirm the content policy.
   *
   * @param story - The Story.
   * @returns True when it has not been accepted for this Story yet.
   */
  needsContentPolicy(story: ManagedStory): boolean {
    return !story.contentPolicyAcceptedAt;
  }

  /**
   * Records that the creator confirms this Story meets the content policy.
   *
   * @param story - The Story.
   */
  acceptContentPolicy(story: ManagedStory): void {
    this.runAction(this._storyService.acceptContentPolicy(story.id));
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
      .pipe(takeUntilDestroyed(this._destroyRef))
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
   */
  private load(): void {
    this.isLoading = true;

    this._storyService
      .getMyStories()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: stories => {
          this.stories = stories;
          this.errorMessage = '';
        },
        error: () => {
          this.errorMessage =
            'Your Stories could not be loaded. Please try again shortly.';
        },
      });
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
    action.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => this.load(),
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          (error.error as { message?: string } | undefined)?.message ??
          'That action could not be completed. Please try again shortly.';
      },
    });
  }
}
