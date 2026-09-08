import {
  CustomTrackingDateFormat,
  CustomTrackingDurationFormat,
  CustomTrackingFieldType,
  CustomTrackingImageShape,
  CustomTrackingMonthYearFormat,
  CustomTrackingTimeFormat,
  CustomTrackingTriState,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingDisplayField } from './custom-tracking-display.models';
import {
  answerShape,
  answerText,
  colourReading,
  markdownSource,
  progressReading,
  ratingReading,
  videoReading,
} from './custom-tracking-display.utility';

describe('the display formatter', () => {
  const aDisplayField = (
    overrides: Partial<CustomTrackingDisplayField> = {},
  ): CustomTrackingDisplayField => ({
    id: 'field-1',
    fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
    name: 'Ship name',
    description: null,
    configuration: {},
    emptyMode: 'SHOW_LABEL' as CustomTrackingDisplayField['emptyMode'],
    emptyPlaceholder: null,
    value: null,
    chosen: [],
    image: null,
    answered: false,
    ...overrides,
  });

  const written = (
    fieldType: CustomTrackingFieldType,
    value: Record<string, unknown>,
    configuration: Record<string, unknown> = {},
  ): string =>
    answerText(
      aDisplayField({ fieldType, value, configuration, answered: true }),
    );

  describe('which shape a field is drawn as', () => {
    it.each([
      [CustomTrackingFieldType.MARKDOWN, 'markdown'],
      [CustomTrackingFieldType.PROGRESS, 'progress'],
      [CustomTrackingFieldType.COLOUR, 'colour'],
      [CustomTrackingFieldType.IMAGE, 'image'],
      [CustomTrackingFieldType.YOUTUBE, 'video'],
      [CustomTrackingFieldType.RATING, 'rating'],
      [CustomTrackingFieldType.RADIO, 'choices'],
      [CustomTrackingFieldType.DROPDOWN, 'choices'],
      [CustomTrackingFieldType.CHECKBOX_LIST, 'choices'],
      [CustomTrackingFieldType.MULTI_SELECT, 'choices'],
      [CustomTrackingFieldType.TAGS, 'choices'],
      [CustomTrackingFieldType.TEXT_SINGLE_LINE, 'text'],
      [CustomTrackingFieldType.DURATION, 'text'],
    ])('draws %s as %s', (fieldType, shape) => {
      expect(answerShape(aDisplayField({ fieldType }))).toBe(shape);
    });
  });

  describe('the types that come down to a line of text', () => {
    it('writes a line of text', () => {
      expect(
        written(CustomTrackingFieldType.TEXT_SINGLE_LINE, {
          text: 'Bellerophon',
        }),
      ).toBe('Bellerophon');
    });

    it('writes a whole number', () => {
      expect(written(CustomTrackingFieldType.INTEGER, { integer: 42 })).toBe(
        '42',
      );
    });

    // Carried and written as a string, so a figure a user typed exactly is the
    // figure they are shown. Passing it through a JSON number would round it.
    it('writes a decimal exactly as it was stored', () => {
      expect(
        written(CustomTrackingFieldType.DECIMAL, { decimal: '12.50' }),
      ).toBe('12.50');
    });

    it('writes a percentage with its sign', () => {
      expect(
        written(CustomTrackingFieldType.PERCENTAGE, { decimal: '99.9' }),
      ).toBe('99.9%');
    });

    it('writes a slider figure', () => {
      expect(written(CustomTrackingFieldType.RANGE, { number: 7 })).toBe('7');
    });

    it('writes a year', () => {
      expect(written(CustomTrackingFieldType.YEAR, { year: 2409 })).toBe(
        '2409',
      );
    });

    it('writes a date the long way and the short way', () => {
      expect(
        written(
          CustomTrackingFieldType.DATE,
          { date: '2026-09-04' },
          { dateFormat: CustomTrackingDateFormat.LONG },
        ),
      ).toBe('4 September 2026');
      expect(
        written(
          CustomTrackingFieldType.DATE,
          { date: '2026-09-04' },
          { dateFormat: CustomTrackingDateFormat.SHORT },
        ),
      ).toContain('2026');
    });

    // Read in UTC deliberately: a date has no time and no timezone, so reading
    // it anywhere else would move it a day for half the world.
    it('does not move a date into the reader’s timezone', () => {
      expect(
        written(
          CustomTrackingFieldType.DATE,
          { date: '2026-01-01' },
          { dateFormat: CustomTrackingDateFormat.LONG },
        ),
      ).toBe('1 January 2026');
    });

    it('writes a date range', () => {
      expect(
        written(
          CustomTrackingFieldType.DATE_RANGE,
          { startDate: '2026-09-04', endDate: '2026-09-06' },
          { dateFormat: CustomTrackingDateFormat.LONG },
        ),
      ).toBe('4 September 2026 – 6 September 2026');
    });

    it('leaves a range endpoint blank where none was stored', () => {
      expect(
        written(
          CustomTrackingFieldType.DATE_RANGE,
          { startDate: '2026-09-04', endDate: '' },
          { dateFormat: CustomTrackingDateFormat.LONG },
        ),
      ).toBe('4 September 2026 – ');
    });

    it('writes a wall-clock time on a twenty-four hour clock', () => {
      expect(
        written(
          CustomTrackingFieldType.TIME,
          { time: '14:30', timezone: 'Europe/London' },
          { timeFormat: CustomTrackingTimeFormat.TWENTY_FOUR_HOUR },
        ),
      ).toBe('14:30 (Europe/London)');
    });

    it('writes a wall-clock time on a twelve hour clock', () => {
      expect(
        written(
          CustomTrackingFieldType.TIME,
          { time: '14:30', timezone: 'Europe/London' },
          { timeFormat: CustomTrackingTimeFormat.TWELVE_HOUR },
        ),
      ).toContain('2:30');
    });

    it('defers to the reader’s own locale where the field asks it to', () => {
      expect(
        written(
          CustomTrackingFieldType.TIME,
          { time: '09:05', timezone: 'UTC' },
          { timeFormat: CustomTrackingTimeFormat.LOCALE },
        ),
      ).toContain('05');
    });

    it('falls back to the field’s timezone where a value names none', () => {
      expect(
        written(
          CustomTrackingFieldType.TIME,
          { time: '14:30' },
          {
            timeFormat: CustomTrackingTimeFormat.TWENTY_FOUR_HOUR,
            defaultTimezone: 'Asia/Tokyo',
          },
        ),
      ).toBe('14:30 (Asia/Tokyo)');
    });

    it('leaves a time blank where none was stored', () => {
      expect(
        written(
          CustomTrackingFieldType.TIME,
          { time: '', timezone: 'UTC' },
          { timeFormat: CustomTrackingTimeFormat.TWENTY_FOUR_HOUR },
        ),
      ).toBe(' (UTC)');
    });

    // The instant is what is stored; the local reading is what the user
    // entered. Writing the instant back out in the wrong zone would show them
    // a time they never typed.
    it('writes an instant back in the timezone it was entered in', () => {
      expect(
        written(
          CustomTrackingFieldType.DATE_TIME,
          { instant: '2026-01-04T18:30:00.000Z', timezone: 'Asia/Tokyo' },
          {
            dateFormat: CustomTrackingDateFormat.LONG,
            timeFormat: CustomTrackingTimeFormat.TWENTY_FOUR_HOUR,
          },
        ),
      ).toBe('5 January 2026, 03:30 (Asia/Tokyo)');
    });

    it('falls back to the field’s timezone for an instant that names none', () => {
      expect(
        written(
          CustomTrackingFieldType.DATE_TIME,
          { instant: '2026-01-04T18:30:00.000Z' },
          {
            dateFormat: CustomTrackingDateFormat.LONG,
            timeFormat: CustomTrackingTimeFormat.TWENTY_FOUR_HOUR,
            defaultTimezone: 'Asia/Tokyo',
          },
        ),
      ).toBe('5 January 2026, 03:30 (Asia/Tokyo)');
    });

    it('falls back to the field’s timezone for a range that names none', () => {
      expect(
        written(
          CustomTrackingFieldType.DATE_TIME_RANGE,
          {
            startInstant: '2026-01-04T18:30:00.000Z',
            endInstant: '2026-01-04T20:00:00.000Z',
          },
          {
            dateFormat: CustomTrackingDateFormat.LONG,
            timeFormat: CustomTrackingTimeFormat.TWENTY_FOUR_HOUR,
            defaultTimezone: 'UTC',
          },
        ),
      ).toContain('(UTC)');
    });

    // A fragment missing the figure it is supposed to carry is a stored
    // inconsistency; writing it as nothing beats writing it as NaN.
    it('writes a missing figure as zero', () => {
      expect(written(CustomTrackingFieldType.INTEGER, {})).toBe('0');
    });

    it('writes both ends of an instant range', () => {
      expect(
        written(
          CustomTrackingFieldType.DATE_TIME_RANGE,
          {
            startInstant: '2026-01-04T18:30:00.000Z',
            endInstant: '2026-01-04T20:00:00.000Z',
            timezone: 'UTC',
          },
          {
            dateFormat: CustomTrackingDateFormat.LONG,
            timeFormat: CustomTrackingTimeFormat.TWENTY_FOUR_HOUR,
          },
        ),
      ).toBe('4 January 2026, 18:30 – 4 January 2026, 20:00 (UTC)');
    });

    it.each([
      [CustomTrackingMonthYearFormat.LONG, 'September 2026'],
      [CustomTrackingMonthYearFormat.SHORT, 'Sept 2026'],
      [CustomTrackingMonthYearFormat.NUMERIC, '09/2026'],
    ])('writes a month and year as %s', (monthYearFormat, expected) => {
      expect(
        written(
          CustomTrackingFieldType.MONTH_YEAR,
          { year: 2026, month: 9 },
          { monthYearFormat },
        ),
      ).toBe(expected);
    });

    it('writes a duration in the components the field asks for', () => {
      expect(
        written(
          CustomTrackingFieldType.DURATION,
          { days: 2, hours: 4, minutes: 30, seconds: 15 },
          {
            durationFormat: CustomTrackingDurationFormat.COMPACT,
            includeDays: true,
            includeHours: true,
            includeMinutes: true,
          },
        ),
      ).toBe('2d 4h 30m');
    });

    it('spells a duration out where the field asks it to', () => {
      expect(
        written(
          CustomTrackingFieldType.DURATION,
          { days: 1, hours: 0, minutes: 30, seconds: 0 },
          {
            durationFormat: CustomTrackingDurationFormat.LONG,
            includeDays: true,
            includeHours: true,
            includeMinutes: true,
          },
        ),
      ).toBe('1 day, 30 minutes');
    });

    // Zero is an answer. Blanking it would make a deliberate "none" look like
    // a field nobody had filled in.
    it('writes a duration of nothing as zero of its smallest unit', () => {
      expect(
        written(
          CustomTrackingFieldType.DURATION,
          { days: 0, hours: 0, minutes: 0, seconds: 0 },
          {
            durationFormat: CustomTrackingDurationFormat.LONG,
            includeDays: true,
            includeHours: true,
          },
        ),
      ).toBe('0 hours');
    });

    it('writes every component where the field names none', () => {
      expect(
        written(
          CustomTrackingFieldType.DURATION,
          { days: 0, hours: 0, minutes: 0, seconds: 45 },
          { durationFormat: CustomTrackingDurationFormat.COMPACT },
        ),
      ).toBe('45s');
    });

    it('writes an unconfigured zero duration in seconds', () => {
      expect(
        written(
          CustomTrackingFieldType.DURATION,
          { days: 0, hours: 0, minutes: 0, seconds: 0 },
          { durationFormat: CustomTrackingDurationFormat.COMPACT },
        ),
      ).toBe('0s');
    });

    it.each([
      [CustomTrackingFieldType.TOGGLE, true, 'Yes'],
      [CustomTrackingFieldType.TOGGLE, false, 'No'],
      [CustomTrackingFieldType.CHECKBOX, true, 'Yes'],
      [CustomTrackingFieldType.CHECKBOX, false, 'No'],
    ])('writes %s holding %s as %s', (fieldType, held, expected) => {
      expect(written(fieldType, { boolean: held })).toBe(expected);
    });

    // Recorded as not known is a real answer, and quite different from nobody
    // having looked yet.
    it.each([
      [CustomTrackingTriState.YES, 'Yes'],
      [CustomTrackingTriState.NO, 'No'],
      [CustomTrackingTriState.UNKNOWN, 'Not known'],
    ])('writes a tri-state answer of %s', (triState, expected) => {
      expect(
        written(CustomTrackingFieldType.YES_NO_UNKNOWN, { triState }),
      ).toBe(expected);
    });

    it('writes nothing for a tri-state answer it does not recognise', () => {
      expect(
        written(CustomTrackingFieldType.YES_NO_UNKNOWN, { triState: 'MAYBE' }),
      ).toBe('');
    });

    it('writes nothing for a field that is drawn some other way', () => {
      expect(written(CustomTrackingFieldType.IMAGE, {})).toBe('');
    });

    it('writes nothing where the field has no answer', () => {
      expect(answerText(aDisplayField())).toBe('');
      expect(answerText(aDisplayField({ answered: true }))).toBe('');
    });
  });

  describe('progress', () => {
    const reading = (
      value: Record<string, unknown>,
      configuration: Record<string, unknown> = {},
    ) =>
      progressReading(
        aDisplayField({
          fieldType: CustomTrackingFieldType.PROGRESS,
          value,
          configuration,
          answered: true,
        }),
      );

    it('reads both figures from the value', () => {
      expect(reading({ current: 3, maximum: 12 })).toEqual(
        expect.objectContaining({ current: 3, maximum: 12 }),
      );
    });

    it('offers a percentage only where the field asks for one', () => {
      expect(reading({ current: 3, maximum: 12 })?.percentage).toBeNull();
      expect(
        reading({ current: 3, maximum: 12 }, { showPercentage: true })
          ?.percentage,
      ).toBe(25);
    });

    // A total of nothing is a stored inconsistency rather than a division to
    // attempt, and a bar of NaN width draws as a full one.
    it('sits at the start where the total is zero', () => {
      const held = reading(
        { current: 3, maximum: 0 },
        { showPercentage: true },
      );

      expect(held?.fraction).toBe(0);
      expect(held?.percentage).toBeNull();
    });

    it('never runs past the end of the bar', () => {
      expect(reading({ current: 20, maximum: 12 })?.fraction).toBe(100);
    });

    it('says whether the field asks for a bar', () => {
      expect(reading({ current: 1, maximum: 2 })?.showBar).toBe(false);
      expect(
        reading({ current: 1, maximum: 2 }, { showProgressBar: true })?.showBar,
      ).toBe(true);
    });

    it('reads nothing where nothing is recorded', () => {
      expect(
        progressReading(
          aDisplayField({ fieldType: CustomTrackingFieldType.PROGRESS }),
        ),
      ).toBeNull();
    });
  });

  describe('colour', () => {
    const palette = [
      {
        token: 'LCARS_SUNFLOWER',
        label: 'Sunflower',
        cssVariable: '--lcars-sunflower',
      },
    ];

    const reading = (
      value: Record<string, unknown>,
      colours = palette,
    ): ReturnType<typeof colourReading> =>
      colourReading(
        aDisplayField({
          fieldType: CustomTrackingFieldType.COLOUR,
          value,
          answered: true,
        }),
        colours,
      );

    // Painted through the property the palette publishes, so a colour recorded
    // as the site's own stays the site's own if the palette is adjusted.
    it('paints a named colour through the palette’s own property', () => {
      expect(reading({ token: 'LCARS_SUNFLOWER', literal: null })).toEqual({
        css: 'var(--lcars-sunflower)',
        label: 'Sunflower',
      });
    });

    it('names a colour the palette no longer carries, without painting it', () => {
      expect(reading({ token: 'LCARS_RETIRED', literal: null })).toEqual({
        css: null,
        label: 'Lcars retired',
      });
    });

    it('paints somebody’s own exact shade as given', () => {
      expect(reading({ token: null, literal: '#1a2b3c' })).toEqual({
        css: '#1a2b3c',
        label: '#1a2b3c',
      });
    });

    it('reads nothing where neither was stored', () => {
      expect(reading({ token: null, literal: null })).toBeNull();
    });

    it('reads nothing where nothing is recorded', () => {
      expect(
        colourReading(
          aDisplayField({ fieldType: CustomTrackingFieldType.COLOUR }),
          palette,
        ),
      ).toBeNull();
    });
  });

  describe('rating', () => {
    const reading = (
      value: Record<string, unknown>,
      configuration: Record<string, unknown> = { maximum: 5 },
    ) =>
      ratingReading(
        aDisplayField({
          fieldType: CustomTrackingFieldType.RATING,
          value,
          configuration,
          answered: true,
        }),
      );

    it('fills in as many marks as the score', () => {
      expect(reading({ rating: 3 })?.marks).toEqual([
        true,
        true,
        true,
        false,
        false,
      ]);
    });

    // A field whose scale was lowered after a value was recorded still has to
    // draw that value rather than losing the marks past the new ceiling.
    it('draws a score that outgrew its scale', () => {
      expect(reading({ rating: 7 }, { maximum: 5 })?.maximum).toBe(7);
    });

    it('reads nothing where nothing is recorded', () => {
      expect(
        ratingReading(
          aDisplayField({ fieldType: CustomTrackingFieldType.RATING }),
        ),
      ).toBeNull();
    });
  });

  describe('video', () => {
    const reading = (value: Record<string, unknown>) =>
      videoReading(
        aDisplayField({
          fieldType: CustomTrackingFieldType.YOUTUBE,
          value,
          answered: true,
        }),
      );

    it('offers a still and a place to watch it', () => {
      expect(reading({ videoId: 'abcdefghijk', startSeconds: null })).toEqual({
        videoId: 'abcdefghijk',
        startSeconds: null,
        thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
        watchUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      });
    });

    it('carries the offset into the watch address', () => {
      expect(
        reading({ videoId: 'abcdefghijk', startSeconds: 90 })?.watchUrl,
      ).toBe('https://www.youtube.com/watch?v=abcdefghijk&t=90s');
    });

    // Assembling an address from a stored string is where a check stops being
    // optional, whatever the server was supposed to have stored.
    it('refuses an identifier that is not one', () => {
      expect(reading({ videoId: 'nope', startSeconds: null })).toBeNull();
    });

    it('reads nothing where nothing is recorded', () => {
      expect(
        videoReading(
          aDisplayField({ fieldType: CustomTrackingFieldType.YOUTUBE }),
        ),
      ).toBeNull();
    });
  });

  describe('markdown', () => {
    it('hands back the source it was given', () => {
      expect(
        markdownSource(
          aDisplayField({
            fieldType: CustomTrackingFieldType.MARKDOWN,
            value: { markdown: '# Heading' },
            answered: true,
          }),
        ),
      ).toBe('# Heading');
    });

    it('hands back nothing where nothing is recorded', () => {
      expect(
        markdownSource(
          aDisplayField({ fieldType: CustomTrackingFieldType.MARKDOWN }),
        ),
      ).toBe('');
    });
  });

  describe('pictures', () => {
    it('is drawn as a picture rather than written out', () => {
      const field = aDisplayField({
        fieldType: CustomTrackingFieldType.IMAGE,
        image: {
          imageId: 'image-1',
          altText: 'A ship at speed',
          shape: CustomTrackingImageShape.SQUARE,
        },
        value: {},
        answered: true,
      });

      expect(answerShape(field)).toBe('image');
      expect(answerText(field)).toBe('');
    });
  });
});
