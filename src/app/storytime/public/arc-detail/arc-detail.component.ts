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
import { switchMap } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  Arc,
  ArcMembership,
  ArcProgress,
  FollowTargetKind,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ArcService } from '../../arc.service';
import { AddToListComponent } from '../../shared/add-to-list/add-to-list.component';
import { CommentThreadComponent } from '../../shared/comment-thread/comment-thread.component';
import { FollowButtonComponent } from '../../shared/follow-button/follow-button.component';
import { ReactionControlComponent } from '../../shared/reaction-control/reaction-control.component';

/**
 * An Arc's own page: a reading order somebody has curated.
 *
 * The description arrives as HTML the server has already rendered and
 * sanitised, and is trusted here rather than re-sanitised for the same reason
 * it is everywhere else in Storytime: the server is the security boundary.
 */
@Component({
  selector: 'app-arc-detail',
  templateUrl: './arc-detail.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    ReactionControlComponent,
    FollowButtonComponent,
    AddToListComponent,
    CommentThreadComponent,
  ],
})
export class ArcDetailComponent implements OnInit {
  /** The kinds of thing the social controls act on. */
  readonly targetTypes = StorytimeTargetType;

  /** The kinds of thing that may be followed. */
  readonly followKinds = FollowTargetKind;

  /** The Arc being read. */
  arc: Arc | null = null;

  /** The Stories a reader can follow through it, in order. */
  stories: ArcMembership[] = [];

  /** The rendered description, ready to insert. */
  descriptionHtml: string | null = null;

  /** How far the signed-in reader has got, or null when there is nobody. */
  progress: ArcProgress | null = null;

  /** Whether the Arc is still loading. */
  isLoading = true;

  /** A message to show when the Arc could not be loaded. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _arcService = inject(ArcService);
  private readonly _authService = inject(AuthService);

  /**
   * Whether the reader curates this Arc.
   *
   * Decides whether the comment thread offers its hide control. The server
   * decides whether it works.
   *
   * @returns True when the Arc is theirs.
   */
  get isOwner(): boolean {
    return (
      this.arc !== null &&
      this.arc.ownerUserId === this._authService.getUserId()
    );
  }
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the Arc named in the route.
   */
  ngOnInit(): void {
    this._route.paramMap
      .pipe(
        switchMap(params => {
          this.isLoading = true;
          this.errorMessage = '';

          return this._arcService.getArc(params.get('arcSlug') ?? '');
        }),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: result => {
          this.arc = result.arc;
          this.stories = result.stories;
          // Assigned as a plain string (not SafeHtml) so Angular's built-in
          // sanitizer still runs on it before it reaches [innerHTML].
          this.descriptionHtml = result.arc.descriptionHtml;
          this.isLoading = false;
          this.loadProgress(result.arc.slug);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 404
              ? 'That Arc could not be found. It may have been removed or made private.'
              : 'This Arc could not be read. Please try again shortly.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Whether the reader has started this Arc.
   *
   * @returns True when there is progress worth showing.
   */
  get hasProgress(): boolean {
    return this.progress !== null && this.progress.totalStories > 0;
  }

  /**
   * The Story "continue reading" should open, if any.
   *
   * Resolved against the Stories on the page rather than trusted on its own,
   * so a Story the reader cannot open never becomes a link that goes nowhere.
   *
   * @returns The membership to continue from, or null when there is none.
   */
  get continueStory(): ArcMembership | null {
    const storyId = this.progress?.continueStoryId;

    return storyId
      ? (this.stories.find(membership => membership.storyId === storyId) ??
          null)
      : null;
  }

  /**
   * Whether a Story in the Arc has already been read.
   *
   * Everything before where the reader is up to counts as read: an Arc is
   * followed in order, so the Story they are on is the boundary.
   *
   * @param membership - The Story's place in the Arc.
   * @returns True when it sits before the one they are on.
   */
  isRead(membership: ArcMembership): boolean {
    if (!this.progress) {
      return false;
    }

    const position = this.stories.indexOf(membership);
    const current = this.continueStory
      ? this.stories.indexOf(this.continueStory)
      : this.stories.length;

    return position < current;
  }

  /**
   * Loads how far the reader has got through the Arc.
   *
   * Only for a signed-in reader, and best effort even then: a failure leaves
   * the Arc readable without progress rather than taking the page down over
   * bookkeeping.
   *
   * @param arcSlug - The Arc to ask about.
   */
  private loadProgress(arcSlug: string): void {
    if (!this._authService.isLoggedIn()) {
      this.progress = null;
      return;
    }

    this._arcService
      .getArcProgress(arcSlug)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: progress => {
          this.progress = progress;
        },
        error: () => {
          this.progress = null;
        },
      });
  }
}
