import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { forkJoin, take } from 'rxjs';

import {
  CustomTrackingConfiguration,
  CustomTrackingPolicyStatus,
} from 'src/app/models/custom-tracking.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { nextTabIndex } from 'src/app/shared/a11y/roving-tabs.utility';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { HasUnsavedChanges } from 'src/app/shared/guards/unsaved-changes.guard';
import { observeInZone } from 'src/app/shared/rxjs/observe-in-zone.operator';

import { CustomTrackingService } from './custom-tracking.service';
import { CustomTrackingAgreementComponent } from './custom-tracking-agreement/custom-tracking-agreement.component';
import { CustomTrackingDefinitionsComponent } from './definitions/custom-tracking-definitions.component';
import { CustomTrackingValuesComponent } from './values/custom-tracking-values.component';

/** Which panel of the page is showing. */
export type CustomTrackingPanel = 'definitions' | 'values' | 'about';

/**
 * Custom Tracking, as Settings presents it.
 *
 * Everything about the feature is managed from here. Account and character
 * detail pages display what has been recorded and offer nothing to edit, so
 * this page is the only place any of it can be changed — which is what keeps
 * "where do I change this?" from having two answers.
 *
 * Nothing may be created until the content agreement has been accepted, and a
 * material change to the wording pauses creating and editing until it is
 * accepted again. Reading is never gated: somebody asked again keeps full
 * sight of everything they have already recorded, and the page says so rather
 * than letting a wording change look like data loss.
 */
@Component({
  selector: 'app-custom-tracking-settings',
  templateUrl: './custom-tracking-settings.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    CustomTrackingAgreementComponent,
    CustomTrackingDefinitionsComponent,
    CustomTrackingValuesComponent,
  ],
})
export class CustomTrackingSettingsComponent
  implements OnInit, HasUnsavedChanges
{
  /** The value editor, while it is on the screen. */
  @ViewChild(CustomTrackingValuesComponent)
  values?: CustomTrackingValuesComponent;

  /** Where to go back to. */
  readonly settingsLink = `/${APP_ROUTES.STO_DASHBOARD_SETTINGS}`;

  /** The Terms of Use, which apply to everything recorded here. */
  readonly termsLink = `/${APP_ROUTES.TERMS_OF_USE}`;

  /** What the server published about the feature, once it has arrived. */
  configuration: CustomTrackingConfiguration | null = null;

  /** Where the user stands with the content agreement. */
  status: CustomTrackingPolicyStatus | null = null;

  /** Which panel is showing. */
  panel: CustomTrackingPanel = 'definitions';

  /** The panels, in the order the arrow keys move through them. */
  readonly panels: CustomTrackingPanel[] = ['definitions', 'values', 'about'];

  /** Whether the page is still loading. */
  isLoading = true;

  /** What to tell the user when something failed. */
  errorMessage = '';

  private readonly _customTracking = inject(CustomTrackingService);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _destroyRef = inject(DestroyRef);

  /**
   * Reads what the feature is and where the user stands with it.
   *
   * Both at once, because neither is any use on its own: the page cannot be
   * drawn without the field catalogue, and it must not offer to create
   * anything before the agreement has been accepted.
   */
  ngOnInit(): void {
    forkJoin({
      configuration: this._customTracking.getConfiguration().pipe(take(1)),
      status: this._customTracking.getPolicyStatus().pipe(take(1)),
    })
      .pipe(
        take(1),
        takeUntilDestroyed(this._destroyRef),
        observeInZone(this._ngZone, this._cdr),
      )
      .subscribe({
        next: ({ configuration, status }) => {
          this.configuration = configuration;
          this.status = status;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Unable to load Custom Tracking.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Whether the feature is switched on at all.
   *
   * @returns True when the server says it is available.
   */
  get isEnabled(): boolean {
    return this.configuration?.features.isEnabled === true;
  }

  /**
   * Whether the agreement stands between the user and changing anything.
   *
   * @returns True while acceptance is outstanding.
   */
  get needsAgreement(): boolean {
    return this.status?.acceptanceRequired === true;
  }

  /**
   * Shows one of the panels.
   *
   * @param panel - The panel to show.
   */
  show(panel: CustomTrackingPanel): void {
    this.panel = panel;
  }

  /**
   * Moves between the panels with the arrow keys.
   *
   * @param event - The key that was pressed.
   */
  onTabKeydown(event: KeyboardEvent): void {
    const moved = nextTabIndex(
      event.key,
      this.panels.indexOf(this.panel),
      this.panels.length,
    );

    if (moved === null) {
      return;
    }

    event.preventDefault();

    this.show(this.panels[moved]);
    this.focusTab(moved);
  }

  /**
   * Whether leaving the page now would lose something.
   *
   * The value editor is the only panel that holds unsaved work, and it is only
   * there once it has been opened — so a page nobody has recorded anything on
   * never stands in the way of leaving.
   *
   * @returns True while the editor holds changes nobody has saved.
   */
  hasUnsavedChanges(): boolean {
    return this.values?.hasUnsavedChanges() === true;
  }

  /**
   * Records that the agreement has been accepted.
   *
   * @param status - Where the user stands afterwards.
   */
  onAccepted(status: CustomTrackingPolicyStatus): void {
    this.status = status;
  }

  /**
   * Puts the keyboard on one of the tabs.
   *
   * @param index - Which tab, in the order the arrows move through them.
   */
  private focusTab(index: number): void {
    const tabs =
      this._host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]');

    tabs[index].focus();
  }
}
