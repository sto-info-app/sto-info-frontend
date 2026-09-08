import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, switchMap, of } from 'rxjs';
import {
  CONTENT_RATING_LABELS,
  Spotlight,
  Story,
  StorySort,
} from 'src/app/models/storytime.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { AuthService } from 'src/app/core/auth/auth.service';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { AccessControlService } from 'src/app/shared/services/access-control.service';
import { FollowService } from '../follow.service';
import { StoryCardComponent } from '../public/story-card/story-card.component';
import { StorytimeTagRowComponent } from '../shared/tag-row/tag-row.component';
import { SpotlightService } from '../spotlight.service';
import {
  STORYTIME_ADMIN_LINKS,
  StorytimeAdminLink,
  storytimeAdminRouterLink,
} from '../storytime-admin-links';
import { StoryService } from '../story.service';
import {
  COMPLETION_STATE_LABELS,
  STORYTIME_COPY,
} from '../storytime.constants';
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
 * Every section folds away. Signed in, the page runs to five of them, and a
 * reader who comes back for one — their own works, or what is new — should be
 * able to put the rest out of the way rather than scroll past it each time.
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
  imports: [
    CommonModule,
    RouterModule,
    StoryCardComponent,
    StorytimeTagRowComponent,
    CollapsibleSectionComponent,
  ],
})
export class StorytimeLandingComponent implements OnInit {
  /** The selections showing now, best first. */
  spotlight: Spotlight[] = [];

  /**
   * Whether the Spotlight exists at all in this environment.
   *
   * Decides whether the page offers a way into it. Defaults to hidden, so a
   * link never appears and then vanishes once the feature state arrives.
   */
  isSpotlightEnabled = false;

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

  /** Rating labels, so a raw enum value is never shown. */
  readonly ratingLabels = CONTENT_RATING_LABELS;

  /** Completion labels, so a raw enum value is never shown. */
  readonly completionLabels = COMPLETION_STATE_LABELS;

  /**
   * The management pages this reader has been given, if any.
   *
   * Empty for almost everybody, and empty until the answer arrives, so a card
   * never appears and then vanishes.
   */
  adminLinks: StorytimeAdminLink[] = [];

  private readonly _spotlightService = inject(SpotlightService);
  private readonly _followService = inject(FollowService);
  private readonly _authService = inject(AuthService);
  private readonly _accessControlService = inject(AccessControlService);
  private readonly _storyService = inject(StoryService);
  private readonly _storytimeService = inject(StorytimeService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the Spotlight and the two Story lists.
   */
  ngOnInit(): void {
    this.loadStories();
    this.countUnread();
    this.loadAdminLinks();
    this._storytimeService
      .getFeatureState()
      .pipe(
        switchMap(features => {
          this.isSpotlightEnabled = features.spotlightEnabled;
          return features.spotlightEnabled
            ? this._spotlightService.getSpotlight()
            : of([]);
        }),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
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
   * Works out which of Storytime's own management pages to offer.
   *
   * The same cards appear on the site's Admin page, filtered the same way.
   * They are not in the sidebar, which knows only whether somebody is an
   * administrator: moderating Storytime, curating the Spotlight and keeping the
   * tag list are jobs given out one at a time by permission.
   *
   * Silent when it fails, and silent for everybody who holds none of the
   * three. Hiding the cards is a courtesy either way — the routes and the API
   * refuse anybody who does not hold the permission, whatever this page shows.
   */
  private loadAdminLinks(): void {
    if (!this.isSignedIn) {
      return;
    }

    this._accessControlService
      .getMyPermissions()
      .pipe(
        catchError(() => of(new Set<string>() as ReadonlySet<string>)),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(permissions => {
        this.adminLinks = STORYTIME_ADMIN_LINKS.filter(link =>
          permissions.has(link.permission),
        );
      });
  }

  /**
   * Where a management card sends its reader.
   *
   * @param link - The management page.
   * @returns The router link for it.
   */
  adminLinkFor(link: StorytimeAdminLink): unknown[] {
    return storytimeAdminRouterLink(link);
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
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
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
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
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
   * The title of the work a selection features.
   *
   * @param entry - The selection.
   * @returns The Story's or the Arc's title.
   */
  titleFor(entry: Spotlight): string {
    return entry.story?.title ?? entry.arc?.title ?? '';
  }

  /**
   * What the featured work is, as the editor who chose it was asked for it.
   *
   * The same words the Spotlight form uses, so the caption on the panel and
   * the caption on the form that filled it in say the same thing.
   *
   * @param entry - The selection.
   * @returns The caption for the work's title.
   */
  targetLabelFor(entry: Spotlight): string {
    return entry.story ? 'Featured Story' : 'Featured Arc';
  }

  /**
   * What the selection's button offers to open.
   *
   * Named rather than a bare "Read", because a Story and an Arc are different
   * commitments and a reader deciding between them should be told which one
   * the button leads to.
   *
   * @param entry - The selection.
   * @returns The button's label.
   */
  readLabelFor(entry: Spotlight): string {
    return entry.story ? 'Read the Story' : 'Read the Arc';
  }

  /**
   * How the featured work has been rated.
   *
   * A Story and an Arc both carry one, and a panel that showed it for only one
   * of them would read as a Story fact that Arcs happen to be missing.
   *
   * @param entry - The selection.
   * @returns Thumbs up minus thumbs down, and zero when nothing is featured.
   */
  ratingFor(entry: Spotlight): number {
    return entry.story?.rating ?? entry.arc?.rating ?? 0;
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
