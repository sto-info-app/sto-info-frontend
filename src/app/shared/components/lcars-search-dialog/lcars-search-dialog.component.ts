import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { PrivacyModeService } from 'src/app/dashboard/services/privacy-mode.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { LoadingBarComponent } from '../loading-bar/loading-bar.component';

/**
 * A page of search results passed back by the caller's search function.
 */
export interface SearchPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * One fact shown under a result: what it is, and what it says.
 *
 * Short by design. These sit on a row beneath the name, and are there to tell
 * two lookalike results apart at a glance rather than to describe either.
 */
export interface SearchResultFact {
  /** What the fact is, e.g. `Role`. */
  label: string;
  /** What it says, already written the way it should read. */
  value: string;
}

/**
 * Configuration data injected into the dialog.
 */
export interface LcarsSearchDialogData<T> {
  /** Heading shown at the top of the dialog. */
  title: string;
  /** Called whenever the user types or pages. Returns the matching results. */
  searchFn: (term: string, page: number) => Observable<SearchPage<T>>;
  /** Derives the primary label for a result row. */
  resultLabel: (item: T) => string;
  /** Derives an optional secondary line for a result row. */
  resultSublabel?: (item: T) => string | null;
  /**
   * Derives the short facts shown under a result. The caller writes each value
   * the way it should read, dates included: what makes two results tell apart
   * differs from one search to the next, and only the caller knows.
   */
  resultFacts?: (item: T) => SearchResultFact[];
  /** Results per page. Should be 5. */
  pageSize: number;
  /**
   * Whether what somebody types here is personal data — an email address
   * rather than the title of a Story. Privacy Mode blurs the search box when
   * it is, the same way it blurs the member search on the admin screens.
   */
  privateTerm?: boolean;
  /**
   * Whether a result's second line is personal data. Privacy Mode blurs it
   * when it is.
   */
  privateSublabel?: boolean;
}

/**
 * A paginated, LCARS-styled search-and-select dialog.
 *
 * Callers supply a `searchFn` that wraps whatever backend endpoint is
 * appropriate. The dialog calls it with the current term and page number and
 * renders the results as a list of selectable rows. Selecting a row closes
 * the dialog with that item; Cancel closes it with undefined.
 */
@Component({
  selector: 'app-lcars-search-dialog',
  templateUrl: './lcars-search-dialog.component.html',
  styleUrls: ['./lcars-search-dialog.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    LoadingBarComponent,
  ],
})
export class LcarsSearchDialogComponent<T = unknown> implements OnInit {
  readonly data: LcarsSearchDialogData<T> = inject(MAT_DIALOG_DATA);

  /**
   * Whether personal data on this dialog is blurred. Read by the template, so
   * it is public.
   *
   * The setting is loaded by the screen that opened the dialog. Unread, the
   * service reports privacy on, so a dialog opened from a screen that never
   * loaded it hides addresses rather than showing them.
   */
  readonly privacyMode = inject(PrivacyModeService);
  private readonly _dialogRef = inject(
    MatDialogRef<LcarsSearchDialogComponent<T>>,
  );
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /** Exposes Math for use in the template. */
  readonly Math = Math;

  /** The search input control. */
  readonly searchControl = new FormControl('', { nonNullable: true });

  /** Whether a search is in flight. */
  isSearching = false;

  /** The current page of results, or null before the first search. */
  results: SearchPage<T> | null = null;

  /** The current page number (1-based). */
  currentPage = 1;

  /** The term that produced the current results (kept to re-page). */
  private _lastTerm = '';

  /**
   * Subscribes to the search input and triggers a search on each change.
   */
  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe(term => {
        this.currentPage = 1;
        this._search(term);
      });
  }

  /**
   * Whether there is a previous page.
   *
   * @returns True when the current page is after the first.
   */
  get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  /**
   * Whether there is a next page.
   *
   * @returns True when there are more items beyond the current page.
   */
  get hasNextPage(): boolean {
    if (!this.results) {
      return false;
    }
    return this.currentPage * this.data.pageSize < this.results.total;
  }

  /**
   * Navigates to the previous page.
   */
  previousPage(): void {
    if (!this.hasPreviousPage) {
      return;
    }
    this.currentPage -= 1;
    this._search(this._lastTerm);
  }

  /**
   * Navigates to the next page.
   */
  nextPage(): void {
    if (!this.hasNextPage) {
      return;
    }
    this.currentPage += 1;
    this._search(this._lastTerm);
  }

  /**
   * The primary label to display for a result row.
   *
   * @param item - The result item.
   * @returns The label string.
   */
  labelFor(item: T): string {
    return this.data.resultLabel(item);
  }

  /**
   * The secondary label to display for a result row, if any.
   *
   * @param item - The result item.
   * @returns The sublabel string, or null.
   */
  sublabelFor(item: T): string | null {
    return this.data.resultSublabel ? this.data.resultSublabel(item) : null;
  }

  /**
   * The short facts to display under a result row.
   *
   * @param item - The result item.
   * @returns The facts, empty when the caller supplied none.
   */
  factsFor(item: T): SearchResultFact[] {
    return this.data.resultFacts ? this.data.resultFacts(item) : [];
  }

  /**
   * Whether a result's second line should be hidden from view.
   *
   * @returns True when the line is personal data and Privacy Mode is on.
   */
  get isSublabelBlurred(): boolean {
    return (this.data.privateSublabel ?? false) && this.privacyMode.isEnabled();
  }

  /**
   * Whether what the searcher types should be hidden from view.
   *
   * @returns True when the term is personal data and Privacy Mode is on.
   */
  get isTermBlurred(): boolean {
    return (this.data.privateTerm ?? false) && this.privacyMode.isEnabled();
  }

  /**
   * Closes the dialog with the selected item.
   *
   * @param item - The item the user chose.
   */
  select(item: T): void {
    this._dialogRef.close(item);
  }

  /**
   * Closes the dialog without a selection.
   */
  cancel(): void {
    this._dialogRef.close(undefined);
  }

  /**
   * Fires the caller's search function and stores the result.
   *
   * @param term - What the user typed.
   */
  private _search(term: string): void {
    if (term.trim().length < 2) {
      this.results = null;
      return;
    }

    this._lastTerm = term;
    this.isSearching = true;

    this.data
      .searchFn(term, this.currentPage)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: page => {
          this.results = page;
          this.isSearching = false;
        },
        error: () => {
          this.results = null;
          this.isSearching = false;
        },
      });
  }
}
