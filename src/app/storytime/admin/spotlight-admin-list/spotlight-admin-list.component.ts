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
import { finalize } from 'rxjs';
import { ManagedSpotlight } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { StorytimeActionRunner } from '../../shared/storytime-action.runner';
import { SpotlightService } from '../../spotlight.service';

/**
 * Every Spotlight entry, as the editors who schedule them see it.
 *
 * Entries are shown whatever state they are in, including ones pointing at
 * work that has since been taken down — that is precisely the entry an editor
 * needs to find, and hiding it would leave them wondering why the Spotlight
 * looks emptier than the list says.
 */
@Component({
  selector: 'app-spotlight-admin-list',
  templateUrl: './spotlight-admin-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class SpotlightAdminListComponent implements OnInit {
  /** The entries, most recently scheduled first. */
  entries: ManagedSpotlight[] = [];

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _spotlightService = inject(SpotlightService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _actions = new StorytimeActionRunner(this, () =>
    this.load(),
  );

  /**
   * Loads the entries.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Describes what an entry is doing right now.
   *
   * Published and showing are different things, and an editor looking at a
   * list of dates should not have to work out which is which.
   *
   * @param entry - The entry.
   * @param now - The moment to judge against.
   * @returns The state in plain words.
   */
  stateOf(entry: ManagedSpotlight, now: Date = new Date()): string {
    if (!entry.isPublished) {
      return 'Draft';
    }

    if (new Date(entry.startsAt) > now) {
      return 'Scheduled';
    }

    return entry.endsAt && new Date(entry.endsAt) <= now
      ? 'Finished'
      : 'Showing';
  }

  /**
   * What an entry features.
   *
   * @param entry - The entry.
   * @returns The title of the featured work, or a note that it has gone.
   */
  titleFor(entry: ManagedSpotlight): string {
    return (
      entry.story?.title ??
      entry.arc?.title ??
      'Work that can no longer be shown'
    );
  }

  /**
   * Publishes an entry.
   *
   * @param entry - The entry.
   */
  publish(entry: ManagedSpotlight): void {
    this._actions.run(this._spotlightService.publish(entry.id));
  }

  /**
   * Withdraws an entry.
   *
   * @param entry - The entry.
   */
  unpublish(entry: ManagedSpotlight): void {
    this._actions.run(this._spotlightService.unpublish(entry.id));
  }

  /**
   * Deletes an entry.
   *
   * @param entry - The entry.
   */
  remove(entry: ManagedSpotlight): void {
    this._actions.run(this._spotlightService.remove(entry.id));
  }

  /**
   * Loads the entries.
   */
  private load(): void {
    this.isLoading = true;

    this._spotlightService
      .getAll()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: entries => {
          this.entries = entries;
        },
        error: () => {
          this.errorMessage =
            'The Spotlight entries could not be loaded. Please try again shortly.';
        },
      });
  }
}
