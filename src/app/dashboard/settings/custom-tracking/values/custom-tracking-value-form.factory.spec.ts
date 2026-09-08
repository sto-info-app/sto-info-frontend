import { CustomTrackingFieldType } from 'src/app/models/custom-tracking.models';

import { buildValueGroup } from './custom-tracking-value-form.factory';
import {
  aConfiguration,
  aField,
  anAnswer,
  anOption,
} from 'src/app/shared/custom-tracking/custom-tracking.testing';

describe('buildValueGroup', () => {
  const limits = aConfiguration().limits;

  const groupFor = (
    fieldType: CustomTrackingFieldType,
    configuration: Record<string, unknown> = {},
  ) => buildValueGroup(aField({ fieldType, configuration }), undefined, limits);

  it('opens a field with what is already recorded against it', () => {
    const group = buildValueGroup(
      aField(),
      anAnswer({ value: { text: 'Adamant' } }),
      limits,
    );

    expect(group.value).toEqual({ text: 'Adamant' });
  });

  describe('text', () => {
    it('holds a line of text to the length the field allows', () => {
      const group = groupFor(CustomTrackingFieldType.TEXT_SINGLE_LINE, {
        maxLength: 5,
        minLength: 2,
      });

      group.get('text')?.setValue('abcdef');
      expect(group.get('text')?.hasError('maxlength')).toBe(true);

      group.get('text')?.setValue('a');
      expect(group.get('text')?.hasError('minlength')).toBe(true);

      group.get('text')?.setValue('abc');
      expect(group.valid).toBe(true);
    });

    // Where the field sets no length of its own, the structural ceiling
    // applies — the same one the server would refuse it by.
    it('falls back to the served ceiling where the field sets none', () => {
      const group = groupFor(CustomTrackingFieldType.TEXT_SINGLE_LINE);

      group.get('text')?.setValue('a'.repeat(limits.MAX_TEXT_VALUE_LENGTH + 1));
      expect(group.get('text')?.hasError('maxlength')).toBe(true);
    });

    it('holds text to the pattern the field asks for', () => {
      const group = groupFor(CustomTrackingFieldType.TEXT_SINGLE_LINE, {
        pattern: '^[A-Z]+$',
      });

      group.get('text')?.setValue('lower');
      expect(group.get('text')?.hasError('pattern')).toBe(true);
    });

    it('holds Markdown to the length the field allows', () => {
      const group = groupFor(CustomTrackingFieldType.MARKDOWN, {
        maxLength: 4,
      });

      group.get('markdown')?.setValue('toolong');
      expect(group.get('markdown')?.hasError('maxlength')).toBe(true);
    });

    it('falls back to the served Markdown ceiling', () => {
      const group = groupFor(CustomTrackingFieldType.MARKDOWN);

      group
        .get('markdown')
        ?.setValue('a'.repeat(limits.MAX_MARKDOWN_VALUE_LENGTH + 1));
      expect(group.get('markdown')?.hasError('maxlength')).toBe(true);
    });
  });

  describe('numbers', () => {
    it('refuses a fraction where the field counts whole things', () => {
      const group = groupFor(CustomTrackingFieldType.INTEGER);

      group.get('integer')?.setValue('1.5');
      expect(group.get('integer')?.hasError('wholeNumber')).toBe(true);
    });

    it('holds a whole number between the field ends', () => {
      const group = groupFor(CustomTrackingFieldType.INTEGER, {
        minimum: 1,
        maximum: 10,
      });

      group.get('integer')?.setValue('0');
      expect(group.get('integer')?.hasError('min')).toBe(true);

      group.get('integer')?.setValue('11');
      expect(group.get('integer')?.hasError('max')).toBe(true);
    });

    // A slider's step may be a fraction, so a whole-number check there would
    // refuse exactly the values the field was configured to offer.
    it('lets a slider hold a fraction', () => {
      const group = groupFor(CustomTrackingFieldType.RANGE, {
        minimum: 0,
        maximum: 1,
        step: 0.1,
      });

      group.get('number')?.setValue('0.5');
      expect(group.valid).toBe(true);
    });

    it('refuses anything but an exactly written decimal', () => {
      const group = groupFor(CustomTrackingFieldType.DECIMAL, {});

      group.get('decimal')?.setValue('1e5');
      expect(group.get('decimal')?.hasError('exactDecimal')).toBe(true);
    });

    // A figure written to more places than are stored is refused rather than
    // rounded, so what is read back is always what was typed.
    it('refuses more decimal places than the field keeps', () => {
      const group = groupFor(CustomTrackingFieldType.PERCENTAGE, {
        precision: 2,
      });

      group.get('decimal')?.setValue('1.234');
      expect(group.get('decimal')?.hasError('precision')).toBe(true);

      group.get('decimal')?.setValue('1.23');
      expect(group.valid).toBe(true);
    });

    it('holds a decimal between the bounds the field names', () => {
      const group = groupFor(CustomTrackingFieldType.DECIMAL, {
        minimum: '1',
        maximum: '5',
      });

      group.get('decimal')?.setValue('0.5');
      expect(group.get('decimal')?.hasError('min')).toBe(true);

      group.get('decimal')?.setValue('5.5');
      expect(group.get('decimal')?.hasError('max')).toBe(true);
    });

    it('holds a year between the years the field names', () => {
      const group = groupFor(CustomTrackingFieldType.YEAR, {
        minimumYear: 2000,
        maximumYear: 2100,
      });

      group.get('year')?.setValue('1999');
      expect(group.get('year')?.hasError('min')).toBe(true);

      group.get('year')?.setValue('2101');
      expect(group.get('year')?.hasError('max')).toBe(true);
    });

    it('leaves a year unbounded where the field bounds neither end', () => {
      const group = groupFor(CustomTrackingFieldType.YEAR);

      group.get('year')?.setValue('2409');
      expect(group.valid).toBe(true);
    });
  });

  describe('progress', () => {
    const progress = () => groupFor(CustomTrackingFieldType.PROGRESS);

    it('accepts both figures left empty', () => {
      expect(progress().valid).toBe(true);
    });

    // Half a statement is not a statement: "three" says nothing without the
    // total it is three of.
    it('refuses one figure without the other', () => {
      const group = progress();

      group.get('current')?.setValue('3');
      expect(group.hasError('progressIncomplete')).toBe(true);
    });

    it('refuses a total of nothing', () => {
      const group = progress();

      group.setValue({ current: '0', maximum: '0' });
      expect(group.hasError('totalOfNothing')).toBe(true);
    });

    it('refuses being further along than the total', () => {
      const group = progress();

      group.setValue({ current: '11', maximum: '10' });
      expect(group.hasError('pastTheEnd')).toBe(true);
    });

    it('accepts a figure that sits within its total', () => {
      const group = progress();

      group.setValue({ current: '3', maximum: '10' });
      expect(group.valid).toBe(true);
    });
  });

  describe('ranges of dates', () => {
    // Neither date is wrong on its own; it is the pair that cannot be true,
    // so the complaint belongs to the pair.
    it('refuses a range that ends before it starts', () => {
      const group = groupFor(CustomTrackingFieldType.DATE_RANGE);

      group.setValue({ startDate: '2409-02-01', endDate: '2409-01-01' });
      expect(group.hasError('endsBeforeItStarts')).toBe(true);

      group.setValue({ startDate: '2409-01-01', endDate: '2409-02-01' });
      expect(group.valid).toBe(true);
    });

    it('says nothing while half a range is still empty', () => {
      const group = groupFor(CustomTrackingFieldType.DATE_RANGE);

      group.setValue({ startDate: '2409-02-01', endDate: '' });
      expect(group.valid).toBe(true);
    });

    it('refuses a range of moments that ends before it starts', () => {
      const group = groupFor(CustomTrackingFieldType.DATE_TIME_RANGE, {
        defaultTimezone: 'UTC',
      });

      group.patchValue({
        startLocalDateTime: '2026-07-04T20:00',
        endLocalDateTime: '2026-07-04T19:00',
      });
      expect(group.hasError('endsBeforeItStarts')).toBe(true);
    });
  });

  describe('durations', () => {
    it('refuses a fraction or a negative in any part', () => {
      const group = groupFor(CustomTrackingFieldType.DURATION);

      group.get('hours')?.setValue('1.5');
      expect(group.get('hours')?.hasError('wholeNumber')).toBe(true);

      group.get('hours')?.setValue('-1');
      expect(group.get('hours')?.hasError('min')).toBe(true);
    });
  });

  describe('choices', () => {
    const options = [anOption({ id: 'a' }), anOption({ id: 'b' })];

    it('holds a selection between the counts the field asks for', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.CHECKBOX_LIST,
        configuration: { minimumSelections: 2, maximumSelections: 2 },
        options,
      });
      const group = buildValueGroup(field, undefined, limits);

      group.get('optionIds')?.setValue(['a']);
      expect(group.get('optionIds')?.hasError('tooFewChosen')).toBe(true);

      group.get('optionIds')?.setValue(['a', 'b', 'c']);
      expect(group.get('optionIds')?.hasError('tooManyChosen')).toBe(true);

      group.get('optionIds')?.setValue(['a', 'b']);
      expect(group.valid).toBe(true);
    });

    // Choosing nothing is how an answer is cleared. A field that must be
    // answered is stopped by the required check on the record instead.
    it('lets a bounded selection be emptied entirely', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.TAGS,
        configuration: { minimumSelections: 2, maximumSelections: null },
        options,
      });
      const group = buildValueGroup(field, undefined, limits);

      group.get('optionIds')?.setValue([]);
      expect(group.valid).toBe(true);
    });

    it('accepts any number where the field bounds neither end', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.MULTI_SELECT,
        configuration: {},
        options,
      });
      const group = buildValueGroup(field, undefined, limits);

      group.get('optionIds')?.setValue(['a', 'b']);
      expect(group.valid).toBe(true);
    });

    it('holds a selection that is not a list at all as empty', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.CHECKBOX_LIST,
        configuration: { minimumSelections: 1, maximumSelections: 2 },
        options,
      });
      const group = buildValueGroup(field, undefined, limits);

      group.get('optionIds')?.setValue('a');
      expect(group.valid).toBe(true);
    });
  });

  // A picture never travels in a record, so its field has nothing to hold.
  it('gives an image field no controls at all', () => {
    expect(groupFor(CustomTrackingFieldType.IMAGE).value).toEqual({});
  });

  it('leaves the types with nothing to check unchecked', () => {
    const group = groupFor(CustomTrackingFieldType.YES_NO_UNKNOWN);

    group.get('triState')?.setValue('YES');
    expect(group.valid).toBe(true);
  });
});
