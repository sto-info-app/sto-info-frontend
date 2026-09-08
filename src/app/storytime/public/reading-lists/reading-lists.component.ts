import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ReadingList } from 'src/app/models/storytime.models';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ReadingListService } from '../../reading-list.service';

/**
 * The reader's own reading lists.
 *
 * Private ones included: a list is often a working note before it is a
 * recommendation, and this is the only page that shows both kinds together.
 */
@Component({
  selector: 'app-reading-lists',
  templateUrl: './reading-lists.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LcarsToggleComponent],
})
export class ReadingListsComponent implements OnInit {
  /** The reader's lists, most recently touched first. */
  lists: ReadingList[] = [];

  /** Whether the lists are still loading. */
  isLoading = true;

  /** Whether something is in flight. */
  isSaving = false;

  /** The name of the list being made. */
  newName = '';

  /** Whether the list being made is public. */
  newIsPublic = false;

  /** A message to show when something failed. */
  errorMessage = '';

  private readonly _readingListService = inject(ReadingListService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the reader's lists.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Makes a list from what the reader typed.
   */
  create(): void {
    const name = this.newName.trim();

    if (!name || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    this._readingListService
      .createList({ name, isPublic: this.newIsPublic })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => {
          this.newName = '';
          this.newIsPublic = false;
          this.isSaving = false;
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'That list could not be made.';
          this.isSaving = false;
        },
      });
  }

  /**
   * Deletes a list.
   *
   * @param list - The list.
   */
  remove(list: ReadingList): void {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    this._readingListService
      .deleteList(list.id)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'That list could not be deleted.';
          this.isSaving = false;
        },
      });
  }

  /**
   * Reads the reader's lists.
   */
  private load(): void {
    this.isLoading = true;

    this._readingListService
      .getMyLists()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: lists => {
          this.lists = lists;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'Your reading lists could not be loaded.';
          this.isLoading = false;
        },
      });
  }
}
