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
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import {
  Arc,
  FollowTargetKind,
  ReadingList,
  Story,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ReadingListService } from '../../reading-list.service';
import { SearchService } from '../../search.service';
import { FollowButtonComponent } from '../../shared/follow-button/follow-button.component';
import { StorytimeTagRowComponent } from '../../shared/tag-row/tag-row.component';

/**
 * Everything one member has published, in one place.
 *
 * Reached by member identifier, because a creator page is a view of an account
 * rather than a thing with an address of its own.
 *
 * Only publicly listed work appears, which is the server's rule as well:
 * unlisted work stays reachable by link and invisible to browsing, and this
 * page is browsing.
 */
@Component({
  selector: 'app-creator-page',
  templateUrl: './creator-page.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    FollowButtonComponent,
    StorytimeTagRowComponent,
  ],
})
export class CreatorPageComponent implements OnInit {
  /** The Stories they have published. */
  stories: Story[] = [];

  /** The Arcs they curate. */
  arcs: Arc[] = [];

  /** The reading lists they have made public. */
  readingLists: ReadingList[] = [];

  /** The member whose page this is. */
  userId = '';

  /** The kinds of thing that may be followed. */
  readonly followKinds = FollowTargetKind;

  /** Whether the page is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _searchService = inject(SearchService);
  private readonly _readingListService = inject(ReadingListService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the member named in the route, and again if the route changes.
   */
  ngOnInit(): void {
    this._route.paramMap
      .pipe(
        switchMap(params => {
          this.isLoading = true;
          this.errorMessage = '';
          this.userId = params.get('userId') ?? '';
          this.loadReadingLists();

          return this._searchService.getCreatorWork(this.userId);
        }),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: work => {
          this.stories = work.stories;
          this.arcs = work.arcs;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage =
            'This creator’s work could not be loaded. Please try again shortly.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Whether the member has published anything at all.
   *
   * @returns True when there is nothing to show.
   */
  get isEmpty(): boolean {
    return (
      this.stories.length === 0 &&
      this.arcs.length === 0 &&
      this.readingLists.length === 0
    );
  }

  /**
   * Reads the member's public reading lists.
   *
   * A separate request from their work, and a failure is left silent: a
   * creator page is about what they have written, and losing the lists should
   * not turn it into an error page.
   */
  private loadReadingLists(): void {
    this._readingListService
      .getPublicLists(this.userId)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: lists => (this.readingLists = lists),
        error: () => (this.readingLists = []),
      });
  }
}
