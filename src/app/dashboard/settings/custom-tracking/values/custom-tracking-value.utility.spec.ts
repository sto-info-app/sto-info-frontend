import {
  CustomTrackingFieldType,
  CustomTrackingTriState,
} from 'src/app/models/custom-tracking.models';

import {
  aField,
  anAnswer,
  anOption,
} from 'src/app/shared/custom-tracking/custom-tracking.testing';
import {
  CUSTOM_TRACKING_COLOUR_MODES,
  CUSTOM_TRACKING_VALUE_CODECS,
  fieldTimezone,
  isUnanswered,
  submissionFor,
  valueFormFor,
} from './custom-tracking-value.utility';

describe('the value codecs', () => {
  const blankFor = (
    fieldType: CustomTrackingFieldType,
    configuration: Record<string, unknown> = {},
    options = [],
  ): Record<string, unknown> =>
    valueFormFor(aField({ fieldType, configuration, options }), undefined);

  // Every field type has to have a codec. A type without one would draw a
  // control that read nothing back, and nothing else would report it.
  it('covers every field type exactly once', () => {
    const types = Object.values(CustomTrackingFieldType);

    expect(Object.keys(CUSTOM_TRACKING_VALUE_CODECS).sort()).toEqual(
      [...types].sort(),
    );
  });

  describe('text and Markdown', () => {
    it.each([
      ['a string', 'Recorded', 'Recorded'],
      ['a number', 42, '42'],
      ['a true value', true, 'true'],
      ['a false value', false, 'false'],
      ['an object', { unexpected: 'data' }, ''],
      ['an array', ['unexpected'], ''],
      ['null', null, ''],
      ['an absent property', undefined, ''],
    ])(
      'reads %s without stringifying objects',
      (_description, held, expected) => {
        expect(
          valueFormFor(aField(), anAnswer({ value: { text: held } })),
        ).toEqual({ text: expected });
      },
    );

    it('leaves text blank when the stored fragment is absent', () => {
      expect(valueFormFor(aField(), anAnswer({ value: null }))).toEqual({
        text: '',
      });
    });

    it('carries a line of text both ways', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
      });

      expect(
        valueFormFor(field, anAnswer({ value: { text: 'Adamant' } })),
      ).toEqual({ text: 'Adamant' });
      expect(submissionFor(field, { text: ' Adamant ' })).toEqual({
        text: 'Adamant',
      });
    });

    // An empty box is a cleared answer rather than an answer of nothing.
    // Storing one would make a field look answered while showing nothing.
    it('treats an empty box as no answer', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
      });

      expect(submissionFor(field, { text: '   ' })).toBeNull();
    });

    // Reading a control that is not there as the word "undefined" would be
    // worse than useless: it would store it.
    it('reads a control that is not there as no answer', () => {
      expect(submissionFor(aField(), {})).toBeNull();
    });

    it('carries Markdown as its source', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.MARKDOWN });

      expect(submissionFor(field, { markdown: '# Log' })).toEqual({
        markdown: '# Log',
      });
    });
  });

  describe('numbers', () => {
    it('reads a whole number back as a number', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.INTEGER });

      expect(valueFormFor(field, anAnswer({ value: { integer: 12 } }))).toEqual(
        { integer: '12' },
      );
      expect(submissionFor(field, { integer: '12' })).toEqual({ integer: 12 });
    });

    // Zero is an answer somebody gave. Only an empty control means they gave
    // none, which is why the control holds text rather than a number.
    it('keeps zero apart from no answer', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.INTEGER });

      expect(submissionFor(field, { integer: '0' })).toEqual({ integer: 0 });
      expect(submissionFor(field, { integer: '' })).toBeNull();
    });

    // A decimal that passed through a JSON number would already have been
    // rounded by the time anything could check it.
    it('carries a decimal as the string it was typed as', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.DECIMAL });

      expect(submissionFor(field, { decimal: '0.10' })).toEqual({
        decimal: '0.10',
      });
    });

    it('carries a percentage the same way a decimal is carried', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.PERCENTAGE });

      expect(submissionFor(field, { decimal: '99.5' })).toEqual({
        decimal: '99.5',
      });
    });

    it('carries a slider position', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.RANGE });

      expect(submissionFor(field, { number: '4' })).toEqual({ number: 4 });
      expect(submissionFor(field, { number: '' })).toBeNull();
    });

    it('carries a rating', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.RATING });

      expect(submissionFor(field, { rating: '3' })).toEqual({ rating: 3 });
    });

    it('carries a year', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.YEAR });

      expect(submissionFor(field, { year: '2409' })).toEqual({ year: 2409 });
    });

    it('carries both progress figures', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.PROGRESS });

      expect(
        valueFormFor(field, anAnswer({ value: { current: 3, maximum: 10 } })),
      ).toEqual({ current: '3', maximum: '10' });
      expect(submissionFor(field, { current: '3', maximum: '10' })).toEqual({
        current: 3,
        maximum: 10,
      });
    });

    it('treats both progress figures left empty as no answer', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.PROGRESS });

      expect(submissionFor(field, { current: '', maximum: '' })).toBeNull();
    });
  });

  describe('dates and times', () => {
    it('carries a calendar date untouched', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.DATE });

      expect(submissionFor(field, { date: '2409-03-04' })).toEqual({
        date: '2409-03-04',
      });
    });

    it('starts a timed field in the timezone the definition names', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.TIME,
        configuration: { defaultTimezone: 'Europe/London' },
      });

      expect(valueFormFor(field, undefined)).toEqual({
        time: '',
        timezone: 'Europe/London',
      });
    });

    // A time without a date is not an instant, so it is kept exactly as
    // written, in the timezone it was written for.
    it('carries a time of day and its timezone', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.TIME });

      expect(
        valueFormFor(
          field,
          anAnswer({ value: { time: '19:30', timezone: 'Europe/London' } }),
        ),
      ).toEqual({ time: '19:30', timezone: 'Europe/London' });
      expect(
        submissionFor(field, { time: '19:30', timezone: 'Europe/London' }),
      ).toEqual({ time: '19:30', timezone: 'Europe/London' });
    });

    it('falls back to the definition where a stored time names no timezone', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.TIME,
        configuration: { defaultTimezone: 'Asia/Tokyo' },
      });

      expect(
        valueFormFor(
          field,
          anAnswer({ value: { time: '19:30', timezone: '' } }),
        ),
      ).toEqual({ time: '19:30', timezone: 'Asia/Tokyo' });
    });

    it('reports a cleared time as no answer', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.TIME });

      expect(submissionFor(field, { time: '', timezone: 'UTC' })).toBeNull();
    });

    // The instant is what is stored; the local reading is what somebody
    // entered and what they have to be shown to edit it.
    it('reads a stored instant back as the local time it was entered as', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.DATE_TIME });

      expect(
        valueFormFor(
          field,
          anAnswer({
            value: {
              instant: '2026-07-04T18:30:00.000Z',
              timezone: 'Europe/London',
            },
          }),
        ),
      ).toEqual({
        localDateTime: '2026-07-04T19:30',
        timezone: 'Europe/London',
      });
    });

    it('sends a moment as the local reading and its timezone', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.DATE_TIME });

      expect(
        submissionFor(field, {
          localDateTime: '2026-07-04T19:30',
          timezone: 'Europe/London',
        }),
      ).toEqual({
        localDateTime: '2026-07-04T19:30',
        timezone: 'Europe/London',
      });
      expect(
        submissionFor(field, { localDateTime: '', timezone: 'UTC' }),
      ).toBeNull();
    });

    it('falls back to the definition where a stored moment names no timezone', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.DATE_TIME,
        configuration: { defaultTimezone: 'UTC' },
      });

      expect(
        valueFormFor(field, anAnswer({ value: { instant: '', timezone: '' } })),
      ).toEqual({ localDateTime: '', timezone: 'UTC' });
    });

    it('carries a month and its year as one control', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.MONTH_YEAR });

      expect(
        valueFormFor(field, anAnswer({ value: { year: 2409, month: 3 } })),
      ).toEqual({ monthYear: '2409-03' });
      expect(submissionFor(field, { monthYear: '2409-03' })).toEqual({
        year: 2409,
        month: 3,
      });
      expect(submissionFor(field, { monthYear: '' })).toBeNull();
    });

    it('leaves a month control empty where nothing is recorded', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.MONTH_YEAR });

      expect(valueFormFor(field, anAnswer({ value: {} }))).toEqual({
        monthYear: '',
      });
    });

    it('carries a start and end date', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.DATE_RANGE });

      expect(
        valueFormFor(
          field,
          anAnswer({
            value: { startDate: '2409-01-01', endDate: '2409-02-01' },
          }),
        ),
      ).toEqual({ startDate: '2409-01-01', endDate: '2409-02-01' });
      expect(
        submissionFor(field, {
          startDate: '2409-01-01',
          endDate: '2409-02-01',
        }),
      ).toEqual({ startDate: '2409-01-01', endDate: '2409-02-01' });
      expect(submissionFor(field, { startDate: '', endDate: '' })).toBeNull();
    });

    it('carries a start and end moment in one timezone', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.DATE_TIME_RANGE,
      });

      expect(
        valueFormFor(
          field,
          anAnswer({
            value: {
              startInstant: '2026-07-04T18:00:00.000Z',
              endInstant: '2026-07-04T20:00:00.000Z',
              timezone: 'Europe/London',
            },
          }),
        ),
      ).toEqual({
        startLocalDateTime: '2026-07-04T19:00',
        endLocalDateTime: '2026-07-04T21:00',
        timezone: 'Europe/London',
      });
      expect(
        submissionFor(field, {
          startLocalDateTime: '2026-07-04T19:00',
          endLocalDateTime: '2026-07-04T21:00',
          timezone: 'Europe/London',
        }),
      ).toEqual({
        startLocalDateTime: '2026-07-04T19:00',
        endLocalDateTime: '2026-07-04T21:00',
        timezone: 'Europe/London',
      });
    });

    it('falls back to the definition where a stored range names no timezone', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.DATE_TIME_RANGE,
        configuration: { defaultTimezone: 'Asia/Tokyo' },
      });

      expect(
        valueFormFor(
          field,
          anAnswer({
            value: {
              startInstant: '2026-07-04T18:00:00.000Z',
              endInstant: '2026-07-04T20:00:00.000Z',
              timezone: '',
            },
          }),
        ),
      ).toMatchObject({ timezone: 'Asia/Tokyo' });
    });

    it('reports an emptied range of moments as no answer', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.DATE_TIME_RANGE,
      });

      expect(
        valueFormFor(
          field,
          anAnswer({
            value: { startInstant: '', endInstant: '', timezone: 'UTC' },
          }),
        ),
      ).toEqual({
        startLocalDateTime: '',
        endLocalDateTime: '',
        timezone: 'UTC',
      });
      expect(
        submissionFor(field, {
          startLocalDateTime: '',
          endLocalDateTime: '',
          timezone: 'UTC',
        }),
      ).toBeNull();
    });

    // "Two days" and "forty-eight hours" are different statements, so the
    // parts are kept rather than a total.
    it('carries the parts of a duration', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.DURATION });

      expect(
        valueFormFor(
          field,
          anAnswer({
            value: { days: 2, hours: 4, minutes: 30, seconds: 0 },
          }),
        ),
      ).toEqual({ days: '2', hours: '4', minutes: '30', seconds: '0' });
      expect(
        submissionFor(field, {
          days: '2',
          hours: '4',
          minutes: '',
          seconds: '',
        }),
      ).toEqual({ days: 2, hours: 4, minutes: 0, seconds: 0 });
    });

    it('reports a duration with every part empty as no answer', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.DURATION });

      expect(
        submissionFor(field, {
          days: '',
          hours: '',
          minutes: '',
          seconds: '',
        }),
      ).toBeNull();
    });
  });

  describe('yes and no', () => {
    // A switch has two positions and the answer has three states. `false` is
    // an answer somebody chose; no answer at all is a different thing.
    it('keeps a recorded no apart from no answer', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.TOGGLE });

      expect(valueFormFor(field, undefined)).toEqual({
        answered: false,
        boolean: false,
      });
      expect(
        valueFormFor(field, anAnswer({ value: { boolean: false } })),
      ).toEqual({ answered: true, boolean: false });
      expect(
        submissionFor(field, { answered: false, boolean: false }),
      ).toBeNull();
      expect(submissionFor(field, { answered: true, boolean: false })).toEqual({
        boolean: false,
      });
    });

    it('records a tick box the same way it records a switch', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.CHECKBOX });

      expect(submissionFor(field, { answered: true, boolean: true })).toEqual({
        boolean: true,
      });
    });

    it('carries a yes, no or explicitly unknown answer', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.YES_NO_UNKNOWN,
      });

      expect(
        submissionFor(field, { triState: CustomTrackingTriState.UNKNOWN }),
      ).toEqual({ triState: CustomTrackingTriState.UNKNOWN });
      expect(submissionFor(field, { triState: '' })).toBeNull();
    });
  });

  describe('choices', () => {
    const options = [
      anOption({ id: 'a', isDefault: true }),
      anOption({ id: 'b' }),
      anOption({ id: 'c', isDefault: true, withdrawn: true }),
    ];

    // Applied only where nothing is recorded. A default that overwrote a
    // stored answer would discard something chosen deliberately.
    it('seeds a new answer from the options marked default', () => {
      const single = aField({
        fieldType: CustomTrackingFieldType.RADIO,
        options,
      });
      const many = aField({
        fieldType: CustomTrackingFieldType.CHECKBOX_LIST,
        options,
      });

      expect(valueFormFor(single, undefined)).toEqual({ optionIds: ['a'] });
      expect(valueFormFor(many, undefined)).toEqual({ optionIds: ['a'] });
    });

    it('never seeds over an answer already recorded', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.RADIO,
        options,
      });

      expect(valueFormFor(field, anAnswer({ optionIds: ['b'] }))).toEqual({
        optionIds: ['b'],
      });
    });

    it('sends what was chosen, and nothing where nothing was', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.MULTI_SELECT,
        options,
      });

      expect(submissionFor(field, { optionIds: ['a', 'b'] })).toEqual({
        optionIds: ['a', 'b'],
      });
      expect(submissionFor(field, { optionIds: [] })).toBeNull();
      expect(submissionFor(field, {})).toBeNull();
    });

    it('records tags exactly as it records any other list of choices', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.TAGS,
        options,
      });

      expect(submissionFor(field, { optionIds: ['b'] })).toEqual({
        optionIds: ['b'],
      });
    });

    it('records a dropdown exactly as it records a radio group', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.DROPDOWN,
        options,
      });

      expect(submissionFor(field, { optionIds: ['b'] })).toEqual({
        optionIds: ['b'],
      });
    });
  });

  describe('colours', () => {
    const field = aField({ fieldType: CustomTrackingFieldType.COLOUR });

    // A name rather than a colour: a value recorded against the palette
    // follows the palette if it is ever adjusted.
    it('sends a palette name on its own', () => {
      expect(
        submissionFor(field, {
          colourMode: CUSTOM_TRACKING_COLOUR_MODES.TOKEN,
          token: 'LCARS_SUNFLOWER',
          literal: '',
        }),
      ).toEqual({ token: 'LCARS_SUNFLOWER', literal: null });
    });

    it('sends a colour of somebody own on its own', () => {
      expect(
        submissionFor(field, {
          colourMode: CUSTOM_TRACKING_COLOUR_MODES.LITERAL,
          token: '',
          literal: '#336699',
        }),
      ).toEqual({ token: null, literal: '#336699' });
    });

    it('sends nothing where no colour was chosen', () => {
      expect(valueFormFor(field, undefined)).toEqual({
        colourMode: CUSTOM_TRACKING_COLOUR_MODES.NONE,
        token: '',
        literal: '',
      });
      expect(
        submissionFor(field, {
          colourMode: CUSTOM_TRACKING_COLOUR_MODES.NONE,
          token: '',
          literal: '',
        }),
      ).toBeNull();
    });

    it('opens on whichever kind of colour was recorded', () => {
      expect(
        valueFormFor(
          field,
          anAnswer({ value: { token: 'LCARS_SUNFLOWER', literal: null } }),
        ),
      ).toMatchObject({ colourMode: CUSTOM_TRACKING_COLOUR_MODES.TOKEN });
      expect(
        valueFormFor(
          field,
          anAnswer({ value: { token: null, literal: '#336699' } }),
        ),
      ).toMatchObject({ colourMode: CUSTOM_TRACKING_COLOUR_MODES.LITERAL });
    });
  });

  describe('video', () => {
    const field = aField({ fieldType: CustomTrackingFieldType.YOUTUBE });

    // Only the identifier and the offset are kept, never the address somebody
    // pasted, so the editor has to write one out again to show what is there.
    it('writes an address out again from what was stored', () => {
      expect(
        valueFormFor(
          field,
          anAnswer({ value: { videoId: 'abcdefghijk', startSeconds: 30 } }),
        ),
      ).toEqual({ url: 'https://www.youtube.com/watch?v=abcdefghijk&t=30s' });
      expect(
        valueFormFor(
          field,
          anAnswer({ value: { videoId: 'abcdefghijk', startSeconds: null } }),
        ),
      ).toEqual({ url: 'https://www.youtube.com/watch?v=abcdefghijk' });
    });

    it('shows nothing where no video is recorded', () => {
      expect(valueFormFor(field, anAnswer({ value: {} }))).toEqual({ url: '' });
    });

    it('sends the address for the server to parse', () => {
      expect(submissionFor(field, { url: ' https://youtu.be/abc ' })).toEqual({
        url: 'https://youtu.be/abc',
      });
      expect(submissionFor(field, { url: '' })).toBeNull();
    });
  });

  // A picture arrives as an upload and is checked as bytes. Accepting an
  // identifier in a value would let a caller point a field at any image in the
  // account, so the record never carries one.
  it('never sends anything for a picture', () => {
    const field = aField({ fieldType: CustomTrackingFieldType.IMAGE });

    expect(valueFormFor(field, undefined)).toEqual({});
    expect(valueFormFor(field, anAnswer())).toEqual({});
    expect(submissionFor(field, {})).toBeNull();
  });

  it('offers a blank form for every type', () => {
    for (const fieldType of Object.values(CustomTrackingFieldType)) {
      expect(blankFor(fieldType)).toBeDefined();
    }
  });
});

describe('fieldTimezone', () => {
  it('uses the timezone the definition names', () => {
    expect(
      fieldTimezone(
        aField({ configuration: { defaultTimezone: 'Asia/Tokyo' } }),
      ),
    ).toBe('Asia/Tokyo');
  });

  it('falls back to UTC where the definition names none', () => {
    expect(fieldTimezone(aField())).toBe('UTC');
    expect(
      fieldTimezone(aField({ configuration: { defaultTimezone: '' } })),
    ).toBe('UTC');
  });
});

describe('isUnanswered', () => {
  it('reports an empty control as unanswered', () => {
    const field = aField();

    expect(isUnanswered(field, { text: '' }, false)).toBe(true);
    expect(isUnanswered(field, { text: 'Adamant' }, false)).toBe(false);
  });

  // A picture is uploaded on its own and never travels with the record, so
  // what is stored answers the question rather than what the form holds.
  it('judges a picture by what is stored rather than by the form', () => {
    const field = aField({ fieldType: CustomTrackingFieldType.IMAGE });

    expect(isUnanswered(field, {}, false)).toBe(true);
    expect(isUnanswered(field, {}, true)).toBe(false);
  });
});
