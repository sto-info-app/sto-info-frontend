import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { SEO_SITE_URL } from 'src/app/shared/constants/seo.constants';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  NEWS_CATEGORY_LABELS,
  NewsCategory,
  NewsPost,
} from 'src/app/models/news.models';
import { NewsService } from '../news.service';

const LOAD_TIMEOUT_MS = 12000;

/**
 * Public detail view for a single published news post, rendering its Markdown
 * body.
 */
@Component({
  selector: 'app-news-detail',
  templateUrl: './news-detail.component.html',
  styleUrls: ['./news-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    MarkdownPipe,
  ],
})
export class NewsDetailComponent implements OnInit {
  private readonly _newsService = inject(NewsService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _routingService = inject(RoutingService);
  private readonly _seoService = inject(SeoService);
  private readonly _pageTitleService = inject(PageTitleService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  categoryLabels = NEWS_CATEGORY_LABELS;

  /** Font Awesome icon per category, shown alongside the post type. */
  categoryIcons: Record<NewsCategory, string> = {
    [NewsCategory.RELEASE_NOTES]: 'fa-code-branch',
    [NewsCategory.ANNOUNCEMENT]: 'fa-bullhorn',
    [NewsCategory.GENERAL]: 'fa-newspaper',
  };

  post: NewsPost | null = null;
  isLoading = false;
  notFound = false;
  errorMessage = '';

  /**
   * Loads the post identified by the `slug` route parameter.
   */
  ngOnInit(): void {
    const slug = this._route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.notFound = true;
      return;
    }
    this.loadPost(slug);
  }

  /**
   * Loads a post by slug.
   *
   * @param slug - The post slug.
   */
  private loadPost(slug: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    // LogRocket patches XHR so HTTP callbacks can fire outside Angular's zone;
    // a stalled request would otherwise leave the loading bar up indefinitely.
    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }
      this._ngZone.run(() => {
        this.isLoading = false;
        this.errorMessage =
          'Loading this post is taking longer than expected. Please try again.';
        this._cdr.detectChanges();
      });
    }, LOAD_TIMEOUT_MS);

    this._newsService
      .getNewsBySlug(slug)
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
        next: post => {
          this.post = post;
          this.applyPostMeta(post);
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.notFound = true;
          } else {
            this.errorMessage = 'Something went wrong loading this post.';
          }
          this.isLoading = false;
        },
      });
  }

  /**
   * Applies the post's title and summary to the document title and SEO meta
   * tags, so individual news posts have their own metadata when shared or
   * indexed.
   *
   * @param post - The loaded post.
   */
  private applyPostMeta(post: NewsPost): void {
    this._pageTitleService.setTitle(post.title);
    const ogImageUrl = `${SEO_SITE_URL}og/news/${post.slug}.png`;
    this._seoService.setPageMeta(
      post.title,
      post.summary ?? undefined,
      ogImageUrl,
    );
  }

  /**
   * Link back to the news list.
   *
   * @returns The news list route link.
   */
  get newsListLink(): string {
    return this._routingService.getLink(APP_ROUTES.NEWS);
  }
}
