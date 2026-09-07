import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of, switchMap, take } from 'rxjs';

import { CustomTrackingService } from 'src/app/dashboard/settings/custom-tracking/custom-tracking.service';
import {
  CustomTrackingFixedTarget,
  CustomTrackingValuesComponent,
} from 'src/app/dashboard/settings/custom-tracking/values/custom-tracking-values.component';
import {
  CustomTrackingConfiguration,
  CustomTrackingPolicyStatus,
  CustomTrackingRecord,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { displayFromRecord } from 'src/app/shared/custom-tracking/custom-tracking-display.builder';
import { CustomTrackingDisplaySection } from 'src/app/shared/custom-tracking/custom-tracking-display.models';
import { CustomTrackingDisplayComponent } from 'src/app/shared/custom-tracking/custom-tracking-display/custom-tracking-display.component';
import {
  HasUnsavedChanges,
  confirmDiscard,
} from 'src/app/shared/guards/unsaved-changes.guard';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

/**
 * The owner's own tracked information, on their own account or captain page.
 *
 * One component for both pages, and it fetches for itself, so that neither
 * page has to carry a copy of the same few lines. The public pages have no
 * equivalent because their data arrives with the page itself: the server sends
 * only what a visitor is permitted, and asking for it separately would be a
 * second request whose gates would have to agree with the first.
 *
 * What is recorded is shown here and may be changed here. The editor is the
 * one Settings uses, handed the record this page is already about instead of a
 * chooser — so the fields, the required check and the whole-record save are
 * the same wherever somebody fills a record in, which is what stops two ways
 * of changing a value from behaving like two different features.
 *
 * Editing is offered only where the server would accept it: the feature has to
 * be on, values not paused, and the content agreement accepted. Acceptance is
 * the only one of those a user can do anything about, so it is the only one
 * this says anything about — the rest leave the page reading exactly as it did
 * before, which is what an addition to a page should do when it is off.
 *
 * Nothing is reported when the fetch fails, and nothing is drawn. Custom
 * tracking is an addition to a page that is complete without it — the feature
 * may be switched off entirely, in which case the request answers 404 by
 * design — and an error bar about it would be alarming out of all proportion
 * to what is missing.
 */
@Component({
  selector: 'app-custom-tracking-owner-panel',
  templateUrl: './custom-tracking-owner-panel.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CustomTrackingDisplayComponent,
    CustomTrackingValuesComponent,
  ],
})
export class CustomTrackingOwnerPanelComponent
  implements OnChanges, HasUnsavedChanges
{
  /** Whether an account or a captain is being shown. */
  @Input({ required: true }) scope!: CustomTrackingTargetScope;

  /** The record being shown, or null before the page knows which. */
  @Input() targetId: string | null = null;

  /** The editor, while it is open. */
  @ViewChild(CustomTrackingValuesComponent)
  values?: CustomTrackingValuesComponent;

  /** What is left to draw. */
  sections: CustomTrackingDisplaySection[] = [];

  /** What the server says about the feature, once it has arrived. */
  configuration: CustomTrackingConfiguration | null = null;

  /** Whether the editor is open in place of what is recorded. */
  isEditing = false;

  /** Where the content agreement is accepted, and the hierarchy is built. */
  readonly customTrackingLink = `/${APP_ROUTES.STO_DASHBOARD_CUSTOM_TRACKING}`;

  /**
   * Whether anything at all is defined to record against this kind of page.
   *
   * Asked of the definitions rather than of what reached the screen, because
   * the owner's empty rule can hide every field of a record that has fields —
   * and somebody whose fields are all unanswered is precisely the person who
   * needs the control that lets them answer one.
   */
  private _hasDefinitions = false;

  /** Where the user stands with the content agreement, once it has arrived. */
  private _status: CustomTrackingPolicyStatus | null = null;

  private readonly _customTracking = inject(CustomTrackingService);
  private readonly _dialog = inject(MatDialog);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the record whenever the page settles on which one it is showing.
   *
   * Check availability before requesting protected records. The backend
   * deliberately returns 404 when reading custom tracking is disabled.
   * Render only after the record and acceptance status have both arrived.
   */
  ngOnChanges(): void {
    this.sections = [];
    this.isEditing = false;
    this._hasDefinitions = false;
    this.configuration = null;
    this._status = null;

    if (this.targetId === null) {
      return;
    }

    const scope = this.scope;
    const targetId = this.targetId;
    this._customTracking
      .getConfiguration()
      .pipe(
        take(1),
        switchMap(configuration => {
          if (
            !configuration.features.isEnabled ||
            !configuration.features.publicReadEnabled
          ) {
            return of(null);
          }

          return forkJoin({
            record: this._customTracking
              .getRecord(scope, targetId)
              .pipe(take(1)),
            configuration: of(configuration),
            status: this._customTracking.getPolicyStatus().pipe(take(1)),
          });
        }),
        catchError(() => of(null)),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe(loaded => {
        if (loaded === null) {
          return;
        }

        this.configuration = loaded.configuration;
        this._status = loaded.status;
        this.accept(loaded.record);
      });
  }

  /**
   * Whether the block has anything to show or to offer.
   *
   * @returns True where something is drawn.
   */
  get isShown(): boolean {
    return this.sections.length > 0 || this.canEdit || this.needsAgreement;
  }

  /**
   * Whether the editor may be opened.
   *
   * @returns True where the server would accept a change.
   */
  get canEdit(): boolean {
    return (
      this._hasDefinitions &&
      this.configuration?.features.valueEditingEnabled === true &&
      this._status !== null &&
      !this._status.acceptanceRequired
    );
  }

  /**
   * Whether the agreement is what stands between the user and editing here.
   *
   * @returns True while acceptance is outstanding on a page with fields.
   */
  get needsAgreement(): boolean {
    return this._hasDefinitions && this._status?.acceptanceRequired === true;
  }

  /**
   * The record for the editor to fill in.
   *
   * @returns The scope and record this page is about.
   */
  get fixedTarget(): CustomTrackingFixedTarget {
    return { scope: this.scope, targetId: this.targetId ?? '' };
  }

  /** Opens the editor in place of what is recorded. */
  startEditing(): void {
    this.isEditing = true;
  }

  /**
   * Closes the editor, asking first if that would throw work away.
   */
  stopEditing(): void {
    if (!this.hasUnsavedChanges()) {
      this.close();

      return;
    }

    confirmDiscard(this._dialog)
      .pipe(take(1), observeInZone(this._ngZone, this._cdr))
      .subscribe(discard => {
        if (discard) {
          this.close();
        }
      });
  }

  /**
   * Whether leaving now would lose something.
   *
   * Asked by the route guard through the page hosting this block. The editor
   * is only there once it has been opened, so a page nobody has edited never
   * stands in the way of leaving.
   *
   * @returns True while the editor holds changes nobody has saved.
   */
  hasUnsavedChanges(): boolean {
    return this.isEditing && this.values?.hasUnsavedChanges() === true;
  }

  /**
   * Shuts the editor and reads back what is now stored.
   *
   * Read back rather than kept, because a save is not the only thing that may
   * have happened: a picture lands the moment it is uploaded, and a record
   * closed without saving has to come back showing what is stored rather than
   * what somebody typed and abandoned.
   */
  private close(): void {
    this.isEditing = false;
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
        if (record !== null) {
          this.accept(record);
        }
      });
  }

  /**
   * Takes what the server described and works out what to draw from it.
   *
   * @param record - The record as the owner is sent it.
   */
  private accept(record: CustomTrackingRecord): void {
    this.sections = displayFromRecord(record);
    this._hasDefinitions = record.sections.some(section =>
      section.tabs.some(tab => tab.fields.length > 0),
    );
  }
}
