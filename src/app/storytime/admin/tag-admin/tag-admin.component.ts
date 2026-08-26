import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import {
  StorytimeTag,
  StorytimeTagCategory,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { StorytimeActionRunner } from '../../shared/storytime-action.runner';
import {
  TAG_CATEGORY_DESCRIPTIONS,
  TAG_CATEGORY_LABELS,
} from '../../storytime.constants';
import { groupTagsByCategory } from '../../tag-grouping.utility';
import { TagService } from '../../tag.service';

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

  /**
   * The categories with the explanation shown beside the chooser.
   *
   * A select's container is a solid colour, so hint text inside one cannot be
   * read; the explanations go in the help popup beside it instead, the same way
   * the Story editor explains its ratings.
   */
  readonly categoryOptions = Object.values(StorytimeTagCategory).map(
    category => ({
      value: category,
      label: TAG_CATEGORY_LABELS[category],
      description: TAG_CATEGORY_DESCRIPTIONS[category],
    }),
  );

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _tagService = inject(TagService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _actions = new StorytimeActionRunner(this, () =>
    this.load(),
  );

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

    this._actions.run(
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
    this._actions.run(this._tagService.deleteTag(tag.id), () => {
      if (this.editingTagId === tag.id) {
        this.cancelEdit();
      }
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
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: tags => {
          this.groups = groupTagsByCategory(tags);
        },
        error: () => {
          this.errorMessage =
            'The tag list could not be loaded. Please try again shortly.';
        },
      });
  }
}
