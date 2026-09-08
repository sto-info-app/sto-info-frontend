import {
  CustomTrackingField,
  CustomTrackingFieldType,
  CustomTrackingStoredAnswer,
} from 'src/app/models/custom-tracking.models';
import {
  localDateTimeIn,
  timezoneOf,
  youTubeAddress,
} from 'src/app/shared/custom-tracking/custom-tracking-time.utility';

/** What one control in a value form holds. */
export type CustomTrackingControlValue = string | boolean | string[];

/** Every control answering one field, keyed by control. */
export type CustomTrackingValueForm = Record<
  string,
  CustomTrackingControlValue
>;

/** What a field's stored value fragment looks like when it has one. */
type StoredFragment = Record<string, unknown>;

/**
 * How one kind of field is put into a form and taken back out of it.
 *
 * Three questions, kept together because they are the same question asked at
 * three moments and they have to agree: what the controls are called, what
 * they hold when the field has been answered, and what that means once it is
 * sent back. A type whose reader and writer disagreed would lose an answer on
 * the round trip without failing anywhere.
 */
export interface CustomTrackingValueCodec {
  /**
   * What the controls hold for a field with no answer.
   *
   * @param field - The field being answered.
   * @returns The empty form.
   */
  blank(field: CustomTrackingField): CustomTrackingValueForm;

  /**
   * What the controls hold for a field that has been answered.
   *
   * @param field - The field being answered.
   * @param answer - What is recorded against it.
   * @returns The filled form.
   */
  fill(
    field: CustomTrackingField,
    answer: CustomTrackingStoredAnswer,
  ): CustomTrackingValueForm;

  /**
   * What is sent for the field, or null to clear the answer.
   *
   * @param value - What the controls hold.
   * @returns The submitted value, or null.
   */
  submit(value: CustomTrackingValueForm): Record<string, unknown> | null;
}

/**
 * Reads one control as text.
 *
 * @param value - The form.
 * @param key - The control.
 * @returns Its contents, trimmed.
 */
function textOf(value: CustomTrackingValueForm, key: string): string {
  return String(value[key] ?? '').trim();
}

/**
 * Reads one control as a list of identifiers.
 *
 * @param value - The form.
 * @param key - The control.
 * @returns The identifiers, or an empty list.
 */
function listOf(value: CustomTrackingValueForm, key: string): string[] {
  const held = value[key];

  return Array.isArray(held) ? held : [];
}

/**
 * Reads one property of a stored fragment as text.
 *
 * @param answer - The stored answer.
 * @param key - The property.
 * @returns Its contents, or an empty string where there is none.
 */
function fragmentText(answer: CustomTrackingStoredAnswer, key: string): string {
  const fragment = answer.value as StoredFragment | null;
  const held = fragment?.[key];

  return typeof held === 'string' ||
    typeof held === 'number' ||
    typeof held === 'boolean'
    ? String(held)
    : '';
}

/**
 * A codec for the types whose answer is one piece of text under one name.
 *
 * @param key - The property the value is stored under.
 * @returns The codec.
 */
function textCodec(key: string): CustomTrackingValueCodec {
  return {
    blank: () => ({ [key]: '' }),
    fill: (_field, answer) => ({ [key]: fragmentText(answer, key) }),
    submit: value => {
      const entered = textOf(value, key);

      return entered === '' ? null : { [key]: entered };
    },
  };
}

/**
 * A codec for the types whose answer is one number under one name.
 *
 * The control still holds text. An empty number input reports an empty string
 * and a half-typed minus sign reports nothing at all, and both have to stay
 * distinguishable from a deliberate zero.
 *
 * @param key - The property the value is stored under.
 * @returns The codec.
 */
function numberCodec(key: string): CustomTrackingValueCodec {
  return {
    blank: () => ({ [key]: '' }),
    fill: (_field, answer) => ({ [key]: fragmentText(answer, key) }),
    submit: value => {
      const entered = textOf(value, key);

      return entered === '' ? null : { [key]: Number(entered) };
    },
  };
}

/**
 * The timezone a field's editor opens in.
 *
 * The definition names one, and a value may override it for a single account
 * or character — so this is only where the control starts.
 *
 * @param field - The field being answered.
 * @returns The IANA identifier the definition carries, or UTC where it
 *   somehow carries none.
 */
export function fieldTimezone(field: CustomTrackingField): string {
  return timezoneOf(field.configuration);
}

/** How a choice of colour is being made. */
export const CUSTOM_TRACKING_COLOUR_MODES = {
  NONE: '',
  TOKEN: 'TOKEN',
  LITERAL: 'LITERAL',
} as const;

/**
 * The options a field offers by default.
 *
 * Applied only where nothing is recorded. A default that overwrote a stored
 * answer would quietly discard something the user chose deliberately.
 *
 * @param field - The field being answered.
 * @returns The identifiers of its default options.
 */
function defaultOptionIds(field: CustomTrackingField): string[] {
  return field.options
    .filter(option => option.isDefault && !option.withdrawn)
    .map(option => option.id);
}

/**
 * A codec for the types whose answer is a choice from a list.
 *
 * @param single - Whether only one option may be chosen.
 * @returns The codec.
 */
function choiceCodec(single: boolean): CustomTrackingValueCodec {
  return {
    blank: field => {
      const defaults = defaultOptionIds(field);

      return { optionIds: single ? defaults.slice(0, 1) : defaults };
    },
    fill: (_field, answer) => ({ optionIds: [...answer.optionIds] }),
    submit: value => {
      const chosen = listOf(value, 'optionIds');

      return chosen.length === 0 ? null : { optionIds: chosen };
    },
  };
}

/** A yes-or-no answer, kept distinct from having given none. */
const booleanCodec: CustomTrackingValueCodec = {
  // Two controls rather than one, because a switch has two positions and the
  // answer has three states. `false` is an answer somebody chose; no answer at
  // all is a different thing, and a single checkbox cannot say which it means.
  blank: () => ({ answered: false, boolean: false }),
  fill: (_field, answer) => ({
    answered: true,
    boolean: (answer.value as StoredFragment | null)?.['boolean'] === true,
  }),
  submit: value =>
    value['answered'] === true ? { boolean: value['boolean'] === true } : null,
};

/** A start and end calendar date. */
const dateRangeCodec: CustomTrackingValueCodec = {
  blank: () => ({ startDate: '', endDate: '' }),
  fill: (_field, answer) => ({
    startDate: fragmentText(answer, 'startDate'),
    endDate: fragmentText(answer, 'endDate'),
  }),
  submit: value => {
    const startDate = textOf(value, 'startDate');
    const endDate = textOf(value, 'endDate');

    return startDate === '' && endDate === '' ? null : { startDate, endDate };
  },
};

/** A time of day, in a named timezone. */
const timeCodec: CustomTrackingValueCodec = {
  blank: field => ({ time: '', timezone: fieldTimezone(field) }),
  fill: (field, answer) => ({
    time: fragmentText(answer, 'time'),
    timezone: fragmentText(answer, 'timezone') || fieldTimezone(field),
  }),
  submit: value => {
    const time = textOf(value, 'time');

    return time === '' ? null : { time, timezone: textOf(value, 'timezone') };
  },
};

/** A moment in time, entered locally and stored as an instant. */
const dateTimeCodec: CustomTrackingValueCodec = {
  blank: field => ({ localDateTime: '', timezone: fieldTimezone(field) }),
  fill: (field, answer) => {
    const timezone = fragmentText(answer, 'timezone') || fieldTimezone(field);
    const instant = fragmentText(answer, 'instant');

    return {
      localDateTime: instant === '' ? '' : localDateTimeIn(instant, timezone),
      timezone,
    };
  },
  submit: value => {
    const localDateTime = textOf(value, 'localDateTime');

    return localDateTime === ''
      ? null
      : { localDateTime, timezone: textOf(value, 'timezone') };
  },
};

/** A start and end moment, both entered in one timezone. */
const dateTimeRangeCodec: CustomTrackingValueCodec = {
  blank: field => ({
    startLocalDateTime: '',
    endLocalDateTime: '',
    timezone: fieldTimezone(field),
  }),
  fill: (field, answer) => {
    const timezone = fragmentText(answer, 'timezone') || fieldTimezone(field);
    const start = fragmentText(answer, 'startInstant');
    const end = fragmentText(answer, 'endInstant');

    return {
      startLocalDateTime: start === '' ? '' : localDateTimeIn(start, timezone),
      endLocalDateTime: end === '' ? '' : localDateTimeIn(end, timezone),
      timezone,
    };
  },
  submit: value => {
    const startLocalDateTime = textOf(value, 'startLocalDateTime');
    const endLocalDateTime = textOf(value, 'endLocalDateTime');

    return startLocalDateTime === '' && endLocalDateTime === ''
      ? null
      : {
          startLocalDateTime,
          endLocalDateTime,
          timezone: textOf(value, 'timezone'),
        };
  },
};

/** How far through something the user is, and what the whole of it is. */
const progressCodec: CustomTrackingValueCodec = {
  blank: () => ({ current: '', maximum: '' }),
  fill: (_field, answer) => ({
    current: fragmentText(answer, 'current'),
    maximum: fragmentText(answer, 'maximum'),
  }),
  submit: value => {
    const current = textOf(value, 'current');
    const maximum = textOf(value, 'maximum');

    return current === '' && maximum === ''
      ? null
      : { current: Number(current), maximum: Number(maximum) };
  },
};

/** A month within a year, entered as one control. */
const monthYearCodec: CustomTrackingValueCodec = {
  blank: () => ({ monthYear: '' }),
  fill: (_field, answer) => {
    const year = fragmentText(answer, 'year');
    const month = fragmentText(answer, 'month');

    return {
      monthYear: year === '' ? '' : `${year}-${month.padStart(2, '0')}`,
    };
  },
  submit: value => {
    const entered = textOf(value, 'monthYear');

    if (entered === '') {
      return null;
    }

    const [year, month] = entered.split('-');

    return { year: Number(year), month: Number(month) };
  },
};

/** The parts of a length of time, each asked for separately. */
const durationCodec: CustomTrackingValueCodec = {
  blank: () => ({ days: '', hours: '', minutes: '', seconds: '' }),
  fill: (_field, answer) => ({
    days: fragmentText(answer, 'days'),
    hours: fragmentText(answer, 'hours'),
    minutes: fragmentText(answer, 'minutes'),
    seconds: fragmentText(answer, 'seconds'),
  }),
  submit: value => {
    const parts = ['days', 'hours', 'minutes', 'seconds'];

    if (parts.every(part => textOf(value, part) === '')) {
      return null;
    }

    // A part the field does not ask for is sent as zero rather than left out.
    // The server takes all four and refuses a component it was not configured
    // to accept, so "no hours" and "zero hours" are the same statement here.
    return Object.fromEntries(
      parts.map(part => [part, Number(textOf(value, part) || '0')]),
    );
  },
};

/** A colour, named from the palette or given exactly. */
const colourCodec: CustomTrackingValueCodec = {
  blank: () => ({
    colourMode: CUSTOM_TRACKING_COLOUR_MODES.NONE,
    token: '',
    literal: '',
  }),
  fill: (_field, answer) => {
    const token = fragmentText(answer, 'token');
    const literal = fragmentText(answer, 'literal');

    return {
      colourMode:
        token === ''
          ? CUSTOM_TRACKING_COLOUR_MODES.LITERAL
          : CUSTOM_TRACKING_COLOUR_MODES.TOKEN,
      token,
      literal,
    };
  },
  submit: value => {
    const mode = textOf(value, 'colourMode');

    if (mode === CUSTOM_TRACKING_COLOUR_MODES.TOKEN) {
      return { token: textOf(value, 'token'), literal: null };
    }

    if (mode === CUSTOM_TRACKING_COLOUR_MODES.LITERAL) {
      return { token: null, literal: textOf(value, 'literal') };
    }

    return null;
  },
};

/** A YouTube video, entered as an address and stored as an identifier. */
const youTubeCodec: CustomTrackingValueCodec = {
  blank: () => ({ url: '' }),
  fill: (_field, answer) => {
    const videoId = fragmentText(answer, 'videoId');
    const startSeconds = fragmentText(answer, 'startSeconds');

    const start = startSeconds === '' ? null : Number(startSeconds);

    return {
      url: videoId === '' ? '' : youTubeAddress(videoId, start),
    };
  },
  submit: value => {
    const url = textOf(value, 'url');

    return url === '' ? null : { url };
  },
};

/**
 * A picture, which never travels in a record.
 *
 * It arrives as an upload and is checked as bytes before anything is stored,
 * so the editor sets it through its own endpoint and the record save leaves it
 * alone entirely. Sending a value for one is refused rather than ignored.
 */
const imageCodec: CustomTrackingValueCodec = {
  blank: () => ({}),
  fill: () => ({}),
  submit: () => null,
};

/**
 * How each field type is put into a form and taken back out of it.
 *
 * Several types share a codec because they differ only in how they are drawn.
 * A tick box and a switch both record yes or no; a radio group and a dropdown
 * both record one option from a list. Giving each its own identical codec
 * would state the same round trip twice and invite the two to drift.
 */
export const CUSTOM_TRACKING_VALUE_CODECS: Record<
  CustomTrackingFieldType,
  CustomTrackingValueCodec
> = {
  [CustomTrackingFieldType.TEXT_SINGLE_LINE]: textCodec('text'),
  [CustomTrackingFieldType.MARKDOWN]: textCodec('markdown'),
  [CustomTrackingFieldType.INTEGER]: numberCodec('integer'),
  // Decimals stay as they were typed all the way to the database. One that
  // passed through a JSON number would already have been rounded by the time
  // anything could check it.
  [CustomTrackingFieldType.DECIMAL]: textCodec('decimal'),
  [CustomTrackingFieldType.PERCENTAGE]: textCodec('decimal'),
  [CustomTrackingFieldType.RANGE]: numberCodec('number'),
  [CustomTrackingFieldType.RATING]: numberCodec('rating'),
  [CustomTrackingFieldType.PROGRESS]: progressCodec,
  [CustomTrackingFieldType.DATE]: textCodec('date'),
  [CustomTrackingFieldType.TIME]: timeCodec,
  [CustomTrackingFieldType.DATE_TIME]: dateTimeCodec,
  [CustomTrackingFieldType.MONTH_YEAR]: monthYearCodec,
  [CustomTrackingFieldType.YEAR]: numberCodec('year'),
  [CustomTrackingFieldType.DURATION]: durationCodec,
  [CustomTrackingFieldType.DATE_RANGE]: dateRangeCodec,
  [CustomTrackingFieldType.DATE_TIME_RANGE]: dateTimeRangeCodec,
  [CustomTrackingFieldType.TOGGLE]: booleanCodec,
  [CustomTrackingFieldType.CHECKBOX]: booleanCodec,
  [CustomTrackingFieldType.RADIO]: choiceCodec(true),
  [CustomTrackingFieldType.DROPDOWN]: choiceCodec(true),
  [CustomTrackingFieldType.CHECKBOX_LIST]: choiceCodec(false),
  [CustomTrackingFieldType.MULTI_SELECT]: choiceCodec(false),
  [CustomTrackingFieldType.TAGS]: choiceCodec(false),
  [CustomTrackingFieldType.YES_NO_UNKNOWN]: textCodec('triState'),
  [CustomTrackingFieldType.COLOUR]: colourCodec,
  [CustomTrackingFieldType.IMAGE]: imageCodec,
  [CustomTrackingFieldType.YOUTUBE]: youTubeCodec,
};

/**
 * What one field's controls hold when the record is opened.
 *
 * A field with a stored answer is filled from it. A field without one starts
 * from its defaults, which is the only moment a default may be applied: one
 * that overwrote a stored answer would discard something chosen deliberately.
 *
 * @param field - The field being answered.
 * @param answer - What is recorded against it, or undefined.
 * @returns The control values.
 */
export function valueFormFor(
  field: CustomTrackingField,
  answer: CustomTrackingStoredAnswer | undefined,
): CustomTrackingValueForm {
  const codec = CUSTOM_TRACKING_VALUE_CODECS[field.fieldType];

  return answer ? codec.fill(field, answer) : codec.blank(field);
}

/**
 * What is sent for one field, or null to clear its answer.
 *
 * @param field - The field being answered.
 * @param value - What its controls hold.
 * @returns The submitted value, or null.
 */
export function submissionFor(
  field: CustomTrackingField,
  value: CustomTrackingValueForm,
): Record<string, unknown> | null {
  return CUSTOM_TRACKING_VALUE_CODECS[field.fieldType].submit(value);
}

/**
 * Whether a field would be left unanswered by what its controls hold.
 *
 * Asked of the whole record before it is saved, because a required field is a
 * statement about the record rather than about one control. A picture is
 * checked against what is stored rather than against the form, since it is
 * uploaded on its own and never travels with the rest.
 *
 * @param field - The field being answered.
 * @param value - What its controls hold.
 * @param image - Whether a picture is stored, for an image field.
 * @returns True when nothing has been answered.
 */
export function isUnanswered(
  field: CustomTrackingField,
  value: CustomTrackingValueForm,
  image: boolean,
): boolean {
  return field.fieldType === CustomTrackingFieldType.IMAGE
    ? !image
    : submissionFor(field, value) === null;
}
