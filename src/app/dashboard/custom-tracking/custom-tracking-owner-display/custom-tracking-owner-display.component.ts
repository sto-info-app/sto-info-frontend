import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnChanges,
  inject,
} from '@angular/core';
import { catchError, of, take } from 'rxjs';

import { CustomTrackingService } from 'src/app/dashboard/settings/custom-tracking/custom-tracking.service';
import { CustomTrackingTargetScope } from 'src/app/models/custom-tracking.models';
import { displayFromRecord } from 'src/app/shared/custom-tracking/custom-tracking-display.builder';
import { CustomTrackingDisplaySection } from 'src/app/shared/custom-tracking/custom-tracking-display.models';
import { CustomTrackingDisplayComponent } from 'src/app/shared/custom-tracking/custom-tracking-display/custom-tracking-display.component';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

/**
 * The owner's own tracked information, on their own account or captain page.
 *
 * One component for both pages, and it fetches for itself, so that neither
 * page has to carry a copy of the same four lines. The public pages have no
 * equivalent because their data arrives with the page itself: the server sends
 * only what a visitor is permitted, and asking for it separately would be a
 * second request whose gates would have to agree with the first.
 *
 * Nothing is reported when the fetch fails, and nothing is drawn. Custom
 * tracking is an addition to a page that is complete without it — the feature
 * may be switched off entirely, in which case the request answers 404 by
 * design — and an error bar about it would be alarming out of all proportion
 * to what is missing.
 */
@Component({
  selector: 'app-custom-tracking-owner-display',
  templateUrl: './custom-tracking-owner-display.component.html',
  standalone: true,
  imports: [CommonModule, CustomTrackingDisplayComponent],
})
export class CustomTrackingOwnerDisplayComponent implements OnChanges {
  /** Whether an account or a captain is being shown. */
  @Input({ required: true }) scope!: CustomTrackingTargetScope;

  /** The record being shown, or null before the page knows which. */
  @Input() targetId: string | null = null;

  /** What is left to draw. */
  sections: CustomTrackingDisplaySection[] = [];

  private readonly _customTracking = inject(CustomTrackingService);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the record whenever the page settles on which one it is showing.
   */
  ngOnChanges(): void {
    this.sections = [];

    if (this.targetId === null) {
      return;
    }

    this._customTracking
      .getRecord(this.scope, this.targetId)
      .pipe(
        take(1),
        catchError(() => of(null)),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(record => {
        this.sections = record === null ? [] : displayFromRecord(record);
      });
  }
}
