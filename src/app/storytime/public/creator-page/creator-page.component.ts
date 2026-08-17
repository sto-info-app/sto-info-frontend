import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { Arc, Story } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { SearchService } from '../../search.service';

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
  ],
})
export class CreatorPageComponent implements OnInit {
  /** The Stories they have published. */
  stories: Story[] = [];

  /** The Arcs they curate. */
  arcs: Arc[] = [];

  /** Whether the page is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _searchService = inject(SearchService);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Loads the member named in the route, and again if the route changes.
   */
  ngOnInit(): void {
    this._route.paramMap
      .pipe(
        switchMap(params => {
          this.isLoading = true;
          this.errorMessage = '';

          return this._searchService.getCreatorWork(params.get('userId') ?? '');
        }),
        takeUntilDestroyed(this._destroyRef),
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
    return this.stories.length === 0 && this.arcs.length === 0;
  }
}
