import {
  CustomTrackingDateFormat,
  CustomTrackingDurationFormat,
  CustomTrackingEmptyMode,
  CustomTrackingFieldCategory,
  CustomTrackingFieldType,
  CustomTrackingImageShape,
  CustomTrackingMonthYearFormat,
  CustomTrackingTimeFormat,
} from 'src/app/models/custom-tracking.models';

/**
 * The kind of control one setting is entered through.
 *
 * `DECIMAL` is deliberately separate from `NUMBER`. A decimal bound is carried
 * as a string all the way to the database, because a decimal that passes
 * through a JSON number has already been rounded by the time anything can
 * check it — and a bound that has been rounded is not a bound.
 */
export enum CustomTrackingSettingKind {
  NUMBER = 'NUMBER',
  DECIMAL = 'DECIMAL',
  TEXT = 'TEXT',
  DATE = 'DATE',
  TIMEZONE = 'TIMEZONE',
  CHOICE = 'CHOICE',
  BOOLEAN = 'BOOLEAN',
}

/**
 * Which published bound a setting is entered within.
 *
 * A name rather than a pair of numbers. The numbers come from the server, and
 * writing them down here as well would be a second statement of them that
 * could disagree — which reaches a user as a box that accepts what the server
 * then refuses.
 */
export enum CustomTrackingSettingBound {
  NONE = 'NONE',
  NUMERIC = 'NUMERIC',
  POSITIVE_NUMERIC = 'POSITIVE_NUMERIC',
  STEP_INTEGER = 'STEP_INTEGER',
  YEAR = 'YEAR',
  PRECISION = 'PRECISION',
  TEXT_MIN_LENGTH = 'TEXT_MIN_LENGTH',
  TEXT_MAX_LENGTH = 'TEXT_MAX_LENGTH',
  MARKDOWN_MAX_LENGTH = 'MARKDOWN_MAX_LENGTH',
  SELECTION_MINIMUM = 'SELECTION_MINIMUM',
  SELECTION_MAXIMUM = 'SELECTION_MAXIMUM',
  PATTERN_LENGTH = 'PATTERN_LENGTH',
  PLACEHOLDER_LENGTH = 'PLACEHOLDER_LENGTH',
}

/** One choice a `CHOICE` setting offers. */
export interface CustomTrackingSettingChoice {
  value: string;
  label: string;
}

/** One setting a field type carries, and how it is asked for. */
export interface CustomTrackingSettingDescriptor {
  /** The property name in the stored configuration. */
  readonly key: string;
  /** What the builder calls it. */
  readonly label: string;
  /** How it is entered. */
  readonly kind: CustomTrackingSettingKind;
  /** Which published bound it is entered within. */
  readonly bound: CustomTrackingSettingBound;
  /**
   * Whether the server demands a value.
   *
   * An optional setting left blank is sent as null, which is how "no bound at
   * all" is said. A required one has no such spelling, so the builder seeds it
   * with a default rather than offering a blank the server would refuse.
   */
  readonly required: boolean;
  /** A sentence explaining what it does, where the label cannot. */
  readonly hint?: string;
  /**
   * Whether a `NUMBER` setting accepts fractions.
   *
   * Most numeric settings count something — characters, decimal places, how
   * many options must be chosen — and half of one of those means nothing. The
   * ends of a slider and the figures of a progress field are the exceptions,
   * and the server accepts fractions only there.
   */
  readonly allowsFractions?: boolean;
  /** The fixed choices, for a `CHOICE` setting that has them. */
  readonly choices?: readonly CustomTrackingSettingChoice[];
  /**
   * Whether the choices come from the served rating maxima instead.
   *
   * The rating scales are the server's to decide, so they arrive with the
   * configuration rather than being written down twice.
   */
  readonly fromRatingMaxima?: boolean;
}

/** How a date is written out. */
const DATE_FORMAT_CHOICES: readonly CustomTrackingSettingChoice[] = [
  { value: CustomTrackingDateFormat.LONG, label: '4 September 2026' },
  { value: CustomTrackingDateFormat.SHORT, label: '04/09/2026' },
];

/** How a time is written out. */
const TIME_FORMAT_CHOICES: readonly CustomTrackingSettingChoice[] = [
  {
    value: CustomTrackingTimeFormat.LOCALE,
    label: 'However the reader reads times',
  },
  { value: CustomTrackingTimeFormat.TWENTY_FOUR_HOUR, label: '19:30' },
  { value: CustomTrackingTimeFormat.TWELVE_HOUR, label: '7:30 pm' },
];

/** How a month and year are written out. */
const MONTH_YEAR_FORMAT_CHOICES: readonly CustomTrackingSettingChoice[] = [
  { value: CustomTrackingMonthYearFormat.LONG, label: 'September 2026' },
  { value: CustomTrackingMonthYearFormat.SHORT, label: 'Sep 2026' },
  { value: CustomTrackingMonthYearFormat.NUMERIC, label: '09/2026' },
];

/** How a duration is written out. */
const DURATION_FORMAT_CHOICES: readonly CustomTrackingSettingChoice[] = [
  { value: CustomTrackingDurationFormat.COMPACT, label: '2d 4h 30m' },
  {
    value: CustomTrackingDurationFormat.LONG,
    label: '2 days, 4 hours, 30 minutes',
  },
];

/** The shape every picture answering an image field is cropped to. */
const IMAGE_SHAPE_CHOICES: readonly CustomTrackingSettingChoice[] = [
  { value: CustomTrackingImageShape.SQUARE, label: 'Square' },
  { value: CustomTrackingImageShape.LANDSCAPE, label: 'Landscape' },
  { value: CustomTrackingImageShape.PORTRAIT, label: 'Portrait' },
];

/** The placeholder shown in an empty editor, shared by text and Markdown. */
const PLACEHOLDER: CustomTrackingSettingDescriptor = {
  key: 'placeholder',
  label: 'Placeholder',
  kind: CustomTrackingSettingKind.TEXT,
  bound: CustomTrackingSettingBound.PLACEHOLDER_LENGTH,
  required: false,
  hint: 'Grey text shown in the empty editor. It is never saved as a value.',
};

/** The timezone the editor offers first, shared by the timed types. */
const DEFAULT_TIMEZONE: CustomTrackingSettingDescriptor = {
  key: 'defaultTimezone',
  label: 'Default timezone',
  kind: CustomTrackingSettingKind.TIMEZONE,
  bound: CustomTrackingSettingBound.NONE,
  required: true,
  hint: 'Where the editor starts. It can be overridden for one account or character.',
};

/** How the date part is written out, shared by the dated types. */
const DATE_FORMAT: CustomTrackingSettingDescriptor = {
  key: 'dateFormat',
  label: 'Date format',
  kind: CustomTrackingSettingKind.CHOICE,
  bound: CustomTrackingSettingBound.NONE,
  required: true,
  choices: DATE_FORMAT_CHOICES,
};

/** How the time part is written out, shared by the timed types. */
const TIME_FORMAT: CustomTrackingSettingDescriptor = {
  key: 'timeFormat',
  label: 'Time format',
  kind: CustomTrackingSettingKind.CHOICE,
  bound: CustomTrackingSettingBound.NONE,
  required: true,
  choices: TIME_FORMAT_CHOICES,
};

/** The earliest date accepted, shared by the dated types. */
const MINIMUM_DATE: CustomTrackingSettingDescriptor = {
  key: 'minimumDate',
  label: 'Earliest date',
  kind: CustomTrackingSettingKind.DATE,
  bound: CustomTrackingSettingBound.NONE,
  required: false,
};

/** The latest date accepted, shared by the dated types. */
const MAXIMUM_DATE: CustomTrackingSettingDescriptor = {
  key: 'maximumDate',
  label: 'Latest date',
  kind: CustomTrackingSettingKind.DATE,
  bound: CustomTrackingSettingBound.NONE,
  required: false,
};

/** How many options must and may be chosen, shared by the multiple types. */
const SELECTION_BOUNDS: readonly CustomTrackingSettingDescriptor[] = [
  {
    key: 'minimumSelections',
    label: 'Fewest choices',
    kind: CustomTrackingSettingKind.NUMBER,
    bound: CustomTrackingSettingBound.SELECTION_MINIMUM,
    required: false,
  },
  {
    key: 'maximumSelections',
    label: 'Most choices',
    kind: CustomTrackingSettingKind.NUMBER,
    bound: CustomTrackingSettingBound.SELECTION_MAXIMUM,
    required: false,
  },
];

/** How a decimal or percentage field is bounded and rounded. */
const DECIMAL_SETTINGS: readonly CustomTrackingSettingDescriptor[] = [
  {
    key: 'minimum',
    label: 'Smallest value',
    kind: CustomTrackingSettingKind.DECIMAL,
    bound: CustomTrackingSettingBound.NONE,
    required: false,
  },
  {
    key: 'maximum',
    label: 'Largest value',
    kind: CustomTrackingSettingKind.DECIMAL,
    bound: CustomTrackingSettingBound.NONE,
    required: false,
  },
  {
    key: 'precision',
    label: 'Decimal places',
    kind: CustomTrackingSettingKind.NUMBER,
    bound: CustomTrackingSettingBound.PRECISION,
    required: true,
    hint: 'How many places are kept. It decides how every value is stored, so choose it before recording anything.',
  },
  {
    key: 'step',
    label: 'Step',
    kind: CustomTrackingSettingKind.DECIMAL,
    bound: CustomTrackingSettingBound.NONE,
    required: false,
    hint: 'The interval values must fall on, counted from the smallest value.',
  },
];

/**
 * Which settings each field type carries, in the order they are asked for.
 *
 * Written down here because it is a question about the interface — which
 * controls to draw, what to call them, and in what order — rather than about
 * the data. The shapes themselves are the server's, and it validates every one
 * of them again; what this map must not do is name a setting the server does
 * not have, which is why an unrecognised property is refused there rather than
 * ignored.
 *
 * Several types share a list. A date range is bounded and written exactly as a
 * date is, and a tick-box list is bounded exactly as a multiple-select menu;
 * giving each its own identical list would state the same thing twice and
 * invite the two to drift apart.
 */
export const CUSTOM_TRACKING_FIELD_SETTINGS: Record<
  CustomTrackingFieldType,
  readonly CustomTrackingSettingDescriptor[]
> = {
  [CustomTrackingFieldType.TEXT_SINGLE_LINE]: [
    {
      key: 'minLength',
      label: 'Fewest characters',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.TEXT_MIN_LENGTH,
      required: false,
    },
    {
      key: 'maxLength',
      label: 'Most characters',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.TEXT_MAX_LENGTH,
      required: false,
    },
    {
      key: 'pattern',
      label: 'Pattern',
      kind: CustomTrackingSettingKind.TEXT,
      bound: CustomTrackingSettingBound.PATTERN_LENGTH,
      required: false,
      hint: 'A regular expression every value must match. Leave it empty unless you need one.',
    },
    PLACEHOLDER,
  ],
  [CustomTrackingFieldType.MARKDOWN]: [
    {
      key: 'maxLength',
      label: 'Most characters',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.MARKDOWN_MAX_LENGTH,
      required: false,
    },
    PLACEHOLDER,
  ],
  [CustomTrackingFieldType.INTEGER]: [
    {
      key: 'minimum',
      label: 'Smallest value',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.NUMERIC,
      required: false,
    },
    {
      key: 'maximum',
      label: 'Largest value',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.NUMERIC,
      required: false,
    },
    {
      key: 'step',
      label: 'Step',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.STEP_INTEGER,
      required: false,
      hint: 'The interval values must fall on, counted from the smallest value.',
    },
  ],
  [CustomTrackingFieldType.DECIMAL]: DECIMAL_SETTINGS,
  [CustomTrackingFieldType.PERCENTAGE]: DECIMAL_SETTINGS,
  [CustomTrackingFieldType.RANGE]: [
    {
      key: 'minimum',
      label: 'Left-hand end',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.NUMERIC,
      required: true,
      allowsFractions: true,
    },
    {
      key: 'maximum',
      label: 'Right-hand end',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.NUMERIC,
      required: true,
      allowsFractions: true,
    },
    {
      key: 'step',
      label: 'Step',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.POSITIVE_NUMERIC,
      required: true,
      allowsFractions: true,
      hint: 'The interval the handle moves in.',
    },
  ],
  [CustomTrackingFieldType.RATING]: [
    {
      key: 'maximum',
      label: 'Top of the scale',
      kind: CustomTrackingSettingKind.CHOICE,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
      fromRatingMaxima: true,
    },
  ],
  [CustomTrackingFieldType.PROGRESS]: [
    {
      key: 'minimum',
      label: 'Smallest current figure',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.NUMERIC,
      required: false,
      allowsFractions: true,
    },
    {
      key: 'maximum',
      label: 'Largest total',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.NUMERIC,
      required: false,
      allowsFractions: true,
    },
    {
      key: 'showPercentage',
      label: 'Also show a percentage',
      kind: CustomTrackingSettingKind.BOOLEAN,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
    },
    {
      key: 'showProgressBar',
      label: 'Also draw a bar',
      kind: CustomTrackingSettingKind.BOOLEAN,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
      hint: 'Both figures are stored whichever of these is on, so turning one off never loses anything.',
    },
  ],
  [CustomTrackingFieldType.DATE]: [MINIMUM_DATE, MAXIMUM_DATE, DATE_FORMAT],
  [CustomTrackingFieldType.TIME]: [DEFAULT_TIMEZONE, TIME_FORMAT],
  [CustomTrackingFieldType.DATE_TIME]: [
    DEFAULT_TIMEZONE,
    DATE_FORMAT,
    TIME_FORMAT,
  ],
  [CustomTrackingFieldType.MONTH_YEAR]: [
    {
      key: 'monthYearFormat',
      label: 'Format',
      kind: CustomTrackingSettingKind.CHOICE,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
      choices: MONTH_YEAR_FORMAT_CHOICES,
    },
  ],
  [CustomTrackingFieldType.YEAR]: [
    {
      key: 'minimumYear',
      label: 'Earliest year',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.YEAR,
      required: false,
    },
    {
      key: 'maximumYear',
      label: 'Latest year',
      kind: CustomTrackingSettingKind.NUMBER,
      bound: CustomTrackingSettingBound.YEAR,
      required: false,
    },
  ],
  [CustomTrackingFieldType.DURATION]: [
    {
      key: 'durationFormat',
      label: 'Format',
      kind: CustomTrackingSettingKind.CHOICE,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
      choices: DURATION_FORMAT_CHOICES,
    },
    {
      key: 'includeDays',
      label: 'Ask for days',
      kind: CustomTrackingSettingKind.BOOLEAN,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
    },
    {
      key: 'includeHours',
      label: 'Ask for hours',
      kind: CustomTrackingSettingKind.BOOLEAN,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
    },
    {
      key: 'includeMinutes',
      label: 'Ask for minutes',
      kind: CustomTrackingSettingKind.BOOLEAN,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
    },
    {
      key: 'includeSeconds',
      label: 'Ask for seconds',
      kind: CustomTrackingSettingKind.BOOLEAN,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
      hint: 'Only the parts you ask for are offered when a value is entered.',
    },
  ],
  [CustomTrackingFieldType.DATE_RANGE]: [
    MINIMUM_DATE,
    MAXIMUM_DATE,
    DATE_FORMAT,
  ],
  [CustomTrackingFieldType.DATE_TIME_RANGE]: [
    DEFAULT_TIMEZONE,
    DATE_FORMAT,
    TIME_FORMAT,
  ],
  [CustomTrackingFieldType.TOGGLE]: [],
  [CustomTrackingFieldType.CHECKBOX]: [],
  [CustomTrackingFieldType.RADIO]: [],
  [CustomTrackingFieldType.DROPDOWN]: [],
  [CustomTrackingFieldType.CHECKBOX_LIST]: SELECTION_BOUNDS,
  [CustomTrackingFieldType.MULTI_SELECT]: SELECTION_BOUNDS,
  [CustomTrackingFieldType.YES_NO_UNKNOWN]: [],
  [CustomTrackingFieldType.COLOUR]: [],
  [CustomTrackingFieldType.TAGS]: SELECTION_BOUNDS,
  [CustomTrackingFieldType.IMAGE]: [
    {
      key: 'shape',
      label: 'Crop shape',
      kind: CustomTrackingSettingKind.CHOICE,
      bound: CustomTrackingSettingBound.NONE,
      required: true,
      choices: IMAGE_SHAPE_CHOICES,
      hint: 'Fixed for every picture answering this field, so they line up with one another.',
    },
  ],
  [CustomTrackingFieldType.YOUTUBE]: [],
};

/**
 * What a required setting starts as when a field is created.
 *
 * Only the required ones appear. An optional setting has a spelling for "no
 * bound at all" — null — and a builder that seeded it with a number would be
 * inventing a constraint the user never asked for.
 *
 * The rating scale and the default timezone are absent deliberately: one comes
 * from the served bounds and the other from the reader's own clock, so neither
 * can be written down here.
 */
export const CUSTOM_TRACKING_SETTING_DEFAULTS: Readonly<
  Record<string, string | number | boolean>
> = {
  precision: 2,
  minimum: 0,
  maximum: 10,
  step: 1,
  showPercentage: true,
  showProgressBar: true,
  dateFormat: CustomTrackingDateFormat.LONG,
  timeFormat: CustomTrackingTimeFormat.LOCALE,
  monthYearFormat: CustomTrackingMonthYearFormat.LONG,
  durationFormat: CustomTrackingDurationFormat.COMPACT,
  includeDays: false,
  includeHours: true,
  includeMinutes: true,
  includeSeconds: false,
  shape: CustomTrackingImageShape.SQUARE,
};

/**
 * What each grouping of field types is called.
 *
 * The catalogue says which group a type belongs to; what that group is called
 * to a reader is a question about this interface, so it is answered here.
 */
export const CUSTOM_TRACKING_CATEGORY_LABELS: Record<
  CustomTrackingFieldCategory,
  string
> = {
  [CustomTrackingFieldCategory.TEXT]: 'Text',
  [CustomTrackingFieldCategory.NUMBER]: 'Numbers',
  [CustomTrackingFieldCategory.DATE_TIME]: 'Dates and times',
  [CustomTrackingFieldCategory.BOOLEAN]: 'Yes or no',
  [CustomTrackingFieldCategory.CHOICE]: 'Choices',
  [CustomTrackingFieldCategory.MEDIA]: 'Pictures and video',
};

/**
 * What a viewer sees where a field has no value.
 *
 * The same three modes are offered for the owner and for the public, and are
 * chosen independently: somebody may well want a reminder of what they have
 * not filled in yet without publishing the gap.
 */
export const CUSTOM_TRACKING_EMPTY_MODE_CHOICES: readonly CustomTrackingSettingChoice[] =
  [
    {
      value: CustomTrackingEmptyMode.HIDE,
      label: 'Hide the field entirely',
    },
    {
      value: CustomTrackingEmptyMode.SHOW_LABEL,
      label: 'Show the name with nothing after it',
    },
    {
      value: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
      label: 'Show the name and a placeholder',
    },
  ];
