import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  CustomTrackingLimits,
  CustomTrackingSection,
  CustomTrackingTab,
} from 'src/app/models/custom-tracking.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';

import { CustomTrackingGroupInput } from '../../custom-tracking.service';

/** Distinguishes one form from another, for label and error associations. */
let nextGroupFormId = 0;

/**
 * The form behind a section or a tab.
 *
 * One form for both, because they ask exactly the same three questions: what
 * it is called, what it is for, and whether anybody but its owner may see it.
 * Two forms would be two statements of those, and the one that mattered would
 * be whichever was edited last.
 *
 * Public visibility is opt-in and starts off. It is also only ever a request:
 * a tab marked public inside a private section stays private, and the form
 * says so rather than leaving the user to discover it from a page that shows
 * nothing.
 */
@Component({
  selector: 'app-custom-tracking-group-form',
  templateUrl: './custom-tracking-group-form.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    LcarsErrorMessageComponent,
    LcarsToggleComponent,
  ],
})
export class CustomTrackingGroupFormComponent implements OnInit {
  /** What the thing being edited is called, in prose: "section" or "tab". */
  @Input({ required: true }) kind!: string;

  /** The ceilings the server publishes. */
  @Input({ required: true }) limits!: CustomTrackingLimits;

  /** What is being edited, or null when one is being created. */
  @Input() group: CustomTrackingSection | CustomTrackingTab | null = null;

  /**
   * Whether everything above this in the hierarchy is public.
   *
   * A section has nothing above it, so it is always true there. A tab has its
   * section, and a tab marked public beneath a private section stays private.
   */
  @Input() ancestorPublic = true;

  /**
   * What the heading adds after the kind, if anything.
   *
   * A section belongs to one of two hierarchies and cannot be moved between
   * them afterwards, so the form says which one it is about to create in
   * rather than leaving that to whichever button was pressed last.
   */
  @Input() context = '';

  /** Whether a save is in flight. */
  @Input() isSaving = false;

  /** What the server said, when it refused. */
  @Input() errorMessage = '';

  /** Raised with what the user asked for. */
  @Output() readonly saved = new EventEmitter<CustomTrackingGroupInput>();

  /** Raised when the user backs out without saving. */
  @Output() readonly cancelled = new EventEmitter<void>();

  /** Identifies this form, so its labels point at its own controls. */
  readonly formId = `custom-tracking-group-form-${nextGroupFormId++}`;

  readonly groupForm = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    publiclyVisible: false,
  });

  /**
   * Fills the form in, and bounds it by the published limits.
   */
  ngOnInit(): void {
    this.groupForm.controls.name.addValidators(
      Validators.maxLength(this.limits.MAX_LABEL_LENGTH),
    );
    this.groupForm.controls.description.addValidators(
      Validators.maxLength(this.limits.MAX_DESCRIPTION_LENGTH),
    );

    if (this.group) {
      this.groupForm.setValue({
        name: this.group.name,
        description: this.group.description ?? '',
        publiclyVisible: this.group.publiclyVisible,
      });
    }
  }

  /**
   * Whether this form is creating something rather than changing it.
   *
   * @returns True when there was nothing to fill it in from.
   */
  get isNew(): boolean {
    return this.group === null;
  }

  /**
   * Whether a public request here would have no effect yet.
   *
   * @returns True when public is asked for beneath something private.
   */
  get isPublicBeneathPrivate(): boolean {
    return (
      this.groupForm.value.publiclyVisible === true && !this.ancestorPublic
    );
  }

  /**
   * Sends what the user asked for.
   */
  submit(): void {
    if (this.isSaving || this.groupForm.invalid) {
      return;
    }

    const entered = this.groupForm.getRawValue();
    const description = entered.description.trim();

    this.saved.emit({
      name: entered.name.trim(),
      // Empty and absent mean the same thing to a reader, so only one of them
      // is ever stored.
      description: description === '' ? null : description,
      publiclyVisible: entered.publiclyVisible,
    });
  }
}
