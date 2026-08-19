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
import { Observable, finalize } from 'rxjs';
import { ArcStatus, ManagedArc } from 'src/app/models/storytime.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';
import { ArcService } from '../../arc.service';
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
    this.runAction(this._arcService.publishArc(arc.id));
  }

  /**
   * Withdraws an Arc and refreshes the list.
   *
   * @param arc - The Arc to withdraw.
   */
  unpublish(arc: ManagedArc): void {
    this.runAction(this._arcService.unpublishArc(arc.id));
  }

  /**
   * Runs an action, then reloads so the list reflects what the server did.
   *
   * @param action - The action to run.
   */
  private runAction(action: Observable<unknown>): void {
    this.isLoading = true;
    this.errorMessage = '';

    action
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: () => this.load(),
        error: (error: HttpErrorResponse) => {
          // The server explains why an Arc cannot be published — most often
          // that nothing has agreed to be in it — and repeating that verbatim
          // beats a generic apology.
          this.errorMessage =
            (error.error as { message?: string } | undefined)?.message ??
            'That change could not be saved. Please try again shortly.';
          this.isLoading = false;
        },
      });
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
