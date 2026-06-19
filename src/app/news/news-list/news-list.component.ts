import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
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
  ],
})
export class NewsListComponent implements OnInit {
  private readonly newsService = inject(NewsService);
  private readonly routingService = inject(RoutingService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  appRoutes = APP_ROUTES;
  categoryLabels = NEWS_CATEGORY_LABELS;
  categories = Object.values(NewsCategory);

  posts: NewsPost[] = [];
  isLoading = false;
  errorMessage = '';

  selectedCategory: NewsCategory | null = null;
  page = 1;
  total = 0;

  /**
   * Loads the first page of news on init.
   */
  ngOnInit(): void {
    this.loadPage(1);
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
    this.isLoading = true;
    this.errorMessage = '';
    this.page = page;

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }
      this.ngZone.run(() => {
        this.isLoading = false;
        this.errorMessage =
          'Loading news is taking longer than expected. Please try again.';
        this.cdr.detectChanges();
      });
    }, LOAD_TIMEOUT_MS);

    this.newsService
      .getPublishedNews({
        page,
        pageSize: PAGE_SIZE,
        category: this.selectedCategory ?? undefined,
      })
      .pipe(
        take(1),
        finalize(() => {
          this.ngZone.run(() => {
            clearTimeout(loadingTimeout);
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }),
      )
      .subscribe({
        next: result => {
          this.ngZone.run(() => {
            this.posts = result?.items ?? [];
            this.total = result?.total ?? 0;
            this.cdr.detectChanges();
          });
        },
        error: (error: HttpErrorResponse) => {
          this.ngZone.run(() => {
            this.errorMessage =
              error.status === 0
                ? 'Unable to reach the server. Please try again later.'
                : 'Something went wrong loading the news.';
            this.cdr.detectChanges();
          });
        },
      });
  }

  /**
   * Total number of pages for the current filter.
   *
   * @returns The page count (at least 1).
   */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / PAGE_SIZE));
  }

  /**
   * Builds the router link for a post detail page.
   *
   * @param slug - The post slug.
   * @returns The absolute route link.
   */
  getDetailLink(slug: string): string {
    return this.routingService.getLink(`${APP_ROUTES.NEWS}/${slug}`);
  }
}
