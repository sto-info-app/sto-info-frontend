/**
 * Which kind of STO record a custom definition describes.
 *
 * A definition belongs to a scope rather than to one record: an account-scoped
 * section appears against every STO Account its owner has, and a
 * character-scoped one against every Character. The scope is chosen when a
 * section is created and can never change, because every value beneath it
 * hangs off an Account or a Character and the other scope has no row to move
 * those values to.
 */
export enum CustomTrackingTargetScope {
  ACCOUNT = 'ACCOUNT',
  CHARACTER = 'CHARACTER',
}

/**
 * The kind of answer a custom field asks for.
 *
 * Chosen once and never changed. The type decides how every value already
 * recorded against the field is stored, validated and rendered, so changing it
 * would reinterpret data the user cannot get back.
 */
export enum CustomTrackingFieldType {
  TEXT_SINGLE_LINE = 'TEXT_SINGLE_LINE',
  MARKDOWN = 'MARKDOWN',
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  PERCENTAGE = 'PERCENTAGE',
  RANGE = 'RANGE',
  RATING = 'RATING',
  PROGRESS = 'PROGRESS',
  DATE = 'DATE',
  TIME = 'TIME',
  DATE_TIME = 'DATE_TIME',
  MONTH_YEAR = 'MONTH_YEAR',
  YEAR = 'YEAR',
  DURATION = 'DURATION',
  DATE_RANGE = 'DATE_RANGE',
  DATE_TIME_RANGE = 'DATE_TIME_RANGE',
  TOGGLE = 'TOGGLE',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  DROPDOWN = 'DROPDOWN',
  CHECKBOX_LIST = 'CHECKBOX_LIST',
  MULTI_SELECT = 'MULTI_SELECT',
  YES_NO_UNKNOWN = 'YES_NO_UNKNOWN',
  COLOUR = 'COLOUR',
  TAGS = 'TAGS',
  IMAGE = 'IMAGE',
  YOUTUBE = 'YOUTUBE',
}

/** How a date is written out. */
export enum CustomTrackingDateFormat {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

/** How a time is written out. */
export enum CustomTrackingTimeFormat {
  LOCALE = 'LOCALE',
  TWENTY_FOUR_HOUR = 'TWENTY_FOUR_HOUR',
  TWELVE_HOUR = 'TWELVE_HOUR',
}

/** How a month and year are written out. */
export enum CustomTrackingMonthYearFormat {
  LONG = 'LONG',
  SHORT = 'SHORT',
  NUMERIC = 'NUMERIC',
}

/** How a duration is written out. */
export enum CustomTrackingDurationFormat {
  COMPACT = 'COMPACT',
  LONG = 'LONG',
}

/** The three answers a yes/no/unknown field offers. */
export enum CustomTrackingTriState {
  YES = 'YES',
  NO = 'NO',
  UNKNOWN = 'UNKNOWN',
}

/** What a viewer sees where a field has no value. */
export enum CustomTrackingEmptyMode {
  HIDE = 'HIDE',
  SHOW_LABEL = 'SHOW_LABEL',
  SHOW_PLACEHOLDER = 'SHOW_PLACEHOLDER',
}

/** The shape an image field's picture is cropped to. */
export enum CustomTrackingImageShape {
  SQUARE = 'SQUARE',
  LANDSCAPE = 'LANDSCAPE',
  PORTRAIT = 'PORTRAIT',
}

/** The grouping a field type is offered under. */
export enum CustomTrackingFieldCategory {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE_TIME = 'DATE_TIME',
  BOOLEAN = 'BOOLEAN',
  CHOICE = 'CHOICE',
  MEDIA = 'MEDIA',
}

/** Where a field type's default comes from. */
export enum CustomTrackingDefaultSource {
  NONE = 'NONE',
  VALUE_FRAGMENT = 'VALUE_FRAGMENT',
  OPTIONS = 'OPTIONS',
}

/** An answer a choice or tags field offers. */
export interface CustomTrackingOption {
  id: string;
  fieldId: string;
  label: string;
  orderIndex: number;
  isDefault: boolean;
  /**
   * Whether the option has been withdrawn.
   *
   * A withdrawn option still appears, because a value that already chose it
   * has to go on reading correctly and the editor offering to replace it has
   * to be able to say what it was. It cannot be chosen afresh.
   */
  withdrawn: boolean;
}

/** One question asked of each Account or Character. */
export interface CustomTrackingField {
  id: string;
  tabId: string;
  fieldType: CustomTrackingFieldType;
  name: string;
  description: string | null;
  orderIndex: number;
  publiclyVisible: boolean;
  required: boolean;
  ownerEmptyMode: CustomTrackingEmptyMode;
  publicEmptyMode: CustomTrackingEmptyMode;
  emptyPlaceholder: string | null;
  configuration: Record<string, unknown>;
  suppressed: boolean;
  options: CustomTrackingOption[];
}

/** A group of fields within a section. */
export interface CustomTrackingTab {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  orderIndex: number;
  publiclyVisible: boolean;
  suppressed: boolean;
}

/** The outermost grouping, and the only level that names a scope. */
export interface CustomTrackingSection {
  id: string;
  targetScope: CustomTrackingTargetScope;
  name: string;
  description: string | null;
  orderIndex: number;
  publiclyVisible: boolean;
  suppressed: boolean;
}

/** A tab with the fields inside it. */
export interface CustomTrackingTabTree extends CustomTrackingTab {
  fields: CustomTrackingField[];
}

/** A section with the tabs inside it. */
export interface CustomTrackingSectionTree extends CustomTrackingSection {
  tabs: CustomTrackingTabTree[];
}

/** One of the user's STO records, as somewhere to record against. */
export interface CustomTrackingTarget {
  scope: CustomTrackingTargetScope;
  id: string;
  label: string;
  publiclyVisible: boolean;
}

/** The picture answering an image field. */
export interface CustomTrackingImageAnswer {
  imageId: string;
  altText: string;
  shape: CustomTrackingImageShape;
}

/** One field's answer, as it stands. */
export interface CustomTrackingStoredAnswer {
  fieldId: string;
  value: Record<string, unknown> | null;
  optionIds: string[];
  image: CustomTrackingImageAnswer | null;
}

/** Everything needed to edit one record. */
export interface CustomTrackingRecord {
  target: CustomTrackingTarget;
  sections: CustomTrackingSectionTree[];
  answers: CustomTrackingStoredAnswer[];
}

/** One option a public value chose. */
export interface CustomTrackingPublicChoice {
  id: string;
  label: string;
}

/**
 * A publicly visible field and what is recorded against it.
 *
 * Not the same shape as the owner's field. The empty mode has already been
 * resolved to the public one, the options are only those the value chose, and
 * a field the visitor may not see is absent rather than present and blank —
 * every one of those decisions was taken by the server, which is the only
 * place they can be taken safely.
 */
export interface CustomTrackingPublicField {
  id: string;
  fieldType: CustomTrackingFieldType;
  name: string;
  description: string | null;
  configuration: Record<string, unknown>;
  emptyMode: CustomTrackingEmptyMode;
  emptyPlaceholder: string | null;
  value: Record<string, unknown> | null;
  chosen: CustomTrackingPublicChoice[];
  image: CustomTrackingImageAnswer | null;
}

/** A publicly visible tab and the fields left in it. */
export interface CustomTrackingPublicTab {
  id: string;
  name: string;
  description: string | null;
  fields: CustomTrackingPublicField[];
}

/** A publicly visible section and the tabs left in it. */
export interface CustomTrackingPublicSection {
  id: string;
  name: string;
  description: string | null;
  tabs: CustomTrackingPublicTab[];
}

/** One field's answer, as it is submitted. */
export interface CustomTrackingAnswerSubmission {
  fieldId: string;
  /**
   * What was entered, or null to clear the answer.
   *
   * Its shape depends on the field's type. The server checks it against the
   * type the field actually has, never against anything the request asserts.
   */
  value: Record<string, unknown> | null;
}

/** What the server knows about one field type. */
export interface CustomTrackingFieldTypeDescription {
  fieldType: CustomTrackingFieldType;
  label: string;
  description: string;
  category: CustomTrackingFieldCategory;
  usesOptions: boolean;
  allowsMultipleOptions: boolean;
  defaultSource: CustomTrackingDefaultSource;
  usesTimezone: boolean;
  /**
   * Whether a field of this type may demand an answer.
   *
   * False for the types drawn as a control that always shows one of its two
   * positions. A switch cannot look unanswered, so requiring an answer of one
   * would be a rule nobody reading the record could tell was being kept.
   */
  allowsRequired: boolean;
}

/** One of the site's own colours, offered by name. */
export interface CustomTrackingPaletteColour {
  token: string;
  label: string;
  /**
   * The CSS custom property the colour is rendered through.
   *
   * A name rather than a colour. Rendering through the property is what makes
   * a value recorded against a palette colour follow the palette if it is ever
   * adjusted.
   */
  cssVariable: string;
}

/** Which parts of the feature are available. */
export interface CustomTrackingFeatureState {
  isEnabled: boolean;
  publicReadEnabled: boolean;
  definitionEditingEnabled: boolean;
  valueEditingEnabled: boolean;
  imagesEnabled: boolean;
  youTubeEnabled: boolean;
}

/**
 * The ceilings the interface warns against.
 *
 * Served rather than compiled in, because the server is authoritative about
 * them and a second copy here could disagree — which would show up as a form
 * that accepts what the server then refuses.
 */
export interface CustomTrackingLimits {
  MAX_SECTIONS_PER_SCOPE: number;
  MAX_TABS_PER_SECTION: number;
  MAX_FIELDS_PER_TAB: number;
  MAX_FIELDS_PER_SCOPE: number;
  MAX_FIELDS_PER_SCOPE_INCLUDING_DELETED: number;
  MAX_LABEL_LENGTH: number;
  MAX_DESCRIPTION_LENGTH: number;
  MAX_TEXT_VALUE_LENGTH: number;
  MAX_MARKDOWN_VALUE_LENGTH: number;
  MAX_OPTIONS_PER_FIELD: number;
  MAX_TAGS_PER_VALUE: number;
  MAX_TAG_LENGTH: number;
  MAX_IMAGE_ALT_LENGTH: number;
  MAX_PLACEHOLDER_LENGTH: number;
}

/**
 * The bounds one field type's own settings are chosen within.
 *
 * Served for the same reason the structural limits are. The builder has to
 * offer a rating scale and bound a year box, and a second copy of either here
 * would be a second statement that could disagree with the server.
 */
export interface CustomTrackingFieldBounds {
  RATING_MAXIMA: number[];
  MAX_DECIMAL_PRECISION: number;
  MAX_NUMERIC_MAGNITUDE: number;
  MIN_YEAR: number;
  MAX_YEAR: number;
  MAX_PATTERN_LENGTH: number;
}

/**
 * One shape a picture may be cropped to.
 *
 * Served for the same reason the bounds are. A cropper locked to a ratio the
 * server does not hold the picture to refuses an upload only after somebody
 * has chosen and framed it, and a delivery variant written down twice is one
 * rename away from a broken picture that reports no error at all.
 */
export interface CustomTrackingImageShapeSpec {
  shape: CustomTrackingImageShape;
  label: string;
  aspectWidth: number;
  aspectHeight: number;
  minimumWidth: number;
  minimumHeight: number;
  outputFormat: 'png' | 'jpeg';
  variant: string;
}

/** Everything the interface needs before it can draw anything. */
export interface CustomTrackingConfiguration {
  features: CustomTrackingFeatureState;
  fieldTypes: CustomTrackingFieldTypeDescription[];
  palette: CustomTrackingPaletteColour[];
  limits: CustomTrackingLimits;
  fieldBounds: CustomTrackingFieldBounds;
  imageShapes: CustomTrackingImageShapeSpec[];
}

/** One part of the content agreement. */
export interface CustomTrackingAgreementSection {
  heading: string | null;
  paragraphs: string[];
  bullets: string[];
}

/** The content agreement a user reads before accepting it. */
export interface CustomTrackingAgreement {
  version: string;
  effectiveDate: string;
  updatedDate: string;
  title: string;
  sections: CustomTrackingAgreementSection[];
}

/** Where a user stands with the content agreement. */
export interface CustomTrackingPolicyStatus {
  currentVersion: string;
  effectiveDate: string;
  updatedDate: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  /**
   * Whether acceptance is needed before anything may be created or changed.
   *
   * Reading is never gated: a user whose acceptance has been superseded keeps
   * full sight of everything they have already recorded.
   */
  acceptanceRequired: boolean;
}

/** What deleting a definition would take with it. */
export interface CustomTrackingDeletionImpact {
  tabs: number;
  fields: number;
  /**
   * Answers recorded against the fields going with it, across every record.
   *
   * The number that matters most in a confirmation. Definitions can be typed
   * again; the answers somebody recorded against forty characters cannot.
   */
  values: number;
}
