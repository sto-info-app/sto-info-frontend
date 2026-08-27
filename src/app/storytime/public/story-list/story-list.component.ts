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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { Story } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { STORYTIME_COPY } from '../../storytime.constants';
import { StoryService } from '../../story.service';
import { StoryCardComponent } from '../story-card/story-card.component';

/**
 * The public list of published Stories, newest first.
 */
@Component({
  selector: 'app-story-list',
  templateUrl: './story-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    StoryCardComponent,
  ],
})
export class StoryListComponent implements OnInit {
  /** The Stories on the current page. */
  stories: Story[] = [];

  /** Whether the first load is still in flight. */
  isLoading = true;

  /** A message to show when loading failed. */
  errorMessage = '';

  /** User-facing copy. */
  readonly copy = STORYTIME_COPY;

  private readonly _storyService = inject(StoryService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the first page of published Stories.
   */
  ngOnInit(): void {
    this._storyService
      .getStories()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: page => {
          this.stories = page.items;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage =
            error.status === 0
              ? 'Could not reach the archive. Check your connection and try again.'
              : 'The Story archive could not be read. Please try again shortly.';
        },
      });
  }
}
