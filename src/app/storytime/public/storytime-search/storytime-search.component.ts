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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import {
  SearchHit,
  SearchResults,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { SearchService } from '../../search.service';
import { SEARCHABLE_KINDS } from '../../storytime.constants';

/**
 * Searching Storytime.
 *
 * The query lives in the URL rather than only in the form, so a search can be
 * shared, bookmarked and returned to with the back button — all of which a
 * reader will expect of something that looks like a search engine.
 */
/**
 * The panel each kind of result wears, keyed by what was found.
 *
 * Held as a map rather than a switch because it is a lookup and nothing else,
 * and because the panel colours it names are defined once in the stylesheet.
 */
const SEARCH_PANEL_CLASSES: Record<string, string> = {
  [StorytimeTargetType.STORY]: 'storytime-panel-card--story',
  [StorytimeTargetType.CHAPTER]: 'storytime-panel-card--chapter',
  [StorytimeTargetType.CHARACTER]: 'storytime-panel-card--character',
  [StorytimeTargetType.ARC]: 'storytime-panel-card--arc',
};

@Component({
  selector: 'app-storytime-search',
  templateUrl: './storytime-search.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class StorytimeSearchComponent implements OnInit {
  /** What the last search found. */
  results: SearchResults | null = null;

  /** Whether a search is in flight. */
  isSearching = false;

  /** A message to show when something failed. */
  errorMessage = '';

  /** The kinds a reader may filter to. */
  readonly kinds = SEARCHABLE_KINDS;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _searchService = inject(SearchService);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /** The search box, and what it is limited to. */
  readonly form = this._formBuilder.nonNullable.group({
    q: [''],
    type: [''],
  });

  /**
   * Searches for whatever the address asks for, and again whenever it changes.
   */
  ngOnInit(): void {
    this._route.queryParamMap
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(params => {
        const term = params.get('q') ?? '';
        const type = params.get('type') ?? '';

        this.form.patchValue({ q: term, type }, { emitEvent: false });
        this.runSearch(term, type);
      });
  }

  /**
   * Puts the search in the address, which is what actually runs it.
   */
  submit(): void {
    const value = this.form.getRawValue();

    void this._router.navigate([], {
      relativeTo: this._route,
      queryParams: {
        q: value.q.trim() || null,
        type: value.type || null,
      },
    });
  }

  /**
   * Limits the search to one kind, or removes the limit.
   *
   * @param type - The kind to show, or an empty string for all of them.
   */
  filterTo(type: string): void {
    this.form.patchValue({ type });
    this.submit();
  }

  /**
   * Where a result sends a reader.
   *
   * @param hit - The result.
   * @returns The router link for it.
   */
  linkFor(hit: SearchHit): unknown[] {
    const storytime = ['/', this.appRoutes.STORYTIME];

    switch (hit.targetType) {
      case StorytimeTargetType.CHAPTER:
        return [...storytime, 'stories', hit.storySlug, 'chapters', hit.slug];
      case StorytimeTargetType.CHARACTER:
        return [...storytime, 'stories', hit.storySlug, 'characters', hit.slug];
      case StorytimeTargetType.ARC:
        return [...storytime, 'arcs', hit.slug];
      default:
        return [...storytime, 'stories', hit.slug];
    }
  }

  /**
   * Which panel a result wears.
   *
   * A search is the one list holding every kind of thing at once, so the
   * colour is the only thing telling a reader whether they are looking at a
   * Story or the Character in it before they read the badge.
   *
   * @param hit - The result.
   * @returns The panel modifier class for its kind.
   */
  panelClassFor(hit: SearchHit): string {
    return (
      SEARCH_PANEL_CLASSES[hit.targetType] ??
      SEARCH_PANEL_CLASSES[StorytimeTargetType.STORY]
    );
  }

  /**
   * How many results of one kind the last search found.
   *
   * @param type - The kind, or an empty string for all of them.
   * @returns The count.
   */
  countFor(type: string): number {
    if (!this.results) {
      return 0;
    }

    return type ? (this.results.countsByType[type] ?? 0) : this.results.total;
  }

  /**
   * Runs a search, if there is anything to search for.
   *
   * @param term - What the reader typed.
   * @param type - The kind to limit to, if any.
   */
  private runSearch(term: string, type: string): void {
    if (term.trim().length < 2) {
      // Two characters is where the server starts answering. Asking below that
      // would only produce a refusal a reader has done nothing to deserve.
      this.results = null;
      this.errorMessage = '';
      return;
    }

    this.isSearching = true;
    this.errorMessage = '';

    this._searchService
      .search(term, {
        types: type ? [type as StorytimeTargetType] : undefined,
      })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isSearching = false;
        }),
      )
      .subscribe({
        next: results => {
          this.results = results;
        },
        error: () => {
          this.results = null;
          this.errorMessage =
            'The search could not be run. Please try again shortly.';
        },
      });
  }
}
