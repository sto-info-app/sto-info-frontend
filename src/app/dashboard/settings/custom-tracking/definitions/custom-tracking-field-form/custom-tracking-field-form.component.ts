import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  CustomTrackingConfiguration,
  CustomTrackingEmptyMode,
  CustomTrackingField,
  CustomTrackingFieldType,
  CustomTrackingFieldTypeDescription,
} from 'src/app/models/custom-tracking.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsToggleComponent } from 'src/app/shared/components/lcars-toggle/lcars-toggle.component';

import { CustomTrackingFieldInput } from '../../custom-tracking.service';
import {
  CUSTOM_TRACKING_CATEGORY_LABELS,
  CUSTOM_TRACKING_EMPTY_MODE_CHOICES,
  CUSTOM_TRACKING_FIELD_SETTINGS,
  CustomTrackingSettingChoice,
  CustomTrackingSettingDescriptor,
  CustomTrackingSettingKind,
} from '../custom-tracking-field-settings.constants';
import {
  CustomTrackingSettingValue,
  configurationFromForm,
  describeSettingBound,
  ratingChoices,
  settingValidators,
  settingsFormValues,
  timezoneChoices,
} from '../custom-tracking-field-settings.utility';

/** One grouping of field types, as the chooser offers them. */
export interface CustomTrackingFieldTypeGroup {
  label: string;
  types: CustomTrackingFieldTypeDescription[];
}

/** Distinguishes one form from another, for label associations. */
let nextFieldFormId = 0;

/**
 * The form behind a field.
 *
 * The type is chosen once and never again. It decides how every value already
 * recorded against the field is stored, validated and rendered, so changing it
 * would reinterpret data its owner cannot get back — the chooser disappears
 * once the field exists, and the form never sends a type on a change, because
 * the server refuses a request naming one rather than ignoring it.
 *
 * The settings beneath the chooser are rebuilt whenever the type changes.
 * Every one of them is described by the catalogue rather than by a branch per
 * type, which is what keeps a type added later from quietly having no form.
 *
 * What a reader sees where the field is empty is asked twice — once for its
 * owner and once for the public — because somebody may well want a reminder of
 * what they have not filled in yet without publishing the gap. The placeholder
 * itself is shared, because it is a description of the field rather than of
 * either audience.
 */
@Component({
  selector: 'app-custom-tracking-field-form',
  templateUrl: './custom-tracking-field-form.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    LcarsErrorMessageComponent,
    LcarsToggleComponent,
  ],
})
export class CustomTrackingFieldFormComponent implements OnInit {
  /** Everything the server published about the feature. */
  @Input({ required: true }) configuration!: CustomTrackingConfiguration;

  /** The field being changed, or null when one is being created. */
  @Input() field: CustomTrackingField | null = null;

  /** Whether the section and tab above this field are both public. */
  @Input() ancestorPublic = true;

  /** Whether a save is in flight. */
  @Input() isSaving = false;

  /** What the server said, when it refused. */
  @Input() errorMessage = '';

  /** Raised with what the user asked for. */
  @Output() readonly saved = new EventEmitter<CustomTrackingFieldInput>();

  /** Raised when the user backs out without saving. */
  @Output() readonly cancelled = new EventEmitter<void>();

  /** Identifies this form, so its labels point at its own controls. */
  readonly formId = `custom-tracking-field-form-${nextFieldFormId++}`;

  /** What a viewer sees where the field has no value. */
  readonly emptyModeChoices = CUSTOM_TRACKING_EMPTY_MODE_CHOICES;

  /** The kinds of control a setting is entered through. */
  readonly settingKind = CustomTrackingSettingKind;

  /** Every timezone that may be chosen. */
  readonly timezones = timezoneChoices();

  private readonly _formBuilder = inject(FormBuilder);

  readonly fieldForm = this._formBuilder.nonNullable.group({
    fieldType: [CustomTrackingFieldType.TEXT_SINGLE_LINE],
    name: ['', [Validators.required]],
    description: [''],
    required: false,
    publiclyVisible: false,
    ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
    publicEmptyMode: CustomTrackingEmptyMode.HIDE,
    emptyPlaceholder: [''],
    settings: this._formBuilder.group<
      Record<string, FormControl<CustomTrackingSettingValue>>
    >({}),
  });

  /**
   * Fills the form in and builds the settings the chosen type carries.
   */
  ngOnInit(): void {
    const { limits } = this.configuration;

    this.fieldForm.controls.name.addValidators(
      Validators.maxLength(limits.MAX_LABEL_LENGTH),
    );
    this.fieldForm.controls.description.addValidators(
      Validators.maxLength(limits.MAX_DESCRIPTION_LENGTH),
    );
    this.fieldForm.controls.emptyPlaceholder.addValidators(
      Validators.maxLength(limits.MAX_PLACEHOLDER_LENGTH),
    );

    if (this.field) {
      this.fieldForm.patchValue({
        fieldType: this.field.fieldType,
        name: this.field.name,
        description: this.field.description ?? '',
        required: this.field.required,
        publiclyVisible: this.field.publiclyVisible,
        ownerEmptyMode: this.field.ownerEmptyMode,
        publicEmptyMode: this.field.publicEmptyMode,
        emptyPlaceholder: this.field.emptyPlaceholder ?? '',
      });
    }

    this.buildSettings();
    this.syncRequired();
  }

  /**
   * Whether this form is creating a field rather than changing one.
   *
   * @returns True when there was nothing to fill it in from.
   */
  get isNew(): boolean {
    return this.field === null;
  }

  /**
   * The type currently chosen.
   *
   * @returns The field type.
   */
  get fieldType(): CustomTrackingFieldType {
    return this.fieldForm.controls.fieldType.value;
  }

  /**
   * What the catalogue says about the chosen type.
   *
   * @returns The type description, or null when the server published none.
   */
  get chosenType(): CustomTrackingFieldTypeDescription | null {
    return (
      this.configuration.fieldTypes.find(
        type => type.fieldType === this.fieldType,
      ) ?? null
    );
  }

  /**
   * Whether the chosen type may be made to demand an answer.
   *
   * Read from the catalogue rather than decided here, so a type added later
   * arrives with its own answer instead of falling into whichever branch a
   * list in the frontend happened to put it in.
   *
   * @returns True unless the server said this type never requires an answer.
   */
  get allowsRequired(): boolean {
    return this.chosenType?.allowsRequired ?? true;
  }

  /**
   * The types on offer, grouped as the catalogue groups them.
   *
   * @returns One group per category the server published a type for.
   */
  get typeGroups(): CustomTrackingFieldTypeGroup[] {
    const groups = new Map<string, CustomTrackingFieldTypeDescription[]>();

    for (const type of this.configuration.fieldTypes) {
      const label = CUSTOM_TRACKING_CATEGORY_LABELS[type.category];

      groups.set(label, [...(groups.get(label) ?? []), type]);
    }

    return [...groups].map(([label, types]) => ({ label, types }));
  }

  /** The settings the chosen type carries, in the order they are asked for. */
  get settingDescriptors(): readonly CustomTrackingSettingDescriptor[] {
    return CUSTOM_TRACKING_FIELD_SETTINGS[this.fieldType];
  }

  /** The controls behind those settings. */
  get settingsGroup(): FormGroup<
    Record<string, FormControl<CustomTrackingSettingValue>>
  > {
    return this.fieldForm.controls.settings;
  }

  /**
   * Whether a placeholder is being asked for by either audience.
   *
   * @returns True when the owner or the public would see one.
   */
  get needsPlaceholder(): boolean {
    const entered = this.fieldForm.getRawValue();

    return (
      entered.ownerEmptyMode === CustomTrackingEmptyMode.SHOW_PLACEHOLDER ||
      entered.publicEmptyMode === CustomTrackingEmptyMode.SHOW_PLACEHOLDER
    );
  }

  /**
   * What the owner would see where this field has no value.
   *
   * @returns The line as it would be rendered.
   */
  get ownerEmptyPreview(): string {
    return this.previewOf(this.fieldForm.getRawValue().ownerEmptyMode);
  }

  /**
   * What the public would see where this field has no value.
   *
   * @returns The line as it would be rendered.
   */
  get publicEmptyPreview(): string {
    return this.previewOf(this.fieldForm.getRawValue().publicEmptyMode);
  }

  /**
   * Whether a public request here would have no effect yet.
   *
   * @returns True when public is asked for beneath something private.
   */
  get isPublicBeneathPrivate(): boolean {
    return (
      this.fieldForm.value.publiclyVisible === true && !this.ancestorPublic
    );
  }

  /**
   * What one empty mode would look like, using what has been typed so far.
   *
   * Shown rather than described, because "show the name and a placeholder" is
   * a rule and what a reader wants to know is what will actually be on the
   * page.
   *
   * @param mode - The mode being previewed.
   * @returns The line as it would be rendered.
   */
  private previewOf(mode: CustomTrackingEmptyMode): string {
    if (mode === CustomTrackingEmptyMode.HIDE) {
      return 'Nothing at all — the field is not shown.';
    }

    const entered = this.fieldForm.getRawValue();
    const name =
      entered.name.trim() === '' ? 'This field' : entered.name.trim();

    if (mode === CustomTrackingEmptyMode.SHOW_LABEL) {
      return name;
    }

    const placeholder = entered.emptyPlaceholder.trim();

    return `${name} — ${placeholder === '' ? 'Not recorded' : placeholder}`;
  }

  /**
   * What one setting accepts, said in a sentence.
   *
   * @param descriptor - The setting.
   * @returns A sentence, or an empty string where there is nothing to say.
   */
  boundDescription(descriptor: CustomTrackingSettingDescriptor): string {
    return describeSettingBound(
      descriptor,
      this.configuration.limits,
      this.configuration.fieldBounds,
    );
  }

  /**
   * The choices one setting offers.
   *
   * @param descriptor - The setting.
   * @returns Its fixed choices, or the served rating scales.
   */
  settingChoices(
    descriptor: CustomTrackingSettingDescriptor,
  ): readonly CustomTrackingSettingChoice[] {
    return descriptor.fromRatingMaxima
      ? ratingChoices(this.configuration.fieldBounds)
      : (descriptor.choices ?? []);
  }

  /**
   * The control behind one setting.
   *
   * @param descriptor - The setting.
   * @returns Its control.
   */
  settingControl(
    descriptor: CustomTrackingSettingDescriptor,
  ): FormControl<CustomTrackingSettingValue> {
    return this.settingsGroup.controls[descriptor.key];
  }

  /**
   * Rebuilds the settings after the chosen type has changed.
   *
   * Only reachable while a field is being created. Once it exists its type is
   * fixed, and the chooser is not shown at all.
   */
  onTypeChange(): void {
    this.buildSettings();
    this.syncRequired();
  }

  /**
   * Sends what the user asked for.
   */
  submit(): void {
    if (this.isSaving || this.fieldForm.invalid) {
      return;
    }

    const entered = this.fieldForm.getRawValue();
    const description = entered.description.trim();
    const placeholder = entered.emptyPlaceholder.trim();

    const input: CustomTrackingFieldInput = {
      name: entered.name.trim(),
      description: description === '' ? null : description,
      required: entered.required,
      publiclyVisible: entered.publiclyVisible,
      ownerEmptyMode: entered.ownerEmptyMode,
      publicEmptyMode: entered.publicEmptyMode,
      emptyPlaceholder: placeholder === '' ? null : placeholder,
      configuration: configurationFromForm(this.fieldType, entered.settings),
    };

    // The type travels only on creation. It is fixed afterwards, and the
    // server refuses a change that names one rather than ignoring it.
    this.saved.emit(
      this.isNew ? { ...input, fieldType: entered.fieldType } : input,
    );
  }

  /**
   * Drops a requirement the chosen type cannot express.
   *
   * The toggle is hidden for such a type, and a hidden control holding true
   * would go on demanding an answer nobody could see was being demanded. A
   * field that was requiring one before its form was opened stops doing so
   * when it is next saved, which is the only moment its owner is looking.
   */
  private syncRequired(): void {
    if (!this.allowsRequired) {
      this.fieldForm.controls.required.setValue(false);
    }
  }

  /**
   * Builds a control for every setting the chosen type carries.
   *
   * The whole group is replaced rather than mended. A type change swaps one
   * set of settings for another, and controls left behind from the old set
   * would be sent as properties the new type does not have — which the server
   * refuses outright.
   */
  private buildSettings(): void {
    const { limits, fieldBounds } = this.configuration;
    const values = settingsFormValues(
      this.fieldType,
      this.field?.configuration ?? null,
      fieldBounds,
    );

    const group = this._formBuilder.group<
      Record<string, FormControl<CustomTrackingSettingValue>>
    >({});

    for (const descriptor of this.settingDescriptors) {
      group.addControl(
        descriptor.key,
        new FormControl<CustomTrackingSettingValue>(values[descriptor.key], {
          nonNullable: true,
          validators: settingValidators(descriptor, limits, fieldBounds),
        }),
      );
    }

    this.fieldForm.setControl('settings', group);
  }
}
