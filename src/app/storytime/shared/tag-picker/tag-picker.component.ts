import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StorytimeTag } from 'src/app/models/storytime.models';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { TagService } from '../../tag.service';
import { TAG_CATEGORY_LABELS } from '../../storytime.constants';

/**
 * Choosing tags for a Story or an Arc.
 *
 * The vocabulary is administrator-managed, so this is a picker rather than a
 * text box: a creator chooses from the shelf everybody else chose from, which
 * is the only way a tag filter finds anything.
 *
 * Saving replaces the whole set rather than sending adds and removes, matching
 * the API. A half-applied set of tags is worse than none.
 */
@Component({
  selector: 'app-tag-picker',
  templateUrl: './tag-picker.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class TagPickerComponent implements OnInit {
  /** What is being tagged. */
  @Input({ required: true }) targetType!: 'STORY' | 'ARC';

  /** The Story or Arc being tagged. */
  @Input({ required: true }) targetId!: string;

  /** The whole vocabulary, grouped by category. */
  groups: { category: string; label: string; tags: StorytimeTag[] }[] = [];

  /** The tags currently chosen. */
  chosen = new Set<string>();

  /** Whether the picker is still loading. */
  isLoading = true;

  /** Whether a save is in flight. */
  isSaving = false;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Whether the last save succeeded, so the page can say so. */
  isSaved = false;

  private readonly _tagService = inject(TagService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the vocabulary and whatever is already chosen.
   */
  ngOnInit(): void {
    this._tagService
      .getTags()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: tags => {
          this.groups = this.groupByCategory(tags);
          this.loadChosen();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage =
            'The tag list could not be loaded. Please try again shortly.';
        },
      });
  }

  /**
   * Whether a tag is currently chosen.
   *
   * @param tag - The tag.
   * @returns True when it is.
   */
  isChosen(tag: StorytimeTag): boolean {
    return this.chosen.has(tag.id);
  }

  /**
   * Adds or removes a tag from the chosen set.
   *
   * @param tag - The tag.
   */
  toggle(tag: StorytimeTag): void {
    this.isSaved = false;

    if (this.chosen.has(tag.id)) {
      this.chosen.delete(tag.id);
      return;
    }

    this.chosen.add(tag.id);
  }

  /**
   * Saves the chosen set.
   */
  save(): void {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.isSaved = false;

    const tagIds = [...this.chosen];
    const request =
      this.targetType === 'ARC'
        ? this._tagService.setArcTags(this.targetId, tagIds)
        : this._tagService.setStoryTags(this.targetId, tagIds);

    request
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: tags => {
          this.chosen = new Set(tags.map(tag => tag.id));
          this.isSaving = false;
          this.isSaved = true;
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          // The server explains what went wrong — usually a tag deleted since
          // the picker loaded — which is more use than a generic failure.
          this.errorMessage =
            (error.error as { message?: string } | undefined)?.message ??
            'Those tags could not be saved. Please try again shortly.';
        },
      });
  }

  /**
   * Loads the tags already on the content.
   */
  private loadChosen(): void {
    const request: Observable<StorytimeTag[]> =
      this.targetType === 'ARC'
        ? this._tagService.getArcTags(this.targetId)
        : this._tagService.getStoryTags(this.targetId);

    request
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: tags => {
          this.chosen = new Set(tags.map(tag => tag.id));
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage =
            'The tags on this could not be loaded. Please try again shortly.';
        },
      });
  }

  /**
   * Groups the vocabulary into the shelves it is shown on.
   *
   * @param tags - The whole vocabulary, already in order.
   * @returns The tags by category, keeping the order they arrived in.
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
