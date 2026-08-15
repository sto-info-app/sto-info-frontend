import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ManagedStory, StoryStatus } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  PUBLICATION_STATUS_LABELS,
  VISIBILITY_LABELS,
} from '../../storytime.constants';
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
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the caller's Stories.
   */
  ngOnInit(): void {
    this.load();
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
