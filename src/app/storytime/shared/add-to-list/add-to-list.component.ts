import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ReadingList,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { ReadingListService } from '../../reading-list.service';

/**
 * Putting a Story or an Arc on one of the reader's lists.
 *
 * Lists that already hold it are marked, so nobody discovers that by adding it
 * a second time. Nothing is shown to a signed-out reader, because a list only
 * exists for somebody with an account.
 */
@Component({
  selector: 'app-add-to-list',
  templateUrl: './add-to-list.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class AddToListComponent implements OnInit {
  /** Whether it is a Story or an Arc. */
  @Input({ required: true }) targetType!: StorytimeTargetType;

  /** The thing being listed. */
  @Input({ required: true }) targetId!: string;

  /** The reader's lists. */
  lists: ReadingList[] = [];

  /** The lists that already hold it. */
  holding = new Set<string>();

  /** Whether the control is open. */
  isOpen = false;

  /** Whether something is in flight. */
  isSaving = false;

  /** A message to show when something failed. */
  errorMessage = '';

  /** What the reader is told once something is added. */
  statusMessage = '';

  private readonly _readingListService = inject(ReadingListService);
  private readonly _authService = inject(AuthService);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Whether there is anything to show at all.
   *
   * @returns True when somebody is signed in.
   */
  get isVisible(): boolean {
    return this._authService.isLoggedIn();
  }

  /**
   * Reads the reader's lists and which of them already hold this.
   */
  ngOnInit(): void {
    if (!this.isVisible) {
      return;
    }

    this._readingListService
      .getMyLists()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: lists => (this.lists = lists),
        error: () => (this.lists = []),
      });

    this._readingListService
      .getListsHolding(this.targetType, this.targetId)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: listIds => (this.holding = new Set(listIds)),
        error: () => (this.holding = new Set()),
      });
  }

  /**
   * Opens or closes the control.
   */
  toggle(): void {
    this.isOpen = !this.isOpen;
    this.statusMessage = '';
  }

  /**
   * Whether a list already holds this.
   *
   * @param list - The list.
   * @returns True when it is already on it.
   */
  isHolding(list: ReadingList): boolean {
    return this.holding.has(list.id);
  }

  /**
   * Puts this on a list.
   *
   * @param list - The list.
   */
  add(list: ReadingList): void {
    if (this.isSaving || this.isHolding(list)) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    this._readingListService
      .addItem(list.id, this.targetType, this.targetId)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this.holding.add(list.id);
          this.statusMessage = `Added to ${list.name}.`;
          this.isSaving = false;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.error?.message ?? 'That could not be added. Try again.';
          this.isSaving = false;
        },
      });
  }
}
