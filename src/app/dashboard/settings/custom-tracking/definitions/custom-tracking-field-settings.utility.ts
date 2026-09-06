import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import {
  CustomTrackingFieldBounds,
  CustomTrackingFieldType,
  CustomTrackingLimits,
} from 'src/app/models/custom-tracking.models';

import {
  CUSTOM_TRACKING_FIELD_SETTINGS,
  CUSTOM_TRACKING_SETTING_DEFAULTS,
  CustomTrackingSettingBound,
  CustomTrackingSettingChoice,
  CustomTrackingSettingDescriptor,
  CustomTrackingSettingKind,
} from './custom-tracking-field-settings.constants';

/** What a form control for a setting holds. */
export type CustomTrackingSettingValue = string | boolean;

/** The bounds one setting is entered within, as the control needs them. */
export interface CustomTrackingResolvedBound {
  /** The smallest number accepted, or null where the setting is not numeric. */
  minimum: number | null;
  /** The largest number accepted, or null. */
  maximum: number | null;
  /**
   * Whether the minimum is itself refused.
   *
   * A slider step of zero is not a step, so it is bounded below by zero
   * without including it. HTML has no way to say that, which is why it is said
   * here and checked rather than left to a `min` attribute.
   */
  exclusiveMinimum: boolean;
  /** The most characters accepted, or null where the setting is not text. */
  maxLength: number | null;
}

/** No bound of any kind, for the settings that have none. */
const UNBOUNDED: CustomTrackingResolvedBound = {
  minimum: null,
  maximum: null,
  exclusiveMinimum: false,
  maxLength: null,
};

/**
 * Works out the bounds a setting is entered within.
 *
 * Every number comes from the served limits rather than from anything written
 * down here. The builder warns early so a user is not made to submit a form to
 * be told it was wrong, but the server decides, and a bound copied into the
 * frontend would eventually be the one that disagreed.
 *
 * @param bound - Which published bound the setting is entered within.
 * @param limits - The structural ceilings, as served.
 * @param fieldBounds - The per-type bounds, as served.
 * @returns What the control should accept.
 */
export function resolveSettingBound(
  bound: CustomTrackingSettingBound,
  limits: CustomTrackingLimits,
  fieldBounds: CustomTrackingFieldBounds,
): CustomTrackingResolvedBound {
  const numeric = (
    minimum: number,
    maximum: number,
    exclusiveMinimum = false,
  ): CustomTrackingResolvedBound => ({
    minimum,
    maximum,
    exclusiveMinimum,
    maxLength: null,
  });

  const text = (maxLength: number): CustomTrackingResolvedBound => ({
    ...UNBOUNDED,
    maxLength,
  });

  switch (bound) {
    case CustomTrackingSettingBound.NUMERIC:
      return numeric(
        -fieldBounds.MAX_NUMERIC_MAGNITUDE,
        fieldBounds.MAX_NUMERIC_MAGNITUDE,
      );
    case CustomTrackingSettingBound.POSITIVE_NUMERIC:
      return numeric(0, fieldBounds.MAX_NUMERIC_MAGNITUDE, true);
    case CustomTrackingSettingBound.STEP_INTEGER:
      return numeric(1, fieldBounds.MAX_NUMERIC_MAGNITUDE);
    case CustomTrackingSettingBound.YEAR:
      return numeric(fieldBounds.MIN_YEAR, fieldBounds.MAX_YEAR);
    case CustomTrackingSettingBound.PRECISION:
      return numeric(0, fieldBounds.MAX_DECIMAL_PRECISION);
    case CustomTrackingSettingBound.TEXT_MIN_LENGTH:
      return numeric(0, limits.MAX_TEXT_VALUE_LENGTH);
    case CustomTrackingSettingBound.TEXT_MAX_LENGTH:
      return numeric(1, limits.MAX_TEXT_VALUE_LENGTH);
    case CustomTrackingSettingBound.MARKDOWN_MAX_LENGTH:
      return numeric(1, limits.MAX_MARKDOWN_VALUE_LENGTH);
    case CustomTrackingSettingBound.SELECTION_MINIMUM:
      return numeric(0, limits.MAX_OPTIONS_PER_FIELD);
    case CustomTrackingSettingBound.SELECTION_MAXIMUM:
      return numeric(1, limits.MAX_OPTIONS_PER_FIELD);
    case CustomTrackingSettingBound.PATTERN_LENGTH:
      return text(fieldBounds.MAX_PATTERN_LENGTH);
    case CustomTrackingSettingBound.PLACEHOLDER_LENGTH:
      return text(limits.MAX_PLACEHOLDER_LENGTH);
    default:
      return UNBOUNDED;
  }
}

/**
 * The rating scales on offer, as a choice list.
 *
 * Built from the served bounds rather than written down, because which scales
 * exist is the server's to decide and it refuses any other.
 *
 * @param fieldBounds - The per-type bounds, as served.
 * @returns One choice per scale, largest scale last.
 */
export function ratingChoices(
  fieldBounds: CustomTrackingFieldBounds,
): CustomTrackingSettingChoice[] {
  return fieldBounds.RATING_MAXIMA.map(maximum => ({
    value: String(maximum),
    label: `Out of ${maximum}`,
  }));
}

/**
 * The timezone the reader is in, as their own browser reports it.
 *
 * Used to seed a timed field rather than picking somewhere for them. Whoever
 * is defining the field is far likelier to mean their own clock than any
 * particular city.
 *
 * @returns An IANA timezone identifier.
 */
export function readerTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Every timezone that may be chosen, in order.
 *
 * Offered as a list rather than as free text: an IANA identifier typed by hand
 * is one letter away from being refused, and the refusal would arrive only
 * after the form was submitted.
 *
 * UTC is added rather than assumed. The server accepts it, and a fleet event
 * announced in UTC is a thing people record, but the runtime lists only the
 * geographic zones and leaves it out.
 *
 * @returns The IANA timezone identifiers, alphabetically.
 */
export function timezoneChoices(): string[] {
  const zones = new Set(Intl.supportedValuesOf('timeZone'));

  zones.add('UTC');

  return [...zones].sort((first, second) => first.localeCompare(second));
}

/**
 * What a setting starts as on a field being created.
 *
 * Optional settings start blank, which is how "no bound at all" is said. Only
 * the required ones are seeded, because they have no such spelling and a blank
 * would simply be refused.
 *
 * @param descriptor - The setting.
 * @param fieldBounds - The per-type bounds, as served.
 * @returns What its control holds.
 */
export function defaultSettingValue(
  descriptor: CustomTrackingSettingDescriptor,
  fieldBounds: CustomTrackingFieldBounds,
): CustomTrackingSettingValue {
  if (descriptor.kind === CustomTrackingSettingKind.BOOLEAN) {
    return CUSTOM_TRACKING_SETTING_DEFAULTS[descriptor.key] === true;
  }

  if (!descriptor.required) {
    return '';
  }

  if (descriptor.fromRatingMaxima) {
    // The middle scale rather than the smallest: five stars is what a rating
    // usually means, and the ends are there for people who want them.
    const maxima = fieldBounds.RATING_MAXIMA;

    return String(maxima[Math.floor(maxima.length / 2)] ?? '');
  }

  if (descriptor.kind === CustomTrackingSettingKind.TIMEZONE) {
    return readerTimezone();
  }

  return String(CUSTOM_TRACKING_SETTING_DEFAULTS[descriptor.key] ?? '');
}

/**
 * What one setting holds when an existing field is opened.
 *
 * @param descriptor - The setting.
 * @param configuration - The field's stored configuration.
 * @returns What its control holds.
 */
function storedSettingValue(
  descriptor: CustomTrackingSettingDescriptor,
  configuration: Record<string, unknown>,
): CustomTrackingSettingValue {
  const stored = configuration[descriptor.key];

  if (descriptor.kind === CustomTrackingSettingKind.BOOLEAN) {
    return stored === true;
  }

  return stored === null || stored === undefined ? '' : String(stored);
}

/**
 * Every setting a field type carries, ready to be put into a form.
 *
 * @param fieldType - The type being configured.
 * @param configuration - An existing field's configuration, or null when the
 *   field is being created.
 * @param fieldBounds - The per-type bounds, as served.
 * @returns The control values, keyed by setting.
 */
export function settingsFormValues(
  fieldType: CustomTrackingFieldType,
  configuration: Record<string, unknown> | null,
  fieldBounds: CustomTrackingFieldBounds,
): Record<string, CustomTrackingSettingValue> {
  const values: Record<string, CustomTrackingSettingValue> = {};

  for (const descriptor of CUSTOM_TRACKING_FIELD_SETTINGS[fieldType]) {
    values[descriptor.key] = configuration
      ? storedSettingValue(descriptor, configuration)
      : defaultSettingValue(descriptor, fieldBounds);
  }

  return values;
}

/**
 * Turns one setting's control value into what the server is sent.
 *
 * @param descriptor - The setting.
 * @param value - What its control holds.
 * @returns The stored form of the setting.
 */
function configurationValue(
  descriptor: CustomTrackingSettingDescriptor,
  value: CustomTrackingSettingValue,
): unknown {
  if (descriptor.kind === CustomTrackingSettingKind.BOOLEAN) {
    return value === true;
  }

  const entered = String(value).trim();

  if (entered === '') {
    // Null is how "no bound at all" is said. A required setting cannot be
    // blank, and the form refuses to submit rather than sending one.
    return null;
  }

  if (descriptor.kind === CustomTrackingSettingKind.NUMBER) {
    return Number(entered);
  }

  if (descriptor.fromRatingMaxima) {
    return Number(entered);
  }

  // Decimals stay as they were typed. One that passes through a JSON number
  // has already been rounded by the time anything can check it.
  return entered;
}

/**
 * Turns a settings form into the configuration the server is sent.
 *
 * Only the settings the type actually has are sent. An unrecognised property
 * is refused rather than ignored, so a stray one would turn an ordinary save
 * into an error.
 *
 * @param fieldType - The type being configured.
 * @param values - The control values, keyed by setting.
 * @returns The configuration to send.
 */
export function configurationFromForm(
  fieldType: CustomTrackingFieldType,
  values: Record<string, CustomTrackingSettingValue>,
): Record<string, unknown> {
  const configuration: Record<string, unknown> = {};

  for (const descriptor of CUSTOM_TRACKING_FIELD_SETTINGS[fieldType]) {
    configuration[descriptor.key] = configurationValue(
      descriptor,
      values[descriptor.key] ?? '',
    );
  }

  return configuration;
}

/**
 * Refuses a fraction where only a whole number means anything.
 *
 * Blank passes. An optional setting left empty is how "no bound at all" is
 * said, and refusing it here would make it impossible to say.
 *
 * @param control - The control being checked.
 * @returns An error when the entry is not a whole number, otherwise null.
 */
export function wholeNumberValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const entered = String(control.value ?? '').trim();

  if (entered === '') {
    return null;
  }

  return Number.isInteger(Number(entered)) ? null : { wholeNumber: true };
}

/**
 * Refuses anything but an exactly written decimal.
 *
 * Exponent notation and a bare decimal point are refused, because the value
 * travels to the database as the string it was typed as and anything the
 * server cannot read exactly is not a bound.
 *
 * @param control - The control being checked.
 * @returns An error when the entry is not an exact decimal, otherwise null.
 */
export function exactDecimalValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const entered = String(control.value ?? '').trim();

  if (entered === '') {
    return null;
  }

  return /^-?\d+(?:\.\d+)?$/.test(entered) ? null : { exactDecimal: true };
}

/**
 * Refuses a number that is not above a floor.
 *
 * `Validators.min` accepts the floor itself, and a slider whose handle moves
 * in steps of zero is not a slider.
 *
 * @param floor - The number the entry has to exceed.
 * @returns A validator refusing anything at or below it.
 */
export function aboveValidator(floor: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const entered = String(control.value ?? '').trim();

    if (entered === '') {
      return null;
    }

    return Number(entered) > floor ? null : { above: { floor } };
  };
}

/**
 * Every check one setting is subject to before it is sent.
 *
 * The server checks all of this again and is the one that decides. These exist
 * so a user is told while they are looking at the box rather than after
 * submitting the form.
 *
 * A required switch gets no `required` check: false is a perfectly good answer
 * to "ask for seconds", and `Validators.required` treats it as no answer.
 *
 * @param descriptor - The setting.
 * @param limits - The structural ceilings, as served.
 * @param fieldBounds - The per-type bounds, as served.
 * @returns The validators its control carries.
 */
export function settingValidators(
  descriptor: CustomTrackingSettingDescriptor,
  limits: CustomTrackingLimits,
  fieldBounds: CustomTrackingFieldBounds,
): ValidatorFn[] {
  if (descriptor.kind === CustomTrackingSettingKind.BOOLEAN) {
    return [];
  }

  const validators: ValidatorFn[] = [];
  const resolved = resolveSettingBound(descriptor.bound, limits, fieldBounds);

  if (descriptor.required) {
    validators.push(Validators.required);
  }

  if (descriptor.kind === CustomTrackingSettingKind.NUMBER) {
    if (!descriptor.allowsFractions) {
      validators.push(wholeNumberValidator);
    }

    if (resolved.minimum !== null) {
      validators.push(
        resolved.exclusiveMinimum
          ? aboveValidator(resolved.minimum)
          : Validators.min(resolved.minimum),
      );
    }

    if (resolved.maximum !== null) {
      validators.push(Validators.max(resolved.maximum));
    }
  }

  if (descriptor.kind === CustomTrackingSettingKind.DECIMAL) {
    validators.push(exactDecimalValidator);
  }

  if (resolved.maxLength !== null) {
    validators.push(Validators.maxLength(resolved.maxLength));
  }

  return validators;
}

/**
 * What a setting accepts, said in a sentence.
 *
 * Shown beside the control so the bound is visible before it is broken, and
 * built from the served numbers so it cannot describe a bound the server does
 * not apply.
 *
 * @param descriptor - The setting.
 * @param limits - The structural ceilings, as served.
 * @param fieldBounds - The per-type bounds, as served.
 * @returns A sentence, or an empty string where there is nothing to say.
 */
export function describeSettingBound(
  descriptor: CustomTrackingSettingDescriptor,
  limits: CustomTrackingLimits,
  fieldBounds: CustomTrackingFieldBounds,
): string {
  const resolved = resolveSettingBound(descriptor.bound, limits, fieldBounds);

  if (resolved.maxLength !== null) {
    return `Up to ${resolved.maxLength} characters.`;
  }

  if (resolved.minimum === null || resolved.maximum === null) {
    return '';
  }

  const kindOfNumber = descriptor.allowsFractions ? 'number' : 'whole number';

  return resolved.exclusiveMinimum
    ? `A ${kindOfNumber} above ${resolved.minimum}, up to ${resolved.maximum}.`
    : `A ${kindOfNumber} from ${resolved.minimum} to ${resolved.maximum}.`;
}
