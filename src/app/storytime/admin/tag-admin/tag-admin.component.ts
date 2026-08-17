import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import {
  StorytimeTag,
  StorytimeTagCategory,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { TagService } from '../../tag.service';
import { TAG_CATEGORY_LABELS } from '../../storytime.constants';

/**
 * The Storytime tag vocabulary, as an administrator manages it.
 *
 * The whole list on one page rather than a form per tag: the job here is
 * keeping a vocabulary coherent, and that means seeing what is already on the
 * shelf while adding to it.
 */
@Component({
  selector: 'app-tag-admin',
  templateUrl: './tag-admin.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class TagAdminComponent implements OnInit {
  /** The vocabulary, grouped into the shelves it is shown on. */
  groups: { category: string; label: string; tags: StorytimeTag[] }[] = [];

  /** The tag being edited, if any. */
  editingTagId: string | null = null;

  /** Whether the page is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** The categories a tag may belong to. */
  readonly categories = Object.values(StorytimeTagCategory);

  /** How each category is named. */
  readonly categoryLabels = TAG_CATEGORY_LABELS;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _tagService = inject(TagService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);

  /** The form for adding a tag, or editing the one selected. */
  readonly form = this._formBuilder.nonNullable.group({
    name: ['', Validators.required],
    category: [StorytimeTagCategory.FACTION as string, Validators.required],
    slug: [''],
    description: [''],
    displayOrder: [0],
  });

  /**
   * Loads the vocabulary.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Loads a tag into the form for editing.
   *
   * @param tag - The tag.
   */
  edit(tag: StorytimeTag): void {
    this.editingTagId = tag.id;
    this.form.patchValue({
      name: tag.name,
      category: tag.category,
      slug: tag.slug,
      description: tag.description ?? '',
      displayOrder: tag.displayOrder,
    });
  }

  /**
   * Abandons an edit and returns the form to adding.
   */
  cancelEdit(): void {
    this.editingTagId = null;
    this.form.reset({
      category: StorytimeTagCategory.FACTION,
      displayOrder: 0,
    });
  }

  /**
   * Saves the form, adding a tag or changing the one being edited.
   */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      category: value.category as StorytimeTagCategory,
      slug: value.slug.trim() || undefined,
      description: value.description.trim() || null,
      displayOrder: Number(value.displayOrder),
    };

    this.runAction(
      this.editingTagId
        ? this._tagService.updateTag(this.editingTagId, payload)
        : this._tagService.createTag(payload),
      () => this.cancelEdit(),
    );
  }

  /**
   * Removes a tag from the vocabulary.
   *
   * @param tag - The tag.
   */
  remove(tag: StorytimeTag): void {
    this.runAction(this._tagService.deleteTag(tag.id), () => {
      if (this.editingTagId === tag.id) {
        this.cancelEdit();
      }
    });
  }

  /**
   * Runs an action, then reloads so the list reflects what the server did.
   *
   * @param action - The action to run.
   * @param onSuccess - Anything else to do once it succeeds.
   */
  private runAction(action: Observable<unknown>, onSuccess?: () => void): void {
    this.isLoading = true;
    this.errorMessage = '';

    action.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        onSuccess?.();
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        // The server names the problem — usually a tag that already exists —
        // which is more use than a generic failure.
        this.errorMessage =
          (error.error as { message?: string } | undefined)?.message ??
          'That change could not be saved. Please try again shortly.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Loads the vocabulary.
   */
  private load(): void {
    this.isLoading = true;

    this._tagService
      .getTags()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: tags => {
          this.groups = this.groupByCategory(tags);
        },
        error: () => {
          this.errorMessage =
            'The tag list could not be loaded. Please try again shortly.';
        },
      });
  }

  /**
   * Groups the vocabulary into the shelves it is shown on.
   *
   * @param tags - The whole vocabulary, already in order.
   * @returns The tags by category.
   */
  private groupByCategory(
    tags: StorytimeTag[],
  ): { category: string; label: string; tags: StorytimeTag[] }[] {
    const groups = new Map<string, StorytimeTag[]>();

    for (const tag of tags) {
      groups.set(tag.category, [...(groups.get(tag.category) ?? []), tag]);
    }

    return [...groups.entries()].map(([category, categoryTags]) => ({
      category,
      label: TAG_CATEGORY_LABELS[category] ?? category,
      tags: categoryTags,
    }));
  }
}
