import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription, finalize, take } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { NewsCardComponent } from 'src/app/shared/components/news-card/news-card.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  NEWS_CATEGORY_LABELS,
  NewsCategory,
  NewsPost,
} from 'src/app/models/news.models';
import { NewsService } from '../news.service';

const PAGE_SIZE = 10;
const LOAD_TIMEOUT_MS = 12000;

/**
 * Public, paginated list of published news posts with an optional category
 * filter.
 */
@Component({
  selector: 'app-news-list',
  templateUrl: './news-list.component.html',
  styleUrls: ['./news-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    NewsCardComponent,
  ],
})
export class NewsListComponent implements OnInit, OnDestroy {
  private readonly _newsService = inject(NewsService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /** The current in-flight news request, so a new load can cancel it. */
  private loadSubscription?: Subscription;

  categoryLabels = NEWS_CATEGORY_LABELS;
  categories = Object.values(NewsCategory);

  posts: NewsPost[] = [];
  isLoading = false;
  errorMessage = '';

  selectedCategory: NewsCategory | null = null;
  page = 1;
  total = 0;

  /** Published-post counts per category, supplied by the API. */
  categoryCounts: Partial<Record<NewsCategory, number>> = {};

  /**
   * Loads the first page of news on init.
   */
  ngOnInit(): void {
    this.loadPage(1);
  }

  /**
   * Cancels any in-flight news request when the component is torn down.
   */
  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  /**
   * Filters the list by category and reloads from the first page.
   *
   * @param category - The category to filter by, or null for all.
   */
  filterByCategory(category: NewsCategory | null): void {
    this.selectedCategory = category;
    this.loadPage(1);
  }

  /**
   * Loads a specific page of published news.
   *
   * @param page - The 1-based page number.
   */
  loadPage(page: number): void {
    // Cancel any request still in flight (e.g. a rapid category switch) so its
    // late response and stale loading timeout can't clobber this load's state.
    this.loadSubscription?.unsubscribe();

    this.isLoading = true;
    this.errorMessage = '';
    this.page = page;

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }
      this._ngZone.run(() => {
        this.isLoading = false;
        this.errorMessage =
          'Loading news is taking longer than expected. Please try again.';
        this._cdr.detectChanges();
      });
    }, LOAD_TIMEOUT_MS);

    this.loadSubscription = this._newsService
      .getPublishedNews({
        page,
        pageSize: PAGE_SIZE,
        category: this.selectedCategory ?? undefined,
      })
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        // Safety net: clear loading on *every* termination path. next/error
        // below cover the happy and error paths immediately, but a stream that
        // completes without emitting would otherwise leave the spinner stuck
        // forever (the load timeout has already been cleared here too).
        finalize(() => {
          clearTimeout(loadingTimeout);
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: result => {
          this.posts = result?.items ?? [];
          this.total = result?.total ?? 0;
          // Counts are filter-independent, so only refresh them when the API
          // actually returns them (keeps chips stable while filtering).
          if (result?.categoryCounts) {
            this.categoryCounts = result.categoryCounts;
          }
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 0
              ? 'Unable to reach the server. Please try again later.'
              : 'Something went wrong loading the news.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Categories that currently have at least one published post, so empty
   * categories are never offered as a filter.
   *
   * @returns The list of categories with posts.
   */
  get visibleCategories(): NewsCategory[] {
    return this.categories.filter(
      category => (this.categoryCounts[category] ?? 0) > 0,
    );
  }

  /**
   * Total number of pages for the current filter.
   *
   * @returns The page count (at least 1).
   */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / PAGE_SIZE));
  }
}
