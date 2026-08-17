import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  FeedEntry,
  StorytimeActivityType,
} from 'src/app/models/storytime.models';
import { FollowService } from '../../follow.service';

/** What each kind of activity says in a feed. */
export const ACTIVITY_WORDING: Record<StorytimeActivityType, string> = {
  [StorytimeActivityType.STORY_PUBLISHED]: 'published a new Story',
  [StorytimeActivityType.CHAPTER_PUBLISHED]: 'published a new Chapter',
  [StorytimeActivityType.STORY_UPDATED]: 'updated a Story',
  [StorytimeActivityType.STORY_STATUS_CHANGED]: 'changed a Story’s status',
  [StorytimeActivityType.ARC_UPDATED]: 'updated an Arc',
  [StorytimeActivityType.ARC_STORY_ADDED]: 'added a Story to an Arc',
  [StorytimeActivityType.ARC_STORY_REMOVED]: 'removed a Story from an Arc',
  [StorytimeActivityType.SPOTLIGHT_SELECTED]: 'was chosen for the Spotlight',
};

/** How many entries a page holds, matching the server. */
const PAGE_SIZE = 30;

/**
 * What the people and work a reader follows have been doing.
 *
 * Opening the page marks it read, because that is what looking at it means.
 * The entries themselves are resolved by the server when it answers, so
 * anything taken down since is simply absent rather than a dead link.
 */
@Component({
  selector: 'app-activity-feed',
  templateUrl: './activity-feed.component.html',
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class ActivityFeedComponent implements OnInit {
  /** What has happened, newest first. */
  entries: FeedEntry[] = [];

  /** Whether the feed is still loading. */
  isLoading = true;

  /** The page being shown. */
  page = 1;

  /** Whether there may be more to read. */
  hasMore = false;

  /** A message to show when something failed. */
  errorMessage = '';

  private readonly _followService = inject(FollowService);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the first page and marks the feed as seen.
   */
  ngOnInit(): void {
    this.load(1);

    // Looking at the feed is what having seen it means, so the watermark moves
    // on arrival rather than waiting for a button nobody would press.
    this._followService
      .markFeedRead()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({ error: () => undefined });
  }

  /**
   * What one entry says happened.
   *
   * @param entry - The entry.
   * @returns The wording for its kind.
   */
  wordingFor(entry: FeedEntry): string {
    return ACTIVITY_WORDING[entry.activityType];
  }

  /**
   * Where an entry leads.
   *
   * A Chapter leads to the Chapter, a Story to the Story and an Arc to the
   * Arc. An entry with nothing to open is not shown at all, so there is always
   * somewhere to go.
   *
   * @param entry - The entry.
   * @returns The route to follow.
   */
  linkFor(entry: FeedEntry): string[] {
    if (entry.chapterSlug && entry.storySlug) {
      return [
        '/storytime',
        'stories',
        entry.storySlug,
        'chapters',
        entry.chapterSlug,
      ];
    }

    if (entry.storySlug) {
      return ['/storytime', 'stories', entry.storySlug];
    }

    return ['/storytime', 'arcs', entry.arcSlug ?? ''];
  }

  /**
   * What an entry is called.
   *
   * The server only sends an entry it could resolve content for, so one of the
   * three is always a title.
   *
   * @param entry - The entry.
   * @returns The title of whatever it concerns.
   */
  titleFor(entry: FeedEntry): string | null {
    return entry.chapterTitle ?? entry.storyTitle ?? entry.arcTitle;
  }

  /**
   * Reads the next page.
   */
  loadMore(): void {
    this.load(this.page + 1);
  }

  /**
   * Reads one page of the feed.
   *
   * @param page - The page wanted.
   */
  private load(page: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this._followService
      .getFeed(page)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: entries => {
          this.entries = page === 1 ? entries : [...this.entries, ...entries];
          this.page = page;
          this.hasMore = entries.length === PAGE_SIZE;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'Your feed could not be loaded.';
          this.isLoading = false;
        },
      });
  }
}
