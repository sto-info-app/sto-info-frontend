import {
  CustomTrackingConfiguration,
  CustomTrackingEmptyMode,
  CustomTrackingField,
  CustomTrackingFieldType,
  CustomTrackingImageShape,
  CustomTrackingOption,
  CustomTrackingStoredAnswer,
} from 'src/app/models/custom-tracking.models';

/**
 * A field, as the tests answering one need it.
 *
 * Written once and shared, because every spec around the value editor needs a
 * field and each of them only cares about two or three of its properties. A
 * builder per spec would be the same fifteen lines repeated with the
 * interesting bit buried in the middle.
 *
 * @param overrides - Whatever the test actually cares about.
 * @returns The field.
 */
export function aField(
  overrides: Partial<CustomTrackingField> = {},
): CustomTrackingField {
  return {
    id: 'field-1',
    tabId: 'tab-1',
    fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
    name: 'Ship name',
    description: null,
    orderIndex: 1000,
    publiclyVisible: false,
    required: false,
    ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
    publicEmptyMode: CustomTrackingEmptyMode.HIDE,
    emptyPlaceholder: null,
    configuration: {},
    suppressed: false,
    options: [],
    ...overrides,
  };
}

/**
 * An option a choice field offers.
 *
 * @param overrides - Whatever the test actually cares about.
 * @returns The option.
 */
export function anOption(
  overrides: Partial<CustomTrackingOption>,
): CustomTrackingOption {
  return {
    id: 'option-1',
    fieldId: 'field-1',
    label: 'Escort',
    orderIndex: 1000,
    isDefault: false,
    withdrawn: false,
    ...overrides,
  };
}

/**
 * What is recorded against a field.
 *
 * @param overrides - Whatever the test actually cares about.
 * @returns The stored answer.
 */
export function anAnswer(
  overrides: Partial<CustomTrackingStoredAnswer> = {},
): CustomTrackingStoredAnswer {
  return {
    fieldId: 'field-1',
    value: null,
    optionIds: [],
    image: null,
    ...overrides,
  };
}

/**
 * The configuration, as the server publishes it.
 *
 * @param overrides - Whatever the test actually cares about.
 * @returns The configuration.
 */
export function aConfiguration(
  overrides: Partial<CustomTrackingConfiguration> = {},
): CustomTrackingConfiguration {
  return {
    features: {
      isEnabled: true,
      publicReadEnabled: true,
      definitionEditingEnabled: true,
      valueEditingEnabled: true,
      imagesEnabled: true,
      youTubeEnabled: true,
    },
    fieldTypes: [],
    palette: [
      {
        token: 'LCARS_SUNFLOWER',
        label: 'Sunflower',
        cssVariable: '--lcars-sunflower',
      },
    ],
    limits: {
      MAX_SECTIONS_PER_SCOPE: 20,
      MAX_TABS_PER_SECTION: 20,
      MAX_FIELDS_PER_TAB: 50,
      MAX_FIELDS_PER_SCOPE: 500,
      MAX_FIELDS_PER_SCOPE_INCLUDING_DELETED: 1000,
      MAX_LABEL_LENGTH: 80,
      MAX_DESCRIPTION_LENGTH: 500,
      MAX_TEXT_VALUE_LENGTH: 500,
      MAX_MARKDOWN_VALUE_LENGTH: 20000,
      MAX_OPTIONS_PER_FIELD: 100,
      MAX_TAGS_PER_VALUE: 50,
      MAX_TAG_LENGTH: 40,
      MAX_IMAGE_ALT_LENGTH: 200,
      MAX_PLACEHOLDER_LENGTH: 80,
    },
    fieldBounds: {
      RATING_MAXIMA: [3, 5, 10],
      MAX_DECIMAL_PRECISION: 6,
      MAX_NUMERIC_MAGNITUDE: 1000000000,
      MIN_YEAR: 1900,
      MAX_YEAR: 2999,
      MAX_PATTERN_LENGTH: 200,
    },
    imageShapes: [
      {
        shape: CustomTrackingImageShape.SQUARE,
        label: 'Square image',
        aspectWidth: 1,
        aspectHeight: 1,
        minimumWidth: 300,
        minimumHeight: 300,
        outputFormat: 'png',
        variant: 'square300',
      },
    ],
    ...overrides,
  };
}
