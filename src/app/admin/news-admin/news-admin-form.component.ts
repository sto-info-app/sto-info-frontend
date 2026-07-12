import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, take } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { MarkdownPipe } from 'src/app/shared/pipes/markdown.pipe';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import {
  CreateNewsPostRequest,
  NEWS_CATEGORY_LABELS,
  NewsCategory,
  NewsStatus,
} from 'src/app/models/news.models';
import { NewsService } from 'src/app/news/news.service';

/**
 * Create/edit form for a news post, with a live Markdown preview.
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
    LcarsErrorMessageComponent,
    MarkdownPipe,
  ],
})
export class NewsAdminFormComponent implements OnInit {
  private readonly _fb = inject(FormBuilder);
  private readonly _newsService = inject(NewsService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  private static readonly _LOAD_TIMEOUT_MS = 12000;

  appRoutes = APP_ROUTES;
  categoryLabels = NEWS_CATEGORY_LABELS;
  categories = Object.values(NewsCategory);
  statuses = Object.values(NewsStatus);

  postId: string | null = null;
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
      next: () => this._router.navigate(['/' + APP_ROUTES.ADMIN_NEWS]),
      error: () => {
        this.isSaving = false;
        this.errorMessage =
          'Failed to save the post. Check the slug is unique and try again.';
      },
    });
  }
}
