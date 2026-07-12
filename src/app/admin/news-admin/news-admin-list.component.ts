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

const PAGE_SIZE = 20;
const LOAD_TIMEOUT_MS = 12000;

/**
 * Admin listing of all news posts (including drafts) with publish/delete
 * actions.
 */
@Component({
  selector: 'app-news-admin-list',
  templateUrl: './news-admin-list.component.html',
  styleUrls: ['./news-admin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
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
  isLoading = false;
  errorMessage = '';

  /**
   * Loads all posts on init.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Loads all posts for administration.
   */
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

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
      .getAllNewsForAdmin({ page: 1, pageSize: PAGE_SIZE })
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: result => {
          this.posts = Array.isArray(result?.items) ? result.items : [];
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
   * Deletes a post after confirmation.
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
            next: () => (this.posts = this.posts.filter(p => p.id !== post.id)),
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
