import {
  CustomTrackingDateFormat,
  CustomTrackingDurationFormat,
  CustomTrackingFieldType,
  CustomTrackingMonthYearFormat,
  CustomTrackingPaletteColour,
  CustomTrackingTimeFormat,
  CustomTrackingTriState,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingDisplayField } from './custom-tracking-display.models';
import { localDateTimeIn, timezoneOf } from './custom-tracking-time.utility';

/**
 * How one answer is drawn.
 *
 * Most types come down to a line of text, and saying so once keeps the
 * template from carrying twenty-seven branches. The six that genuinely are not
 * text — a passage of Markdown, a bar, a swatch, a picture, a video, a set of
 * labels — are named here so the template can ask one question rather than
 * test the field type in six places.
 */
export type CustomTrackingAnswerShape =
  | 'text'
  | 'markdown'
  | 'progress'
  | 'colour'
  | 'image'
  | 'video'
  | 'choices'
  | 'rating';

/** How far through something a progress answer is. */
export interface CustomTrackingProgressReading {
  current: number;
  maximum: number;
  /** The percentage, where the field asks for one and it can be computed. */
  percentage: number | null;
  /** Whether the field asks for a bar as well as the figures. */
  showBar: boolean;
  /** How far along the bar sits, as a percentage of its width. */
  fraction: number;
}

/** A colour answer, as a swatch is drawn from it. */
export interface CustomTrackingColourReading {
  /**
   * The CSS colour to paint, or null where none can be resolved.
   *
   * Null rather than a guess. A palette colour is painted through the custom
   * property the served palette names, and where the palette has not arrived —
   * or no longer carries the token — the answer is still shown by name. A
   * property name assembled from the token here would be a second statement of
   * something the palette already says, and the two would eventually differ.
   */
  css: string | null;
  /** What to call it: the palette's own name, or the literal itself. */
  label: string;
}

/** A rating answer, as a row of marks is drawn from it. */
export interface CustomTrackingRatingReading {
  score: number;
  maximum: number;
  /** One entry per mark on the scale, true where the mark is filled. */
  marks: boolean[];
}

/** A video answer, as it is offered before anybody asks to play it. */
export interface CustomTrackingVideoReading {
  videoId: string;
  startSeconds: number | null;
  /** The still, served from a host that sets no cookies. */
  thumbnailUrl: string;
  /** Where to watch it away from the site. */
  watchUrl: string;
}

/** The eleven characters a YouTube identifier is made of, and nothing else. */
const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;

/** What each shape of duration component is called when written out. */
const DURATION_UNITS = [
  { key: 'days', short: 'd', long: 'day' },
  { key: 'hours', short: 'h', long: 'hour' },
  { key: 'minutes', short: 'm', long: 'minute' },
  { key: 'seconds', short: 's', long: 'second' },
] as const;

/** What each tri-state answer is called. */
const TRI_STATE_WORDS: Record<CustomTrackingTriState, string> = {
  [CustomTrackingTriState.YES]: 'Yes',
  [CustomTrackingTriState.NO]: 'No',
  [CustomTrackingTriState.UNKNOWN]: 'Not known',
};

/** The types whose answer is a list of labels rather than a line of text. */
const CHOICE_TYPES = new Set<CustomTrackingFieldType>([
  CustomTrackingFieldType.RADIO,
  CustomTrackingFieldType.DROPDOWN,
  CustomTrackingFieldType.CHECKBOX_LIST,
  CustomTrackingFieldType.MULTI_SELECT,
  CustomTrackingFieldType.TAGS,
]);

/** The shape each type that is not a line of text is drawn as. */
const SHAPES: Partial<
  Record<CustomTrackingFieldType, CustomTrackingAnswerShape>
> = {
  [CustomTrackingFieldType.MARKDOWN]: 'markdown',
  [CustomTrackingFieldType.PROGRESS]: 'progress',
  [CustomTrackingFieldType.COLOUR]: 'colour',
  [CustomTrackingFieldType.IMAGE]: 'image',
  [CustomTrackingFieldType.YOUTUBE]: 'video',
  [CustomTrackingFieldType.RATING]: 'rating',
};

/**
 * How a field's answer is drawn.
 *
 * @param field - The field being drawn.
 * @returns The shape the template should render.
 */
export function answerShape(
  field: CustomTrackingDisplayField,
): CustomTrackingAnswerShape {
  if (CHOICE_TYPES.has(field.fieldType)) {
    return 'choices';
  }

  return SHAPES[field.fieldType] ?? 'text';
}

/**
 * Writes a field's answer out as a line of text.
 *
 * Every type that is genuinely one line lands here, so a page shows the same
 * words whichever surface it is on. A type drawn some other way returns an
 * empty string rather than a guess: the template asked the wrong question, and
 * inventing an answer would hide that.
 *
 * @param field - The field being drawn.
 * @returns The answer, or an empty string.
 */
export function answerText(field: CustomTrackingDisplayField): string {
  const value = field.value;

  if (!field.answered || value === null) {
    return '';
  }

  return writeAnswer(field, value);
}

/**
 * Writes out the one answer a text-shaped field holds.
 *
 * @param field - The field being drawn.
 * @param value - Its stored fragment.
 * @returns The answer, or an empty string.
 */
function writeAnswer(
  field: CustomTrackingDisplayField,
  value: Record<string, unknown>,
): string {
  const writer = WRITERS[field.fieldType];

  return writer ? writer(value, field.configuration) : '';
}

/**
 * How far through something a progress answer is.
 *
 * Both figures come from the value rather than from the field, because a user
 * who later raises the configured ceiling must not find every figure they
 * already recorded silently restated against the new total.
 *
 * @param field - The field being drawn.
 * @returns The reading, or null where nothing is recorded.
 */
export function progressReading(
  field: CustomTrackingDisplayField,
): CustomTrackingProgressReading | null {
  const value = field.value;

  if (!field.answered || value === null) {
    return null;
  }

  const current = numberFrom(value['current']);
  const maximum = numberFrom(value['maximum']);
  const fraction = maximum > 0 ? Math.min(100, (current / maximum) * 100) : 0;

  return {
    current,
    maximum,
    percentage:
      field.configuration['showPercentage'] === true && maximum > 0
        ? Math.round(fraction)
        : null,
    showBar: field.configuration['showProgressBar'] === true,
    fraction,
  };
}

/**
 * The colour a colour answer records.
 *
 * A palette name resolves through the custom property that palette publishes,
 * so a colour recorded as one of the site's own stays that colour if the
 * palette is ever adjusted. A literal is painted as given, because it is
 * somebody's own exact shade and no shared palette speaks for it.
 *
 * @param field - The field being drawn.
 * @param palette - The colours the server offers by name.
 * @returns The reading, or null where nothing is recorded.
 */
export function colourReading(
  field: CustomTrackingDisplayField,
  palette: readonly CustomTrackingPaletteColour[],
): CustomTrackingColourReading | null {
  const value = field.value;

  if (!field.answered || value === null) {
    return null;
  }

  const token = textFrom(value['token']);
  const literal = textFrom(value['literal']);

  if (token !== '') {
    const named = palette.find(colour => colour.token === token);

    return named
      ? { css: `var(${named.cssVariable})`, label: named.label }
      : { css: null, label: sentenceCase(token) };
  }

  return literal === '' ? null : { css: literal, label: literal };
}

/**
 * The marks a rating answer fills in.
 *
 * @param field - The field being drawn.
 * @returns The reading, or null where nothing is recorded.
 */
export function ratingReading(
  field: CustomTrackingDisplayField,
): CustomTrackingRatingReading | null {
  const value = field.value;

  if (!field.answered || value === null) {
    return null;
  }

  const score = numberFrom(value['rating']);
  const maximum = Math.max(numberFrom(field.configuration['maximum']), score);

  return {
    score,
    maximum,
    marks: Array.from({ length: maximum }, (_mark, index) => index < score),
  };
}

/**
 * The video a YouTube answer records.
 *
 * The identifier is checked against the eleven characters one is made of
 * before any address is built from it. It arrived from the server's own parser
 * and should never be anything else, but an address assembled from a stored
 * string is exactly the place where "should never" stops being good enough.
 *
 * @param field - The field being drawn.
 * @returns The reading, or null where nothing usable is recorded.
 */
export function videoReading(
  field: CustomTrackingDisplayField,
): CustomTrackingVideoReading | null {
  const value = field.value;

  if (!field.answered || value === null) {
    return null;
  }

  const videoId = textFrom(value['videoId']);

  if (!YOUTUBE_ID_PATTERN.test(videoId)) {
    return null;
  }

  const startSeconds = value['startSeconds'];
  const start = typeof startSeconds === 'number' ? startSeconds : null;

  return {
    videoId,
    startSeconds: start,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}${
      start === null ? '' : `&t=${start}s`
    }`,
  };
}

/**
 * Reads a stored property as a number.
 *
 * @param held - What is stored.
 * @returns The number, or zero.
 */
function numberFrom(held: unknown): number {
  return typeof held === 'number' ? held : 0;
}

/**
 * Reads a stored property as text.
 *
 * @param held - What is stored.
 * @returns The text, or an empty string.
 */
function textFrom(held: unknown): string {
  return typeof held === 'string' ? held : '';
}

/**
 * Writes a palette token out the way a person reads it.
 *
 * @param token - The stored token, in upper case with underscores.
 * @returns The name, capitalised once.
 */
function sentenceCase(token: string): string {
  const words = token.toLowerCase().replaceAll('_', ' ');

  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Writes a calendar date out.
 *
 * Read in UTC deliberately. A date has no time and no timezone, so reading it
 * anywhere else would move it a day for half the world.
 *
 * @param date - The stored date, as `YYYY-MM-DD`.
 * @param format - How the definition asks for it.
 * @returns The written date, or an empty string.
 */
function writeDate(date: string, format: unknown): string {
  if (date === '') {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: format === CustomTrackingDateFormat.SHORT ? 'short' : 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * Writes a wall-clock time out.
 *
 * @param time - The stored time, as `HH:mm`.
 * @param format - How the definition asks for it.
 * @returns The written time, or an empty string.
 */
function writeTime(time: string, format: unknown): string {
  if (time === '') {
    return '';
  }

  if (format === CustomTrackingTimeFormat.TWENTY_FOUR_HOUR) {
    return time;
  }

  const instant = new Date(`1970-01-01T${time}:00Z`);

  return new Intl.DateTimeFormat(
    format === CustomTrackingTimeFormat.TWELVE_HOUR ? 'en-GB' : undefined,
    {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12:
        format === CustomTrackingTimeFormat.TWELVE_HOUR ? true : undefined,
    },
  ).format(instant);
}

/**
 * Writes a stored instant out as the local date and time it was entered as.
 *
 * @param instant - The stored instant.
 * @param timezone - The timezone it was entered in.
 * @param configuration - The field's configuration.
 * @returns The written date and time.
 */
function writeInstant(
  instant: string,
  timezone: string,
  configuration: Record<string, unknown>,
): string {
  const [date, time] = localDateTimeIn(instant, timezone).split('T');

  return `${writeDate(date, configuration['dateFormat'])}, ${writeTime(
    time,
    configuration['timeFormat'],
  )}`;
}

/**
 * Writes a length of time out from the components it was entered as.
 *
 * Only the components the field asks for, because a duration measured in days
 * and hours should not report seconds it was never given. A duration whose
 * every component is zero still says so, using the smallest component asked
 * for — zero is an answer, and blanking it would make it look like none.
 *
 * @param value - The stored components.
 * @param configuration - Which components the field asks for, and how they are
 *   written.
 * @returns The written duration.
 */
function writeDuration(
  value: Record<string, unknown>,
  configuration: Record<string, unknown>,
): string {
  const long =
    configuration['durationFormat'] === CustomTrackingDurationFormat.LONG;

  const included = DURATION_UNITS.filter(
    unit =>
      configuration[
        `include${unit.key.charAt(0).toUpperCase()}${unit.key.slice(1)}`
      ] === true,
  );

  const asked = included.length > 0 ? included : DURATION_UNITS.slice();
  const written = asked
    .filter(unit => numberFrom(value[unit.key]) !== 0)
    .map(unit => writeDurationPart(numberFrom(value[unit.key]), unit, long));

  if (written.length > 0) {
    return written.join(long ? ', ' : ' ');
  }

  const smallest = included.at(-1) ?? DURATION_UNITS[3];

  return writeDurationPart(0, smallest, long);
}

/**
 * Writes one component of a duration.
 *
 * @param amount - How many of the unit.
 * @param unit - The unit.
 * @param unit.short - Its abbreviation.
 * @param unit.long - Its name.
 * @param long - Whether the unit is spelled out.
 * @returns The written component.
 */
function writeDurationPart(
  amount: number,
  unit: { short: string; long: string },
  long: boolean,
): string {
  const suffix = amount === 1 ? '' : 's';
  return long ? `${amount} ${unit.long}${suffix}` : `${amount}${unit.short}`;
}

/**
 * Writes a month and year out.
 *
 * @param value - The stored month and year.
 * @param configuration - How the definition asks for it.
 * @returns The written month and year.
 */
function writeMonthYear(
  value: Record<string, unknown>,
  configuration: Record<string, unknown>,
): string {
  const year = numberFrom(value['year']);
  const month = numberFrom(value['month']);
  const format = configuration['monthYearFormat'];

  if (format === CustomTrackingMonthYearFormat.NUMERIC) {
    return `${String(month).padStart(2, '0')}/${year}`;
  }

  const written = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    month: format === CustomTrackingMonthYearFormat.SHORT ? 'short' : 'long',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return `${written} ${year}`;
}

/**
 * How each text-shaped field type writes its answer out.
 *
 * A table rather than a switch, so a type that is added and forgotten renders
 * as nothing at all rather than as whichever branch happened to fall through
 * to it.
 */
const WRITERS: Partial<
  Record<
    CustomTrackingFieldType,
    (
      value: Record<string, unknown>,
      configuration: Record<string, unknown>,
    ) => string
  >
> = {
  [CustomTrackingFieldType.TEXT_SINGLE_LINE]: value => textFrom(value['text']),
  [CustomTrackingFieldType.INTEGER]: value =>
    String(numberFrom(value['integer'])),
  [CustomTrackingFieldType.DECIMAL]: value => textFrom(value['decimal']),
  [CustomTrackingFieldType.PERCENTAGE]: value =>
    `${textFrom(value['decimal'])}%`,
  [CustomTrackingFieldType.RANGE]: value => String(numberFrom(value['number'])),
  [CustomTrackingFieldType.YEAR]: value => String(numberFrom(value['year'])),
  [CustomTrackingFieldType.DATE]: (value, configuration) =>
    writeDate(textFrom(value['date']), configuration['dateFormat']),
  [CustomTrackingFieldType.DATE_RANGE]: (value, configuration) =>
    `${writeDate(textFrom(value['startDate']), configuration['dateFormat'])} – ${writeDate(textFrom(value['endDate']), configuration['dateFormat'])}`,
  [CustomTrackingFieldType.TIME]: (value, configuration) =>
    `${writeTime(textFrom(value['time']), configuration['timeFormat'])} (${textFrom(value['timezone']) || timezoneOf(configuration)})`,
  [CustomTrackingFieldType.DATE_TIME]: (value, configuration) => {
    const timezone = textFrom(value['timezone']) || timezoneOf(configuration);

    return `${writeInstant(textFrom(value['instant']), timezone, configuration)} (${timezone})`;
  },
  [CustomTrackingFieldType.DATE_TIME_RANGE]: (value, configuration) => {
    const timezone = textFrom(value['timezone']) || timezoneOf(configuration);

    return `${writeInstant(textFrom(value['startInstant']), timezone, configuration)} – ${writeInstant(textFrom(value['endInstant']), timezone, configuration)} (${timezone})`;
  },
  [CustomTrackingFieldType.MONTH_YEAR]: writeMonthYear,
  [CustomTrackingFieldType.DURATION]: writeDuration,
  [CustomTrackingFieldType.TOGGLE]: value =>
    value['boolean'] === true ? 'Yes' : 'No',
  [CustomTrackingFieldType.CHECKBOX]: value =>
    value['boolean'] === true ? 'Yes' : 'No',
  [CustomTrackingFieldType.YES_NO_UNKNOWN]: value =>
    TRI_STATE_WORDS[value['triState'] as CustomTrackingTriState] ?? '',
};

/**
 * The Markdown a field holds, as its source.
 *
 * @param field - The field being drawn.
 * @returns The source, or an empty string.
 */
export function markdownSource(field: CustomTrackingDisplayField): string {
  return field.answered && field.value !== null
    ? textFrom(field.value['markdown'])
    : '';
}
