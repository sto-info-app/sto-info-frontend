import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  CustomTrackingAgreement,
  CustomTrackingPolicyStatus,
} from 'src/app/models/custom-tracking.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

import { CustomTrackingService } from '../custom-tracking.service';

/**
 * The content agreement, and accepting it.
 *
 * Shown before anything can be created, and again whenever the wording has
 * materially changed. What it must never do is imply that the rules it states
 * can be enforced automatically: free text and uploaded pictures cannot be
 * made to refuse personal information, and the agreement says so in the terms
 * themselves rather than in a promise the interface makes.
 *
 * The tick box starts clear and stays clear until the user sets it. Presetting
 * it would turn an agreement into a formality nobody read.
 *
 * The version displayed travels with the acceptance. A page left open across a
 * wording change would otherwise record agreement to terms the user never saw,
 * which is the one thing an acceptance record exists to rule out — and the
 * server refuses a stale version rather than trusting this.
 */
@Component({
  selector: 'app-custom-tracking-agreement',
  templateUrl: './custom-tracking-agreement.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
  ],
})
export class CustomTrackingAgreementComponent implements OnInit {
  /**
   * Where the user stands, when the parent already knows.
   *
   * Passed in rather than fetched again so the panel and its parent cannot
   * disagree about whether editing is locked.
   */
  @Input() status: CustomTrackingPolicyStatus | null = null;

  /** Raised once the agreement has been accepted. */
  @Output() readonly accepted = new EventEmitter<CustomTrackingPolicyStatus>();

  readonly termsLink = `/${APP_ROUTES.TERMS_OF_USE}`;
  readonly agreementForm = inject(FormBuilder).nonNullable.group({
    agreed: false,
  });

  agreement: CustomTrackingAgreement | null = null;
  isLoading = true;
  isSaving = false;
  errorMessage = '';

  private readonly _customTracking = inject(CustomTrackingService);
  private readonly _cdr = inject(ChangeDetectorRef);

  /**
   * Loads the wording to be agreed to.
   */
  ngOnInit(): void {
    this._customTracking.getAgreement().subscribe({
      next: agreement => {
        this.agreement = agreement;
        this.isLoading = false;
        this._cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Unable to load the content agreement.';
        this.isLoading = false;
        this._cdr.markForCheck();
      },
    });
  }

  /**
   * Whether this is a first acceptance or a re-acceptance.
   *
   * The two need different wording: somebody being asked again deserves to
   * know that their existing data is untouched and only editing is paused.
   *
   * @returns True when the user has accepted some earlier version.
   */
  get isReacceptance(): boolean {
    return (this.status?.acceptedVersion ?? null) !== null;
  }

  /**
   * Records the user's acceptance.
   */
  accept(): void {
    if (this.isSaving || !this.agreement || !this.agreementForm.value.agreed) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    this._customTracking.acceptPolicy(this.agreement.version).subscribe({
      next: status => {
        this.isSaving = false;
        this.accepted.emit(status);
        this._cdr.markForCheck();
      },
      error: () => {
        // Deliberately vague about the cause but specific about the remedy:
        // the likeliest reason is that the wording changed while this page was
        // open, and reloading is what fixes it either way.
        this.errorMessage =
          'Unable to record your acceptance. Reload the page and read the agreement again before trying once more.';
        this.isSaving = false;
        this._cdr.markForCheck();
      },
    });
  }
}
