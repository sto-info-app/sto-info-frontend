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
import { RouterModule } from '@angular/router';
import {
  LibraryEntry,
  ReaderStoryStatus,
} from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ProgressService } from '../../progress.service';
import { READER_STORY_STATUS_LABELS } from '../../storytime.constants';

/**
 * The Stories a reader has started.
 *
 * Filtered by status rather than split across pages, so a reader can see
 * everything they are part-way through in one place.
 *
 * Each Story arrives with its progress, so a library of a hundred Stories is
 * still one request. An entry whose Story has since been made private or
 * removed keeps its place, showing what the reader read rather than quietly
 * disappearing from their own history.
 */
@Component({
  selector: 'app-reader-library',
  templateUrl: './reader-library.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ReaderLibraryComponent implements OnInit {
  /** The reader's Stories, most recently read first. */
  entries: LibraryEntry[] = [];

  /** The status being shown, or null for everything. */
  activeStatus: ReaderStoryStatus | null = null;

  /** Whether the library is still loading. */
  isLoading = true;

  /** A message to show when the library could not be loaded. */
  errorMessage = '';

  /** The statuses offered as filters. */
  readonly statuses = Object.values(ReaderStoryStatus);

  /** Status labels, so a raw enum value is never shown. */
  readonly statusLabels = READER_STORY_STATUS_LABELS;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _progressService = inject(ProgressService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the whole library.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Shows only the Stories with a given status.
   *
   * @param status - The status to show, or null for everything.
   */
  filterBy(status: ReaderStoryStatus | null): void {
    this.activeStatus = status;
    this.load();
  }

  /**
   * Loads the library for the active filter.
   */
  private load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this._progressService
      .getLibrary(this.activeStatus ?? undefined)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: entries => {
          this.entries = entries;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage =
            'Your library could not be loaded. Please try again shortly.';
          this.isLoading = false;
        },
      });
  }
}
