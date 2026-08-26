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
import { ArcStatus, ManagedArc } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ArcService } from '../../arc.service';
import { StorytimeActionRunner } from '../../shared/storytime-action.runner';
import {
  PUBLICATION_STATUS_LABELS,
  VISIBILITY_ICONS,
  VISIBILITY_LABELS,
} from '../../storytime.constants';

/**
 * The Arcs the signed-in member curates.
 *
 * Anybody may curate an Arc, so this page is reachable by any member rather
 * than only by writers: assembling a reading order across other people's work
 * is a contribution in its own right.
 */
@Component({
  selector: 'app-arc-dashboard',
  templateUrl: './arc-dashboard.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class ArcDashboardComponent implements OnInit {
  /** The Arcs, most recently changed first. */
  arcs: ManagedArc[] = [];

  /** Whether the list is still loading. */
  isLoading = true;

  /** A message to show when something failed. */
  errorMessage = '';

  /** Status labels, so a raw enum value is never shown. */
  readonly statusLabels = PUBLICATION_STATUS_LABELS;

  /** Visibility labels. */
  readonly visibilityLabels = VISIBILITY_LABELS;

  /** The mark standing for each visibility on an Arc's title bar. */
  readonly visibilityIcons = VISIBILITY_ICONS;

  /** Route constants. */
  readonly appRoutes = APP_ROUTES;

  private readonly _arcService = inject(ArcService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _actions = new StorytimeActionRunner(this, () =>
    this.load(),
  );

  /**
   * Loads the caller's Arcs.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Whether publishing is a sensible next action for an Arc.
   *
   * @param arc - The Arc to test.
   * @returns True when it is not currently published.
   */
  canPublish(arc: ManagedArc): boolean {
    return arc.status !== ArcStatus.PUBLISHED;
  }

  /**
   * Publishes an Arc and refreshes the list.
   *
   * @param arc - The Arc to publish.
   */
  publish(arc: ManagedArc): void {
    this._actions.run(this._arcService.publishArc(arc.id));
  }

  /**
   * Withdraws an Arc and refreshes the list.
   *
   * @param arc - The Arc to withdraw.
   */
  unpublish(arc: ManagedArc): void {
    this._actions.run(this._arcService.unpublishArc(arc.id));
  }

  /**
   * Loads the Arcs.
   */
  private load(): void {
    this.isLoading = true;

    this._arcService
      .getMyArcs()
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: arcs => {
          this.arcs = arcs;
        },
        error: () => {
          this.errorMessage =
            'Your Arcs could not be loaded. Please try again shortly.';
        },
      });
  }
}
