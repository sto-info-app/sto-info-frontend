import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  NEWS_CATEGORY_ICONS,
  NEWS_CATEGORY_LABELS,
  NewsPost,
  NewsStatus,
} from 'src/app/models/news.models';
import { NewsService } from 'src/app/news/news.service';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';
import { LcarsPaginationComponent } from 'src/app/shared/components/lcars-pagination/lcars-pagination.component';

/** Posts to a page: few enough to read down with their summaries. */
const PAGE_SIZE = 5;
const LOAD_TIMEOUT_MS = 12000;

/**
 * Admin listing of all news posts (including drafts), five to a page, with
 * publish/delete actions.
 */
@Component({
  selector: 'app-news-admin-list',
  templateUrl: './news-admin-list.component.html',
  styleUrls: ['./news-admin.component.scss'],
  standalone: true,
  imports: [
    AppDatePipe,
    CommonModule,
    MatDialogModule,
    RouterModule,
    LoadingBarComponent,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    CollapsibleSectionComponent,
    LcarsPaginationComponent,
  ],
})
export class NewsAdminListComponent implements OnInit {
  private readonly _newsService = inject(NewsService);
  private readonly _routingService = inject(RoutingService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _dialog = inject(MatDialog);

  appRoutes = APP_ROUTES;
  categoryLabels = NEWS_CATEGORY_LABELS;
  categoryIcons = NEWS_CATEGORY_ICONS;
  newsStatus = NewsStatus;

  posts: NewsPost[] = [];
  page = 1;
  total = 0;
  isLoading = false;
  errorMessage = '';

  /**
   * Loads the first page of posts on init.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * How many pages the posts make.
   *
   * @returns The page count, at least 1.
   */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / PAGE_SIZE));
  }

  /**
   * Loads a page of posts for administration.
   *
   * @param page - The 1-based page number; the current page by default.
   */
  load(page = this.page): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.page = page;

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }

      this._ngZone.run(() => {
        this.isLoading = false;
        this.posts = [];
        this.errorMessage =
          'Loading posts is taking longer than expected. Please try again.';
        this._cdr.detectChanges();
      });
    }, LOAD_TIMEOUT_MS);

    this._newsService
      .getAllNewsForAdmin({ page, pageSize: PAGE_SIZE })
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: result => {
          this.posts = Array.isArray(result?.items) ? result.items : [];
          this.total = result?.total ?? 0;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load posts.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Publishes a draft post.
   *
   * @param post - The post to publish.
   */
  publish(post: NewsPost): void {
    this._newsService
      .publishNews(post.id)
      .pipe(observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: updated => this.replacePost(updated),
        error: () => (this.errorMessage = 'Failed to publish the post.'),
      });
  }

  /**
   * Deletes a post after confirmation, then reads the page again so the
   * next post moves up into its place; the last post of a later page takes
   * the list back a page.
   *
   * @param post - The post to delete.
   */
  remove(post: NewsPost): void {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '75%',
      data: {
        title: 'Delete News Post',
        message: `
          <p>Are you sure you want to delete <span class="go-bluey">${post.title}</span>?</p>
          <p><strong>WARNING:</strong> This action cannot be undone.</p>`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(confirmed => {
        if (!confirmed) {
          return;
        }
        this._newsService
          .deleteNews(post.id)
          .pipe(observeInZone(this._ngZone, this._cdr))
          .subscribe({
            next: () =>
              this.load(
                this.posts.length === 1 && this.page > 1
                  ? this.page - 1
                  : this.page,
              ),
            error: () => (this.errorMessage = 'Failed to delete the post.'),
          });
      });
  }

  /**
   * Builds the edit route link for a post.
   *
   * @param post - The post.
   * @returns The edit route link.
   */
  editLink(post: NewsPost): string {
    return this._routingService.getLink(
      `${APP_ROUTES.ADMIN}/news/${post.id}/edit`,
    );
  }

  /**
   * Replaces a post in the local list with an updated version.
   *
   * @param updated - The updated post.
   */
  private replacePost(updated: NewsPost): void {
    this.posts = this.posts.map(post =>
      post.id === updated.id ? updated : post,
    );
  }
}
