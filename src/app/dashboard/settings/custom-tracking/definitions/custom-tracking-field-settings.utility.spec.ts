import { FormControl } from '@angular/forms';

import {
  CustomTrackingDateFormat,
  CustomTrackingFieldBounds,
  CustomTrackingFieldType,
  CustomTrackingImageShape,
  CustomTrackingLimits,
  CustomTrackingTimeFormat,
} from 'src/app/models/custom-tracking.models';

import {
  CUSTOM_TRACKING_FIELD_SETTINGS,
  CustomTrackingSettingBound,
  CustomTrackingSettingDescriptor,
  CustomTrackingSettingKind,
} from './custom-tracking-field-settings.constants';
import {
  aboveValidator,
  configurationFromForm,
  defaultSettingValue,
  describeSettingBound,
  exactDecimalValidator,
  ratingChoices,
  readerTimezone,
  resolveSettingBound,
  settingValidators,
  settingsFormValues,
  timezoneChoices,
  wholeNumberValidator,
} from './custom-tracking-field-settings.utility';

describe('custom tracking field settings', () => {
  const limits: CustomTrackingLimits = {
    MAX_SECTIONS_PER_SCOPE: 10,
    MAX_TABS_PER_SECTION: 10,
    MAX_FIELDS_PER_TAB: 25,
    MAX_FIELDS_PER_SCOPE: 200,
    MAX_FIELDS_PER_SCOPE_INCLUDING_DELETED: 400,
    MAX_LABEL_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_TEXT_VALUE_LENGTH: 500,
    MAX_MARKDOWN_VALUE_LENGTH: 10000,
    MAX_OPTIONS_PER_FIELD: 50,
    MAX_TAGS_PER_VALUE: 50,
    MAX_TAG_LENGTH: 100,
    MAX_IMAGE_ALT_LENGTH: 300,
    MAX_PLACEHOLDER_LENGTH: 100,
  };

  const fieldBounds: CustomTrackingFieldBounds = {
    RATING_MAXIMA: [3, 5, 10],
    MAX_DECIMAL_PRECISION: 6,
    MAX_NUMERIC_MAGNITUDE: 1000000000,
    MIN_YEAR: 1,
    MAX_YEAR: 9999,
    MAX_PATTERN_LENGTH: 200,
  };

  const bound = (which: CustomTrackingSettingBound) =>
    resolveSettingBound(which, limits, fieldBounds);

  describe('the bounds a setting is entered within', () => {
    // Every one of these comes from the served configuration. A number written
    // down here as well would be a second statement of it that could disagree,
    // which reaches a user as a box accepting what the server then refuses.
    it.each([
      [CustomTrackingSettingBound.NUMERIC, -1000000000, 1000000000],
      [CustomTrackingSettingBound.STEP_INTEGER, 1, 1000000000],
      [CustomTrackingSettingBound.YEAR, 1, 9999],
      [CustomTrackingSettingBound.PRECISION, 0, 6],
      [CustomTrackingSettingBound.TEXT_MIN_LENGTH, 0, 500],
      [CustomTrackingSettingBound.TEXT_MAX_LENGTH, 1, 500],
      [CustomTrackingSettingBound.MARKDOWN_MAX_LENGTH, 1, 10000],
      [CustomTrackingSettingBound.SELECTION_MINIMUM, 0, 50],
      [CustomTrackingSettingBound.SELECTION_MAXIMUM, 1, 50],
    ])('bounds %s between %i and %i', (which, minimum, maximum) => {
      expect(bound(which)).toEqual({
        minimum,
        maximum,
        exclusiveMinimum: false,
        maxLength: null,
      });
    });

    // A slider whose handle moves in steps of nothing is not a slider, and
    // HTML has no way to say "above zero" in a `min` attribute.
    it('refuses zero itself for a slider step', () => {
      expect(bound(CustomTrackingSettingBound.POSITIVE_NUMERIC)).toEqual({
        minimum: 0,
        maximum: 1000000000,
        exclusiveMinimum: true,
        maxLength: null,
      });
    });

    it.each([
      [CustomTrackingSettingBound.PATTERN_LENGTH, 200],
      [CustomTrackingSettingBound.PLACEHOLDER_LENGTH, 100],
    ])('bounds %s to %i characters', (which, maxLength) => {
      expect(bound(which)).toEqual({
        minimum: null,
        maximum: null,
        exclusiveMinimum: false,
        maxLength,
      });
    });

    it('bounds a setting that has no bound not at all', () => {
      expect(bound(CustomTrackingSettingBound.NONE)).toEqual({
        minimum: null,
        maximum: null,
        exclusiveMinimum: false,
        maxLength: null,
      });
    });
  });

  describe('the rating scales', () => {
    it('offers exactly the scales the server published', () => {
      expect(ratingChoices(fieldBounds)).toEqual([
        { value: '3', label: 'Out of 3' },
        { value: '5', label: 'Out of 5' },
        { value: '10', label: 'Out of 10' },
      ]);
    });
  });

  describe('timezones', () => {
    // Typed by hand an IANA identifier is one letter away from being refused,
    // and the refusal would arrive only after the form was submitted.
    it('offers the identifiers the runtime knows, in order', () => {
      const zones = timezoneChoices();

      expect(zones).toContain('Europe/London');
      expect([...zones].sort((a, b) => a.localeCompare(b))).toEqual(zones);
      expect(new Set(zones).size).toBe(zones.length);
    });

    // The runtime lists only the geographic zones, but the server accepts UTC
    // and a fleet event announced in it is a thing people record.
    it('offers UTC even though the runtime does not list it', () => {
      expect(timezoneChoices()).toContain('UTC');
    });

    it('reads the timezone the browser reports', () => {
      expect(readerTimezone()).toBe(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
    });
  });

  describe('what a new field starts with', () => {
    const settingsFor = (fieldType: CustomTrackingFieldType) =>
      settingsFormValues(fieldType, null, fieldBounds);

    // Blank is how "no bound at all" is said. Seeding an optional setting with
    // a number would invent a constraint the user never asked for.
    it('leaves every optional setting blank', () => {
      expect(settingsFor(CustomTrackingFieldType.INTEGER)).toEqual({
        minimum: '',
        maximum: '',
        step: '',
      });
    });

    it('seeds the settings the server demands', () => {
      expect(settingsFor(CustomTrackingFieldType.RANGE)).toEqual({
        minimum: '0',
        maximum: '10',
        step: '1',
      });
    });

    it('seeds a date field with a format rather than a blank', () => {
      expect(settingsFor(CustomTrackingFieldType.DATE)).toEqual({
        minimumDate: '',
        maximumDate: '',
        dateFormat: CustomTrackingDateFormat.LONG,
      });
    });

    // Whoever defines a timed field is far likelier to mean their own clock
    // than any particular city.
    it('seeds a timed field with the timezone the browser reports', () => {
      expect(settingsFor(CustomTrackingFieldType.TIME)).toEqual({
        defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timeFormat: CustomTrackingTimeFormat.LOCALE,
      });
    });

    it('seeds a rating field with the middle scale on offer', () => {
      expect(settingsFor(CustomTrackingFieldType.RATING)).toEqual({
        maximum: '5',
      });
    });

    it('seeds the parts a duration asks for', () => {
      expect(settingsFor(CustomTrackingFieldType.DURATION)).toMatchObject({
        includeDays: false,
        includeHours: true,
        includeMinutes: true,
        includeSeconds: false,
      });
    });

    it('seeds an image field with a crop shape', () => {
      expect(settingsFor(CustomTrackingFieldType.IMAGE)).toEqual({
        shape: CustomTrackingImageShape.SQUARE,
      });
    });

    it('has nothing to seed for a type with no settings', () => {
      expect(settingsFor(CustomTrackingFieldType.TOGGLE)).toEqual({});
    });

    // Defensive, because the scales are served rather than compiled in. A
    // deployment serving none should leave the control empty rather than
    // seeding it with the word "undefined".
    it('leaves a rating blank if the server published no scales', () => {
      const rating = CUSTOM_TRACKING_FIELD_SETTINGS[
        CustomTrackingFieldType.RATING
      ][0] as CustomTrackingSettingDescriptor;

      expect(
        defaultSettingValue(rating, { ...fieldBounds, RATING_MAXIMA: [] }),
      ).toBe('');
    });

    it('leaves a required setting blank when nothing seeds it', () => {
      const unseeded: CustomTrackingSettingDescriptor = {
        key: 'nothingSeedsThis',
        label: 'Unseeded',
        kind: CustomTrackingSettingKind.TEXT,
        bound: CustomTrackingSettingBound.NONE,
        required: true,
      };

      expect(defaultSettingValue(unseeded, fieldBounds)).toBe('');
    });
  });

  describe('what an existing field opens with', () => {
    it('shows the stored settings as they were saved', () => {
      const values = settingsFormValues(
        CustomTrackingFieldType.DECIMAL,
        {
          minimum: '0.00',
          maximum: '99.50',
          precision: 2,
          step: null,
        },
        fieldBounds,
      );

      expect(values).toEqual({
        minimum: '0.00',
        maximum: '99.50',
        precision: '2',
        step: '',
      });
    });

    it('shows an absent setting as blank rather than as missing', () => {
      expect(
        settingsFormValues(CustomTrackingFieldType.YEAR, {}, fieldBounds),
      ).toEqual({ minimumYear: '', maximumYear: '' });
    });

    it('shows a switch as off unless it was saved on', () => {
      expect(
        settingsFormValues(
          CustomTrackingFieldType.PROGRESS,
          { showPercentage: true, showProgressBar: false },
          fieldBounds,
        ),
      ).toMatchObject({ showPercentage: true, showProgressBar: false });
    });
  });

  describe('what the server is sent', () => {
    it('sends only the settings the type actually has', () => {
      expect(
        configurationFromForm(CustomTrackingFieldType.MONTH_YEAR, {
          monthYearFormat: 'SHORT',
          somethingElse: 'ignored',
        }),
      ).toEqual({ monthYearFormat: 'SHORT' });
    });

    // Null is how "no bound at all" is said, and the server reads it that way.
    it('sends a blank optional setting as null', () => {
      expect(
        configurationFromForm(CustomTrackingFieldType.INTEGER, {
          minimum: '',
          maximum: '  ',
          step: '5',
        }),
      ).toEqual({ minimum: null, maximum: null, step: 5 });
    });

    // A decimal that passes through a JSON number has already been rounded by
    // the time anything can check it, so the typed spelling travels intact.
    it('sends a decimal bound as it was typed', () => {
      expect(
        configurationFromForm(CustomTrackingFieldType.DECIMAL, {
          minimum: '0.10',
          maximum: '1000.00',
          precision: '2',
          step: '0.05',
        }),
      ).toEqual({
        minimum: '0.10',
        maximum: '1000.00',
        precision: 2,
        step: '0.05',
      });
    });

    it('sends a rating scale as a number', () => {
      expect(
        configurationFromForm(CustomTrackingFieldType.RATING, {
          maximum: '10',
        }),
      ).toEqual({ maximum: 10 });
    });

    it('sends every switch as a switch', () => {
      expect(
        configurationFromForm(CustomTrackingFieldType.DURATION, {
          durationFormat: 'LONG',
          includeDays: true,
          includeHours: true,
          includeMinutes: false,
          includeSeconds: false,
        }),
      ).toEqual({
        durationFormat: 'LONG',
        includeDays: true,
        includeHours: true,
        includeMinutes: false,
        includeSeconds: false,
      });
    });

    it('sends an empty configuration for a type with no settings', () => {
      expect(configurationFromForm(CustomTrackingFieldType.COLOUR, {})).toEqual(
        {},
      );
    });

    it('treats a setting missing from the form as blank', () => {
      expect(configurationFromForm(CustomTrackingFieldType.YEAR, {})).toEqual({
        minimumYear: null,
        maximumYear: null,
      });
    });
  });

  describe('the checks a setting is subject to', () => {
    const control = (value: unknown) => new FormControl(value);

    const descriptorFor = (
      fieldType: CustomTrackingFieldType,
      key: string,
    ): CustomTrackingSettingDescriptor =>
      CUSTOM_TRACKING_FIELD_SETTINGS[fieldType].find(
        setting => setting.key === key,
      ) as CustomTrackingSettingDescriptor;

    const checksOf = (descriptor: CustomTrackingSettingDescriptor) =>
      settingValidators(descriptor, limits, fieldBounds);

    const failures = (
      descriptor: CustomTrackingSettingDescriptor,
      value: unknown,
    ) =>
      checksOf(descriptor)
        .map(validator => validator(control(value)))
        .filter(result => result !== null);

    // An optional setting left empty is how "no bound at all" is said, so a
    // blank has to pass every one of these.
    it.each([
      ['a whole number', wholeNumberValidator],
      ['an exact decimal', exactDecimalValidator],
      ['a number above a floor', aboveValidator(0)],
    ])('accepts a blank where %s is asked for', (_kind, validator) => {
      expect(validator(control(''))).toBeNull();
      expect(validator(control(null))).toBeNull();
    });

    it('refuses a fraction where only a whole number means anything', () => {
      expect(wholeNumberValidator(control('2.5'))).toEqual({
        wholeNumber: true,
      });
      expect(wholeNumberValidator(control('2'))).toBeNull();
    });

    // The value travels to the database as the string it was typed as, so
    // anything the server cannot read exactly is not a bound.
    it.each(['1e3', '.5', '1.', 'twelve', '0x10'])(
      'refuses %s as a decimal bound',
      entered => {
        expect(exactDecimalValidator(control(entered))).toEqual({
          exactDecimal: true,
        });
      },
    );

    it.each(['0', '-1', '12.5', '-0.001'])(
      'accepts %s as a decimal bound',
      entered => {
        expect(exactDecimalValidator(control(entered))).toBeNull();
      },
    );

    // A slider whose handle moves in steps of zero is not a slider, and
    // `Validators.min` accepts the floor itself.
    it('refuses the floor itself where the floor is excluded', () => {
      expect(aboveValidator(0)(control('0'))).toEqual({ above: { floor: 0 } });
      expect(aboveValidator(0)(control('-1'))).toEqual({ above: { floor: 0 } });
      expect(aboveValidator(0)(control('0.5'))).toBeNull();
    });

    // False is a perfectly good answer to "ask for seconds", and
    // `Validators.required` treats it as no answer at all.
    it('subjects a switch to no checks', () => {
      expect(
        checksOf(
          descriptorFor(CustomTrackingFieldType.DURATION, 'includeDays'),
        ),
      ).toEqual([]);
    });

    it('demands a value for a setting the server requires', () => {
      const dateFormat = descriptorFor(
        CustomTrackingFieldType.DATE,
        'dateFormat',
      );

      expect(failures(dateFormat, '')).toEqual([{ required: true }]);
      expect(failures(dateFormat, 'LONG')).toEqual([]);
    });

    it('bounds a counted setting by the served ceiling', () => {
      const maxLength = descriptorFor(
        CustomTrackingFieldType.TEXT_SINGLE_LINE,
        'maxLength',
      );

      expect(failures(maxLength, '501')).toEqual([
        { max: { max: 500, actual: '501' } },
      ]);
      expect(failures(maxLength, '0')).toEqual([
        { min: { min: 1, actual: '0' } },
      ]);
      expect(failures(maxLength, '2.5')).toEqual([{ wholeNumber: true }]);
      expect(failures(maxLength, '250')).toEqual([]);
    });

    it('lets a slider end take a fraction', () => {
      const minimum = descriptorFor(CustomTrackingFieldType.RANGE, 'minimum');

      expect(failures(minimum, '2.5')).toEqual([]);
    });

    it('refuses a slider step of nothing', () => {
      const step = descriptorFor(CustomTrackingFieldType.RANGE, 'step');

      expect(failures(step, '0')).toEqual([{ above: { floor: 0 } }]);
      expect(failures(step, '0.25')).toEqual([]);
    });

    it('checks the spelling of a decimal bound', () => {
      const minimum = descriptorFor(CustomTrackingFieldType.DECIMAL, 'minimum');

      expect(failures(minimum, '1e3')).toEqual([{ exactDecimal: true }]);
      expect(failures(minimum, '1.5')).toEqual([]);
    });

    it('bounds a pattern by its length', () => {
      const pattern = descriptorFor(
        CustomTrackingFieldType.TEXT_SINGLE_LINE,
        'pattern',
      );

      expect(failures(pattern, 'x'.repeat(201))).toEqual([
        { maxlength: { requiredLength: 200, actualLength: 201 } },
      ]);
      expect(failures(pattern, '^[A-Z]+$')).toEqual([]);
    });

    it('leaves an unbounded number unbounded', () => {
      const unbounded: CustomTrackingSettingDescriptor = {
        key: 'unbounded',
        label: 'Unbounded',
        kind: CustomTrackingSettingKind.NUMBER,
        bound: CustomTrackingSettingBound.NONE,
        required: false,
      };

      expect(failures(unbounded, '99999999999999')).toEqual([]);
    });
  });

  describe('what a setting accepts, said in a sentence', () => {
    const describe_ = (descriptor: CustomTrackingSettingDescriptor) =>
      describeSettingBound(descriptor, limits, fieldBounds);

    const descriptorFor = (
      fieldType: CustomTrackingFieldType,
      key: string,
    ): CustomTrackingSettingDescriptor =>
      CUSTOM_TRACKING_FIELD_SETTINGS[fieldType].find(
        setting => setting.key === key,
      ) as CustomTrackingSettingDescriptor;

    it('states a character ceiling', () => {
      expect(
        describe_(
          descriptorFor(
            CustomTrackingFieldType.TEXT_SINGLE_LINE,
            'placeholder',
          ),
        ),
      ).toBe('Up to 100 characters.');
    });

    it('states a whole-number span', () => {
      expect(
        describe_(descriptorFor(CustomTrackingFieldType.YEAR, 'minimumYear')),
      ).toBe('A whole number from 1 to 9999.');
    });

    it('allows fractions where the server does', () => {
      expect(
        describe_(descriptorFor(CustomTrackingFieldType.RANGE, 'minimum')),
      ).toBe('A number from -1000000000 to 1000000000.');
    });

    it('says when the floor itself is refused', () => {
      expect(
        describe_(descriptorFor(CustomTrackingFieldType.RANGE, 'step')),
      ).toBe('A number above 0, up to 1000000000.');
    });

    it('says nothing about a setting with no bound', () => {
      expect(
        describe_(descriptorFor(CustomTrackingFieldType.DATE, 'dateFormat')),
      ).toBe('');
    });
  });
});
