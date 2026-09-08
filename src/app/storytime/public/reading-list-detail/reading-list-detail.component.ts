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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import {
  ReadingListDetail,
  ReadingListItem,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { ReadingListService } from '../../reading-list.service';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

/**
 * One reading list, and what is on it.
 *
 * Serves both a reader's own list and somebody else's public one: the route
 * decides which, and the controls only appear on your own. The two are one
 * page because they show the same thing, and splitting them would mean two
 * places to fix when the list changes shape.
 *
 * A list can be shorter than its owner left it. Anything since made private or
 * taken down is left out by the server rather than shown as a dead link.
 */
@Component({
  selector: 'app-reading-list-detail',
  templateUrl: './reading-list-detail.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
})
export class ReadingListDetailComponent implements OnInit {
  /** The list and what is on it. */
  list: ReadingListDetail | null = null;

  /** Whether the list is still loading. */
  isLoading = true;

  /** Whether something is in flight. */
  isSaving = false;

  /** Whether the list is the reader's own, and so may be changed. */
  isMine = false;

  /** A message to show when something failed. */
  errorMessage = '';

  /** The kinds of thing a list holds, so the template need not spell them. */
  readonly targetTypes = StorytimeTargetType;

  private readonly _readingListService = inject(ReadingListService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads whichever list the route names.
   */
  ngOnInit(): void {
    const listId = this.param('listId');
    const userId = this.param('userId');
    const slug = this.param('slug');

    // The route decides which list this is. A list identifier only appears on
    // your own, which is also what decides whether the controls are offered.
    this.isMine = listId !== '';

    this.read(
      this.isMine
        ? this._readingListService.getList(listId)
        : this._readingListService.getPublicList(userId, slug),
    );
  }

  /**
   * Where one item leads.
   *
   * @param item - The item.
   * @returns The route to follow.
   */
  linkFor(item: ReadingListItem): string[] {
    return item.targetType === StorytimeTargetType.STORY
      ? ['/storytime', 'stories', item.slug]
      : ['/storytime', 'arcs', item.slug];
  }

  /**
   * Publishes the list, or takes it private again.
   */
  toggleVisibility(): void {
    if (!this.list || this.isSaving) {
      return;
    }

    this.change(
      this._readingListService.updateList(this.list.id, {
        isPublic: !this.list.isPublic,
      }),
      this.list.items,
    );
  }

  /**
   * Takes something off the list.
   *
   * @param item - The item.
   */
  removeItem(item: ReadingListItem): void {
    if (!this.list || this.isSaving) {
      return;
    }

    this.replace(this._readingListService.removeItem(this.list.id, item.id));
  }

  /**
   * Moves one item up or down the order.
   *
   * The whole order is sent rather than the one move, because that is what the
   * API takes and a half-applied order would be worse than none.
   *
   * @param item - The item to move.
   * @param offset - How far to move it, negative being earlier.
   */
  move(item: ReadingListItem, offset: number): void {
    if (!this.list || this.isSaving) {
      return;
    }

    const itemIds = this.list.items.map(existing => existing.id);
    const from = itemIds.indexOf(item.id);
    const to = from + offset;

    if (to < 0 || to >= itemIds.length) {
      return;
    }

    itemIds.splice(to, 0, ...itemIds.splice(from, 1));

    this.replace(this._readingListService.reorder(this.list.id, itemIds));
  }

  /**
   * Reads a list into the page.
   *
   * @param source - Where the list comes from.
   */
  private read(source: Observable<ReadingListDetail>): void {
    this.isLoading = true;

    source
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: list => {
          this.list = list;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'That reading list could not be loaded.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Runs a change that answers with the whole list.
   *
   * @param change - The change.
   */
  private replace(change: Observable<ReadingListDetail>): void {
    this.isSaving = true;
    this.errorMessage = '';

    change
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: list => {
          this.list = list;
          this.isSaving = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'That change could not be saved.';
          this.isSaving = false;
        },
      });
  }

  /**
   * Reads one route parameter.
   *
   * @param name - The parameter.
   * @returns Its value, or an empty string when this route does not carry it.
   */
  private param(name: string): string {
    return this._route.snapshot.paramMap.get(name) ?? '';
  }

  /**
   * Runs a change that answers with the list but not its items.
   *
   * @param change - The change.
   * @param items - What is on the list, which the response does not carry.
   */
  private change(
    change: Observable<Omit<ReadingListDetail, 'items'>>,
    items: ReadingListItem[],
  ): void {
    this.isSaving = true;
    this.errorMessage = '';

    change
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: list => {
          // The items are unchanged and were not sent back, so they are carried
          // over rather than emptied by a response that never had them.
          this.list = { ...list, items };
          this.isSaving = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'That change could not be saved.';
          this.isSaving = false;
        },
      });
  }
}
