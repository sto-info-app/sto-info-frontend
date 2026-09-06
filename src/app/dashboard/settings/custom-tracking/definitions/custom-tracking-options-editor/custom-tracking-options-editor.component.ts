import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  CustomTrackingLimits,
  CustomTrackingOption,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingReorderControlsComponent } from '../custom-tracking-reorder-controls/custom-tracking-reorder-controls.component';
import { moveInList } from '../custom-tracking-reordering.utility';

/** A rename of one option. */
export interface CustomTrackingOptionRename {
  optionId: string;
  label: string;
}

/** A change to whether one option is chosen to begin with. */
export interface CustomTrackingOptionDefault {
  optionId: string;
  isDefault: boolean;
}

/** Distinguishes one editor from another, for label associations. */
let nextOptionsEditorId = 0;

/**
 * The answers a choice or tags field offers.
 *
 * Tags are edited here too. A tag field draws from a list its owner defines
 * for that field rather than from anything typed while recording a value, so
 * the two are the same thing and are managed the same way.
 *
 * Withdrawing an option never removes it. A value that already chose it has to
 * go on reading correctly, and an editor offering to replace it has to be able
 * to say what it was — so withdrawn options stay listed, plainly marked, and
 * simply cannot be chosen afresh.
 */
@Component({
  selector: 'app-custom-tracking-options-editor',
  templateUrl: './custom-tracking-options-editor.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CustomTrackingReorderControlsComponent],
})
export class CustomTrackingOptionsEditorComponent {
  /** Every option the field has, withdrawn ones included. */
  @Input({ required: true }) options: CustomTrackingOption[] = [];

  /** The ceilings the server publishes. */
  @Input({ required: true }) limits!: CustomTrackingLimits;

  /** What one option is called in prose: "choice" or "tag". */
  @Input() optionNoun = 'choice';

  /** Whether more than one may be chosen at once. */
  @Input() allowsMultiple = false;

  /** Whether a change is in flight. */
  @Input() isSaving = false;

  /** Raised with the wording of an option to add. */
  @Output() readonly created = new EventEmitter<string>();

  /** Raised when an option should be reworded. */
  @Output() readonly renamed = new EventEmitter<CustomTrackingOptionRename>();

  /** Raised when an option should start chosen, or stop. */
  @Output()
  readonly defaultToggled = new EventEmitter<CustomTrackingOptionDefault>();

  /** Raised when an option should be withdrawn. */
  @Output() readonly withdrawn = new EventEmitter<CustomTrackingOption>();

  /** Raised with the whole intended order of the live options. */
  @Output() readonly reordered = new EventEmitter<string[]>();

  /** Identifies this editor, so its labels point at its own controls. */
  readonly editorId = `custom-tracking-options-${nextOptionsEditorId++}`;

  /** The option being reworded, or null. */
  editingOptionId: string | null = null;

  private readonly _formBuilder = inject(FormBuilder);

  /** The wording of an option being added. */
  readonly newLabel = this._formBuilder.nonNullable.control('', [
    Validators.required,
  ]);

  /** The wording of the option being reworded. */
  readonly editedLabel = this._formBuilder.nonNullable.control('', [
    Validators.required,
  ]);

  /**
   * The options that may still be chosen, in order.
   *
   * @returns The live options.
   */
  get liveOptions(): CustomTrackingOption[] {
    return this.options.filter(option => !option.withdrawn);
  }

  /**
   * The options that have been withdrawn.
   *
   * @returns The withdrawn options.
   */
  get withdrawnOptions(): CustomTrackingOption[] {
    return this.options.filter(option => option.withdrawn);
  }

  /**
   * Whether the field is already offering as many options as it may.
   *
   * Counted against the live ones. A withdrawn option occupies no place in
   * what a user can choose from.
   *
   * @returns True when no more may be added.
   */
  get isFull(): boolean {
    return this.liveOptions.length >= this.limits.MAX_OPTIONS_PER_FIELD;
  }

  /**
   * Adds an option.
   */
  add(): void {
    const label = this.newLabel.value.trim();

    if (this.isSaving || this.isFull || label === '') {
      return;
    }

    this.newLabel.setValue('');
    this.created.emit(label);
  }

  /**
   * Opens one option for rewording.
   *
   * @param option - The option to reword.
   */
  startEditing(option: CustomTrackingOption): void {
    this.editingOptionId = option.id;
    this.editedLabel.setValue(option.label);
  }

  /** Abandons a rewording. */
  cancelEditing(): void {
    this.editingOptionId = null;
  }

  /**
   * Saves a rewording.
   *
   * The option keeps its identity, which is what lets a label be corrected
   * without rewriting every value that chose it.
   *
   * @param option - The option being reworded.
   */
  saveEditing(option: CustomTrackingOption): void {
    const label = this.editedLabel.value.trim();

    if (this.isSaving || label === '') {
      return;
    }

    this.editingOptionId = null;
    this.renamed.emit({ optionId: option.id, label });
  }

  /**
   * Turns one option's default on or off.
   *
   * @param option - The option.
   */
  toggleDefault(option: CustomTrackingOption): void {
    if (this.isSaving) {
      return;
    }

    this.defaultToggled.emit({
      optionId: option.id,
      isDefault: !option.isDefault,
    });
  }

  /**
   * Withdraws an option.
   *
   * @param option - The option to withdraw.
   */
  withdraw(option: CustomTrackingOption): void {
    if (this.isSaving) {
      return;
    }

    this.withdrawn.emit(option);
  }

  /**
   * Moves an option one place earlier.
   *
   * @param index - Where it currently sits.
   */
  moveUp(index: number): void {
    this.move(index, index - 1);
  }

  /**
   * Moves an option one place later.
   *
   * @param index - Where it currently sits.
   */
  moveDown(index: number): void {
    this.move(index, index + 1);
  }

  /**
   * Asks for a new order, as the whole ordered list.
   *
   * A list either describes the collection exactly or does not, and the server
   * says which. One item and a position could ask for an order whose
   * consequences nobody can see.
   *
   * @param from - The position moving.
   * @param to - Where it is moving to.
   */
  private move(from: number, to: number): void {
    if (this.isSaving) {
      return;
    }

    const reordered = moveInList(this.liveOptions, from, to);

    this.reordered.emit(reordered.map(option => option.id));
  }
}
