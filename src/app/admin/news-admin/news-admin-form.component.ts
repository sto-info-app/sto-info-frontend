import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, finalize, switchMap, take } from 'rxjs';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';
import { HelpLinkComponent } from 'src/app/shared/components/help-link/help-link.component';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  CreateNewsPostRequest,
  NEWS_CATEGORY_LABELS,
  NewsCategory,
  NewsPost,
  NewsStatus,
} from 'src/app/models/news.models';
import { NewsCover, newsCoverOf } from 'src/app/news/news-cover.constants';
import { NewsService } from 'src/app/news/news.service';
import { CollapsibleSectionComponent } from 'src/app/shared/components/collapsible-section/collapsible-section.component';

import {
  NewsCoverDialogComponent,
  NewsCoverDialogData,
} from './news-cover-dialog/news-cover-dialog.component';

/** What to say when a cover could not be removed. */
export const NEWS_COVER_REMOVE_FAILED =
  'The cover could not be removed. Please try again.';

/**
 * Create/edit form for a news post, with a live Markdown preview.
 *
 * A new post is saved first and then opens here again, where its cover can
 * be set (sc-1447): a cover is uploaded against a post that exists.
 */
@Component({
  selector: 'app-news-admin-form',
  templateUrl: './news-admin-form.component.html',
  styleUrls: ['./news-admin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    HelpLinkComponent,
    LcarsErrorMessageComponent,
    MarkdownPipe,
    CollapsibleSectionComponent,
  ],
})
export class NewsAdminFormComponent implements OnInit {
  private readonly _fb = inject(FormBuilder);
  private readonly _newsService = inject(NewsService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _dialog = inject(MatDialog);
  private readonly _confirm = new ConfirmPrompt();

  private static readonly _LOAD_TIMEOUT_MS = 12000;

  appRoutes = APP_ROUTES;
  categoryLabels = NEWS_CATEGORY_LABELS;
  categories = Object.values(NewsCategory);
  statuses = Object.values(NewsStatus);

  postId: string | null = null;
  /** The post as last read, for its cover; null until loaded or when new. */
  post: NewsPost | null = null;
  coverError = '';
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  showPreview = false;

  form = this._fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    slug: ['', [Validators.maxLength(280)]],
    summary: ['', [Validators.maxLength(500)]],
    body: ['', [Validators.required, Validators.maxLength(50000)]],
    category: [NewsCategory.GENERAL],
    status: [NewsStatus.DRAFT],
  });

  /**
   * Loads the post for editing when an `id` route parameter is present.
   */
  ngOnInit(): void {
    this.postId = this._route.snapshot.paramMap.get('id');
    if (this.postId) {
      this.loadPost(this.postId);
    }
  }

  /**
   * Whether the form is in edit mode.
   *
   * @returns `true` when editing an existing post.
   */
  get isEdit(): boolean {
    return this.postId !== null;
  }

  /**
   * Current body value for the preview.
   *
   * @returns The Markdown body.
   */
  get bodyValue(): string {
    return this.form.controls.body.value ?? '';
  }

  /**
   * A post's cover as an administrator sees it here, card-sized.
   *
   * @param post - The post.
   * @returns The cover, or null when it has none.
   */
  coverOf(post: NewsPost): NewsCover | null {
    return newsCoverOf(post, 'card');
  }

  /**
   * Loads an existing post into the form.
   *
   * @param id - The post ID.
   */
  private loadPost(id: string): void {
    this.isLoading = true;

    const loadingTimeout = setTimeout(() => {
      if (!this.isLoading) {
        return;
      }

      this._ngZone.run(() => {
        this.isLoading = false;
        this.errorMessage =
          'Loading post is taking longer than expected. Please try again.';
        this._cdr.detectChanges();
      });
    }, NewsAdminFormComponent._LOAD_TIMEOUT_MS);

    this._newsService
      .getNewsByIdForAdmin(id)
      .pipe(
        take(1),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => clearTimeout(loadingTimeout)),
      )
      .subscribe({
        next: post => {
          this.isLoading = false;
          if (!post) {
            this.errorMessage = 'Failed to load the post.';
            return;
          }

          this.post = post;
          this.form.patchValue({
            title: post.title,
            slug: post.slug,
            summary: post.summary ?? '',
            body: post.body,
            category: post.category,
            status: post.status,
          });
        },
        error: () => {
          this.errorMessage = 'Failed to load the post.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Sets or replaces the cover, through the cropping dialogue. The post
   * shows it once the scanner has cleared it.
   *
   * @param post - The post.
   */
  onSetCover(post: NewsPost): void {
    const data: NewsCoverDialogData = {
      postId: post.id,
      scopeName: post.title,
      currentAlt: post.coverImageAlt,
    };

    this.coverError = '';
    this._dialog
      .open(NewsCoverDialogComponent, {
        data,
        width: '90vw',
        maxWidth: '1100px',
      })
      .afterClosed()
      .pipe(take(1), filter(Boolean))
      .subscribe(() => this.refreshCover(post.id));
  }

  /**
   * Removes the cover, once asked.
   *
   * @param post - The post.
   */
  onRemoveCover(post: NewsPost): void {
    this.coverError = '';
    this._confirm
      .askToDestroy({
        title: 'Remove the cover?',
        question: 'Remove this post’s cover?',
        consequence:
          'It is taken down straight away and cannot be put back without ' +
          'uploading it again.',
        confirmText: 'Remove',
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this._newsService.removeCover(post.id)),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => this.refreshCover(post.id),
        error: () => (this.coverError = NEWS_COVER_REMOVE_FAILED),
      });
  }

  /**
   * Reads the post again for its cover, leaving the form as it was typed.
   *
   * @param id - The post ID.
   */
  private refreshCover(id: string): void {
    this._newsService
      .getNewsByIdForAdmin(id)
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe({
        next: post => (this.post = post),
        // The cover changed either way; the page is only behind.
        error: () => undefined,
      });
  }

  /**
   * Toggles the Markdown preview.
   */
  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  /**
   * Submits the form, creating or updating the post.
   */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const value = this.form.getRawValue();
    const payload: CreateNewsPostRequest = {
      title: value.title!,
      body: value.body!,
      category: value.category ?? undefined,
      status: value.status ?? undefined,
      slug: value.slug?.trim() ? value.slug.trim() : undefined,
      summary: value.summary?.trim() ? value.summary.trim() : undefined,
    };

    const request$ =
      this.isEdit && this.postId
        ? this._newsService.updateNews(this.postId, payload)
        : this._newsService.createNews(payload);

    request$.pipe(observeInZone(this._ngZone, this._cdr)).subscribe({
      next: saved => this.afterSave(saved),
      error: () => {
        this.isSaving = false;
        this.errorMessage =
          'Failed to save the post. Check the slug is unique and try again.';
      },
    });
  }

  /**
   * Leaves the form once saved: an edit returns to the list, and a new post
   * opens on its own edit page, where its cover can be set.
   *
   * @param saved - The post as saved.
   */
  private afterSave(saved: NewsPost): void {
    if (this.isEdit) {
      void this._router.navigate(['/' + APP_ROUTES.ADMIN_NEWS]);

      return;
    }

    void this._router.navigate(
      ['/' + APP_ROUTES.ADMIN_NEWS, saved.id, 'edit'],
      {
        replaceUrl: true,
      },
    );
  }
}
