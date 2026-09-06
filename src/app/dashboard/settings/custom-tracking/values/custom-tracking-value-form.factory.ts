import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import {
  CustomTrackingField,
  CustomTrackingFieldType,
  CustomTrackingLimits,
  CustomTrackingStoredAnswer,
} from 'src/app/models/custom-tracking.models';

import {
  exactDecimalValidator,
  wholeNumberValidator,
} from '../definitions/custom-tracking-field-settings.utility';
import {
  CustomTrackingControlValue,
  valueFormFor,
} from './custom-tracking-value.utility';

/** One field's controls, as the editor holds them. */
export type CustomTrackingValueGroup = FormGroup<
  Record<string, FormControl<CustomTrackingControlValue>>
>;

/**
 * Reads a numeric setting off a field's configuration.
 *
 * @param field - The field.
 * @param key - The setting.
 * @returns The number, or null where the field does not bound it.
 */
function numberSetting(field: CustomTrackingField, key: string): number | null {
  const held = field.configuration[key];

  return typeof held === 'number' ? held : null;
}

/**
 * Reads a textual setting off a field's configuration.
 *
 * @param field - The field.
 * @param key - The setting.
 * @returns The text, or null where the field does not carry it.
 */
function textSetting(field: CustomTrackingField, key: string): string | null {
  const held = field.configuration[key];

  return typeof held === 'string' && held !== '' ? held : null;
}

/**
 * Refuses more decimal places than the field keeps.
 *
 * A figure written to more places than are stored is not rounded on the way
 * in — it is refused, so that what is displayed back is always exactly what
 * was typed.
 *
 * @param precision - How many places the field keeps.
 * @returns A validator refusing anything finer.
 */
function precisionValidator(precision: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const entered = String(control.value).trim();
    const places = entered.split('.')[1]?.length ?? 0;

    return places > precision ? { precision: { precision } } : null;
  };
}

/**
 * Requires one date to fall on or before another.
 *
 * Checked across the pair rather than on either control, because neither one
 * is wrong on its own — it is the pair that cannot be true.
 *
 * @param startKey - The control holding the start.
 * @param endKey - The control holding the end.
 * @returns A validator refusing a range that ends before it starts.
 */
function orderedValidator(startKey: string, endKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const { controls } = group as FormGroup;
    const start = String(controls[startKey].value);
    const end = String(controls[endKey].value);

    if (start === '' || end === '') {
      return null;
    }

    return start > end ? { endsBeforeItStarts: true } : null;
  };
}

/**
 * Requires a progress figure to make sense against its total.
 *
 * @returns A validator refusing a total of nothing, or being further along
 *   than the whole of it.
 */
function progressValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const { controls } = group as FormGroup;
    const current = String(controls['current'].value).trim();
    const maximum = String(controls['maximum'].value).trim();

    if (current === '' && maximum === '') {
      return null;
    }

    if (current === '' || maximum === '') {
      return { progressIncomplete: true };
    }

    if (Number(maximum) <= 0) {
      return { totalOfNothing: true };
    }

    return Number(current) > Number(maximum) ? { pastTheEnd: true } : null;
  };
}

/**
 * Requires the number of options chosen to fall within the field's bounds.
 *
 * Choosing nothing always passes. That is how an answer is cleared, and a
 * field that must be answered is stopped by the required check on the record
 * rather than by a bound on how many.
 *
 * @param minimum - The fewest that may be chosen, or null.
 * @param maximum - The most that may be chosen, or null.
 * @returns A validator refusing a selection outside them.
 */
function selectionValidator(
  minimum: number | null,
  maximum: number | null,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const chosen = Array.isArray(control.value) ? control.value.length : 0;

    if (chosen === 0) {
      return null;
    }

    if (minimum !== null && chosen < minimum) {
      return { tooFewChosen: { minimum } };
    }

    return maximum !== null && chosen > maximum
      ? { tooManyChosen: { maximum } }
      : null;
  };
}

/**
 * The checks holding a number between two of a field's settings.
 *
 * @param field - The field.
 * @param minimumKey - The setting naming the smallest value accepted.
 * @param maximumKey - The setting naming the largest.
 * @returns The validators, or none where the field bounds neither end.
 */
function boundValidators(
  field: CustomTrackingField,
  minimumKey: string,
  maximumKey: string,
): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  const minimum = numberSetting(field, minimumKey);
  const maximum = numberSetting(field, maximumKey);

  if (minimum !== null) {
    validators.push(Validators.min(minimum));
  }

  if (maximum !== null) {
    validators.push(Validators.max(maximum));
  }

  return validators;
}

/**
 * The checks on a decimal entered against a field's bounds.
 *
 * The bounds are compared as numbers even though the value is carried as a
 * string. This is the early warning, not the decision: the server compares
 * them exactly and is the one that refuses.
 *
 * @param field - The field.
 * @returns The validators its control carries.
 */
function decimalValidators(field: CustomTrackingField): ValidatorFn[] {
  const validators: ValidatorFn[] = [exactDecimalValidator];
  const precision = numberSetting(field, 'precision');
  const minimum = textSetting(field, 'minimum');
  const maximum = textSetting(field, 'maximum');

  if (precision !== null) {
    validators.push(precisionValidator(precision));
  }

  if (minimum !== null) {
    validators.push(Validators.min(Number(minimum)));
  }

  if (maximum !== null) {
    validators.push(Validators.max(Number(maximum)));
  }

  return validators;
}

/**
 * The checks on a line of text entered against a field's bounds.
 *
 * @param field - The field.
 * @param limits - The structural ceilings, as served.
 * @returns The validators its control carries.
 */
function textValidators(
  field: CustomTrackingField,
  limits: CustomTrackingLimits,
): ValidatorFn[] {
  const validators: ValidatorFn[] = [
    Validators.maxLength(
      numberSetting(field, 'maxLength') ?? limits.MAX_TEXT_VALUE_LENGTH,
    ),
  ];
  const minimum = numberSetting(field, 'minLength');
  const pattern = textSetting(field, 'pattern');

  if (minimum !== null) {
    validators.push(Validators.minLength(minimum));
  }

  if (pattern !== null) {
    validators.push(Validators.pattern(pattern));
  }

  return validators;
}

/**
 * The checks on each control of one field.
 *
 * Everything here is an early warning. The server checks all of it again
 * against the field's stored configuration and is what actually decides; these
 * exist so somebody is told while they are still looking at the box rather
 * than after a save that was never going to land.
 *
 * @param field - The field being answered.
 * @param limits - The structural ceilings, as served.
 * @returns The validators, keyed by control.
 */
function controlValidators(
  field: CustomTrackingField,
  limits: CustomTrackingLimits,
): Record<string, ValidatorFn[]> {
  switch (field.fieldType) {
    case CustomTrackingFieldType.TEXT_SINGLE_LINE:
      return { text: textValidators(field, limits) };
    case CustomTrackingFieldType.MARKDOWN:
      return {
        markdown: [
          Validators.maxLength(
            numberSetting(field, 'maxLength') ??
              limits.MAX_MARKDOWN_VALUE_LENGTH,
          ),
        ],
      };
    case CustomTrackingFieldType.INTEGER:
      return {
        integer: [
          wholeNumberValidator,
          ...boundValidators(field, 'minimum', 'maximum'),
        ],
      };
    case CustomTrackingFieldType.DECIMAL:
    case CustomTrackingFieldType.PERCENTAGE:
      return { decimal: decimalValidators(field) };
    case CustomTrackingFieldType.RANGE:
      // No whole-number check: a slider's step may be a fraction, and the ends
      // it moves between are the field's own settings.
      return { number: boundValidators(field, 'minimum', 'maximum') };
    case CustomTrackingFieldType.YEAR:
      return {
        year: [
          wholeNumberValidator,
          ...boundValidators(field, 'minimumYear', 'maximumYear'),
        ],
      };
    case CustomTrackingFieldType.PROGRESS:
      return { current: [], maximum: [] };
    case CustomTrackingFieldType.DURATION:
      return {
        days: [wholeNumberValidator, Validators.min(0)],
        hours: [wholeNumberValidator, Validators.min(0)],
        minutes: [wholeNumberValidator, Validators.min(0)],
        seconds: [wholeNumberValidator, Validators.min(0)],
      };
    case CustomTrackingFieldType.CHECKBOX_LIST:
    case CustomTrackingFieldType.MULTI_SELECT:
    case CustomTrackingFieldType.TAGS:
      return {
        optionIds: [
          selectionValidator(
            numberSetting(field, 'minimumSelections'),
            numberSetting(field, 'maximumSelections'),
          ),
        ],
      };
    default:
      return {};
  }
}

/**
 * The check that applies to a field's controls together rather than singly.
 *
 * @param field - The field being answered.
 * @returns The validator, or null where the field has none.
 */
function groupValidator(field: CustomTrackingField): ValidatorFn | null {
  switch (field.fieldType) {
    case CustomTrackingFieldType.PROGRESS:
      return progressValidator();
    case CustomTrackingFieldType.DATE_RANGE:
      return orderedValidator('startDate', 'endDate');
    case CustomTrackingFieldType.DATE_TIME_RANGE:
      return orderedValidator('startLocalDateTime', 'endLocalDateTime');
    default:
      return null;
  }
}

/**
 * Builds the controls answering one field.
 *
 * @param field - The field being answered.
 * @param answer - What is recorded against it, or undefined.
 * @param limits - The structural ceilings, as served.
 * @returns The field's controls.
 */
export function buildValueGroup(
  field: CustomTrackingField,
  answer: CustomTrackingStoredAnswer | undefined,
  limits: CustomTrackingLimits,
): CustomTrackingValueGroup {
  const values = valueFormFor(field, answer);
  const validators = controlValidators(field, limits);
  const controls: Record<string, FormControl<CustomTrackingControlValue>> = {};

  for (const [key, value] of Object.entries(values)) {
    controls[key] = new FormControl<CustomTrackingControlValue>(value, {
      nonNullable: true,
      validators: validators[key] ?? [],
    });
  }

  const group = new FormGroup(controls);
  const across = groupValidator(field);

  if (across) {
    group.addValidators(across);
    group.updateValueAndValidity({ emitEvent: false });
  }

  return group;
}
