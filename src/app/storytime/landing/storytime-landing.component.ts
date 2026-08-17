import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { forkJoin, switchMap, of } from 'rxjs';
import { Spotlight, Story, StorySort } from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AuthService } from 'src/app/core/auth/auth.service';
import { FollowService } from '../follow.service';
import { SpotlightService } from '../spotlight.service';
import { StoryService } from '../story.service';
import { STORYTIME_COPY } from '../storytime.constants';
import { StorytimeService } from '../storytime.service';

/** How many Stories each landing list shows. */
const LANDING_STORY_COUNT = 6;

/**
 * The Storytime landing page.
 *
 * The Spotlight leads, because a landing page that opens with a list is asking
 * a visitor to choose before they know anything; opening with one thing
 * somebody chose and said why is an introduction.
 *
 * Underneath it, two lists that answer two different questions: what is new to
 * read, and what is being written now. A reader looking for something finished
 * and a reader following work in progress are not the same person, and one
 * "recent" list would serve neither.
 *
 * It does not check the master switch itself: the route guard has already
 * refused the visitor if Storytime is off, so re-checking here would duplicate
 * the decision and risk the two disagreeing. The Spotlight's own switch is
 * checked, because it decides whether this page has a Spotlight at all.
 */
@Component({
  selector: 'app-storytime-landing',
  templateUrl: './storytime-landing.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class StorytimeLandingComponent implements OnInit {
  /** The selections showing now, best first. */
  spotlight: Spotlight[] = [];

  /** The most recently published Stories. */
  newest: Story[] = [];

  /** The Stories written in most recently, which surfaces new Chapters. */
  updated: Story[] = [];

  /** User-facing copy, held centrally so wording stays consistent. */
  readonly copy = STORYTIME_COPY;

  /** How much of the reader's feed is new, once it has been counted. */
  unreadCount = 0;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _spotlightService = inject(SpotlightService);
  private readonly _followService = inject(FollowService);
  private readonly _authService = inject(AuthService);
  private readonly _storyService = inject(StoryService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the Spotlight and the two Story lists.
   */
  ngOnInit(): void {
    this.loadStories();
    this.countUnread();
    this._storytimeService
      .getFeatureState()
      .pipe(
        switchMap(features =>
          features.spotlightEnabled
            ? this._spotlightService.getSpotlight()
            : of([]),
        ),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        next: spotlight => {
          this.spotlight = spotlight;
        },
        // The Spotlight is the best of the page, not the whole of it. A
        // failure leaves the rest of Storytime reachable rather than
        // replacing the entry point with an apology.
        error: () => {
          this.spotlight = [];
        },
      });
  }

  /**
   * Whether the reader has a feed and lists of their own at all.
   *
   * @returns True when somebody is signed in.
   */
  get isSignedIn(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * Counts what is new in the reader's feed.
   *
   * Best effort, and silent when it fails: an unread badge is a convenience,
   * and a landing page that apologises for not having one is worse than a
   * landing page without one.
   */
  private countUnread(): void {
    if (!this.isSignedIn) {
      return;
    }

    this._followService
      .getUnreadCount()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: ({ unread }) => (this.unreadCount = unread),
        error: () => (this.unreadCount = 0),
      });
  }

  /**
   * Loads the two Story lists.
   *
   * Both are best effort. A landing page missing a list is a smaller failure
   * than a landing page replaced by an apology, and the Stories archive is one
   * click away either way.
   */
  private loadStories(): void {
    forkJoin({
      newest: this._storyService.getStories({
        pageSize: LANDING_STORY_COUNT,
        sort: StorySort.RECENTLY_PUBLISHED,
      }),
      updated: this._storyService.getStories({
        pageSize: LANDING_STORY_COUNT,
        sort: StorySort.RECENTLY_UPDATED,
      }),
    })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: lists => {
          this.newest = lists.newest.items;
          this.updated = lists.updated.items;
        },
        error: () => {
          this.newest = [];
          this.updated = [];
        },
      });
  }

  /**
   * Where a selection sends a reader.
   *
   * @param entry - The selection.
   * @returns The router link for the featured work.
   */
  linkFor(entry: Spotlight): unknown[] {
    return entry.story
      ? ['/', this.appRoutes.STORYTIME, 'stories', entry.story.slug]
      : ['/', this.appRoutes.STORYTIME, 'arcs', entry.arc?.slug];
  }

  /**
   * The image to show with a selection.
   *
   * The editor's override wins when there is one; otherwise the work's own
   * banner, which is what a reader would see when they arrive.
   *
   * @param entry - The selection.
   * @returns The image URL, or null when there is nothing to show.
   */
  imageFor(entry: Spotlight): string | null {
    return (
      entry.overrideImageUrl ??
      entry.story?.bannerImageUrl ??
      entry.arc?.bannerImageUrl ??
      null
    );
  }

  /**
   * The alternative text for a selection's image.
   *
   * @param entry - The selection.
   * @returns The alternative text, empty when the image is decorative.
   */
  imageAltFor(entry: Spotlight): string {
    return (
      entry.overrideImageAlt ??
      entry.story?.bannerImageAlt ??
      entry.arc?.bannerImageAlt ??
      ''
    );
  }
}
