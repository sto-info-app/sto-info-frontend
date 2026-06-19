import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { SEO_SITE_URL } from 'src/app/shared/constants/seo.constants';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';
import { NEWS_CATEGORY_LABELS, NewsPost } from 'src/app/models/news.models';
import { NewsService } from '../news.service';

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
  private readonly newsService = inject(NewsService);
  private readonly route = inject(ActivatedRoute);
  private readonly routingService = inject(RoutingService);
  private readonly seoService = inject(SeoService);
  private readonly pageTitleService = inject(PageTitleService);

  categoryLabels = NEWS_CATEGORY_LABELS;
  post: NewsPost | null = null;
  isLoading = false;
  notFound = false;
  errorMessage = '';

  /**
   * Loads the post identified by the `slug` route parameter.
   */
  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
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
    this.newsService
      .getNewsBySlug(slug)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: post => {
          this.post = post;
          this.applyPostMeta(post);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.notFound = true;
          } else {
            this.errorMessage = 'Something went wrong loading this post.';
          }
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
    this.pageTitleService.setTitle(post.title);
    const ogImageUrl = `${SEO_SITE_URL}og/news/${post.slug}.png`;
    this.seoService.setPageMeta(
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
    return this.routingService.getLink(APP_ROUTES.NEWS);
  }
}
