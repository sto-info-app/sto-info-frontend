import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CustomTrackingField,
  CustomTrackingFieldType,
} from 'src/app/models/custom-tracking.models';

import { buildValueGroup } from '../custom-tracking-value-form.factory';
import {
  aConfiguration,
  aField,
  anAnswer,
  anOption,
} from 'src/app/shared/custom-tracking/custom-tracking.testing';
import { CustomTrackingValueFieldComponent } from './custom-tracking-value-field.component';

describe('CustomTrackingValueFieldComponent', () => {
  const configuration = aConfiguration();

  let fixture: ComponentFixture<CustomTrackingValueFieldComponent>;
  let component: CustomTrackingValueFieldComponent;

  const text = (): string => fixture.nativeElement.textContent as string;

  const query = <T extends HTMLElement>(selector: string): T =>
    fixture.nativeElement.querySelector(selector) as T;

  const queryAll = <T extends HTMLElement>(selector: string): T[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  const build = (field: CustomTrackingField, answered = false): void => {
    fixture = TestBed.createComponent(CustomTrackingValueFieldComponent);
    component = fixture.componentInstance;
    component.field = field;
    component.configuration = configuration;
    component.group = buildValueGroup(
      field,
      answered ? anAnswer({ value: { boolean: true } }) : undefined,
      configuration.limits,
    );
    fixture.detectChanges();
  };

  const typeInto = (selector: string, value: string): void => {
    const input = query<HTMLInputElement>(selector);

    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingValueFieldComponent],
    }).compileComponents();
  });

  describe('text', () => {
    it('asks for a line of text under the field name', () => {
      build(aField({ name: 'Ship name' }));

      expect(text()).toContain('Ship name');
      expect(query('input[type="text"]')).toBeTruthy();
    });

    it('shows the placeholder the field was given', () => {
      build(aField({ configuration: { placeholder: 'USS Adamant' } }));

      expect(query<HTMLInputElement>('input').placeholder).toBe('USS Adamant');
    });

    it('shows a description beneath the control', () => {
      build(aField({ description: 'What it is called.' }));

      expect(text()).toContain('What it is called.');
    });

    // A reader who cannot tell one badge colour from another still has to be
    // able to tell a compulsory field from an optional one.
    it('says in words that an answer is compulsory', () => {
      build(aField({ required: true }));

      expect(text()).toContain('Required');
    });

    it('offers a Markdown editor, a reference and a preview', () => {
      build(aField({ fieldType: CustomTrackingFieldType.MARKDOWN }));

      typeInto('textarea', '# Log');

      const preview = (): HTMLButtonElement =>
        queryAll<HTMLButtonElement>('button').filter(button =>
          (button.textContent ?? '').includes('Preview'),
        )[0];

      preview().click();
      fixture.detectChanges();

      expect(query('.custom-tracking-value-preview').innerHTML).toContain(
        'Log',
      );

      queryAll<HTMLButtonElement>('button')
        .filter(button =>
          (button.textContent ?? '').includes('Back to writing'),
        )[0]
        .click();
      fixture.detectChanges();

      expect(query('.custom-tracking-value-preview')).toBeNull();
    });
  });

  describe('numbers', () => {
    it('offers a number box bounded by the field settings', () => {
      build(
        aField({
          fieldType: CustomTrackingFieldType.INTEGER,
          configuration: { minimum: 1, maximum: 10, step: 1 },
        }),
      );

      const input = query<HTMLInputElement>('input[type="number"]');

      expect(input.min).toBe('1');
      expect(input.max).toBe('10');
      expect(input.step).toBe('1');
    });

    it('offers a decimal box that keeps what was typed', () => {
      build(aField({ fieldType: CustomTrackingFieldType.DECIMAL }));

      typeInto('input[inputmode="decimal"]', '0.10');

      expect(component.group.value).toEqual({ decimal: '0.10' });
    });

    it('marks a percentage as a percentage', () => {
      build(aField({ fieldType: CustomTrackingFieldType.PERCENTAGE }));

      expect(text()).toContain('(%)');
    });

    it('offers a year box bounded by the years the field allows', () => {
      build(
        aField({
          fieldType: CustomTrackingFieldType.YEAR,
          configuration: { minimumYear: 2000, maximumYear: 2100 },
        }),
      );

      expect(query<HTMLInputElement>('input[type="number"]').min).toBe('2000');
    });

    // A slider always holds something, so the number beside it is what lets
    // somebody take the answer away again.
    it('offers a slider and an exact box together', () => {
      build(
        aField({
          fieldType: CustomTrackingFieldType.RANGE,
          configuration: { minimum: 0, maximum: 10, step: 1 },
        }),
      );

      expect(query('input[type="range"]')).toBeTruthy();
      expect(query('input[type="number"]')).toBeTruthy();
      expect(text()).toContain('leave this unanswered');
    });

    it('asks for both progress figures', () => {
      build(aField({ fieldType: CustomTrackingFieldType.PROGRESS }));

      expect(text()).toContain('How far along');
      expect(text()).toContain('Out of');
    });
  });

  describe('ratings', () => {
    const rating = aField({
      fieldType: CustomTrackingFieldType.RATING,
      configuration: { maximum: 3 },
    });

    it('offers one choice per score, and one for no score at all', () => {
      build(rating);

      expect(queryAll('input[type="radio"]')).toHaveLength(4);
      expect(text()).toContain('No rating');
    });

    it('records the score that was chosen', () => {
      build(rating);

      queryAll<HTMLInputElement>('input[type="radio"]')[2].click();
      fixture.detectChanges();

      expect(component.group.value).toEqual({ rating: '2' });
      expect(component.isRating(2)).toBe(true);
    });

    it('takes the score away again', () => {
      build(rating);

      queryAll<HTMLInputElement>('input[type="radio"]')[2].click();
      queryAll<HTMLInputElement>('input[type="radio"]')[0].click();
      fixture.detectChanges();

      expect(component.group.value).toEqual({ rating: '' });
    });

    it('offers no scores where the field names no scale', () => {
      build(aField({ fieldType: CustomTrackingFieldType.RATING }));

      expect(component.ratings).toEqual([]);
    });
  });

  describe('dates and times', () => {
    it('offers a date box bounded by the dates the field allows', () => {
      build(
        aField({
          fieldType: CustomTrackingFieldType.DATE,
          configuration: {
            minimumDate: '2400-01-01',
            maximumDate: '2500-01-01',
          },
        }),
      );

      expect(query<HTMLInputElement>('input[type="date"]').min).toBe(
        '2400-01-01',
      );
    });

    it('offers a month box', () => {
      build(aField({ fieldType: CustomTrackingFieldType.MONTH_YEAR }));

      expect(query('input[type="month"]')).toBeTruthy();
    });

    it('offers a time and the timezone it is meant in', () => {
      build(
        aField({
          fieldType: CustomTrackingFieldType.TIME,
          configuration: { defaultTimezone: 'UTC' },
        }),
      );

      expect(query('input[type="time"]')).toBeTruthy();
      expect(query('select')).toBeTruthy();
      expect(text()).toContain('never converted');
    });

    it('offers a moment and the timezone it was meant in', () => {
      build(
        aField({
          fieldType: CustomTrackingFieldType.DATE_TIME,
          configuration: { defaultTimezone: 'UTC' },
        }),
      );

      expect(query('input[type="datetime-local"]')).toBeTruthy();
    });

    it('offers both ends of a range of dates', () => {
      build(aField({ fieldType: CustomTrackingFieldType.DATE_RANGE }));

      expect(queryAll('input[type="date"]')).toHaveLength(2);
    });

    it('offers both ends of a range of moments and one timezone', () => {
      build(
        aField({
          fieldType: CustomTrackingFieldType.DATE_TIME_RANGE,
          configuration: { defaultTimezone: 'UTC' },
        }),
      );

      expect(queryAll('input[type="datetime-local"]')).toHaveLength(2);
      expect(queryAll('select')).toHaveLength(1);
    });

    // Only the parts the field asks for are offered, so a duration meant in
    // hours does not invite somebody to enter seconds.
    it('asks only for the parts of a duration the field wants', () => {
      build(
        aField({
          fieldType: CustomTrackingFieldType.DURATION,
          configuration: {
            includeDays: false,
            includeHours: true,
            includeMinutes: true,
            includeSeconds: false,
          },
        }),
      );

      expect(component.durationParts.map(part => part.key)).toEqual([
        'hours',
        'minutes',
      ]);
      expect(text()).not.toContain('Days');
    });
  });

  describe('yes and no', () => {
    it('says a switch has not been answered yet', () => {
      build(aField({ fieldType: CustomTrackingFieldType.TOGGLE }));

      expect(text()).toContain('Not answered yet');
      expect(text()).not.toContain('Leave unanswered');
    });

    // Touching the switch is what turns "nobody has said" into "they said no".
    it('counts touching the switch as answering it', () => {
      build(aField({ fieldType: CustomTrackingFieldType.TOGGLE }));

      query<HTMLButtonElement>('button[role="switch"]').click();
      fixture.detectChanges();

      expect(component.group.value).toEqual({ answered: true, boolean: true });
      expect(text()).toContain('Recorded as yes');
    });

    // A record is rebuilt whole every time it is loaded or saved, and the
    // field it is drawn by is not: the same component is handed new controls.
    // A switch that went on watching the old ones would read as unanswered
    // however many times it was flipped, and an unanswered field is sent as a
    // cleared one — so the flip would be dropped rather than stored.
    it('goes on counting the switch as answered after the record is rebuilt', () => {
      const field = aField({ fieldType: CustomTrackingFieldType.TOGGLE });

      build(field);
      fixture.componentRef.setInput(
        'group',
        buildValueGroup(field, undefined, configuration.limits),
      );
      fixture.detectChanges();

      query<HTMLButtonElement>('button[role="switch"]').click();
      fixture.detectChanges();

      expect(component.group.value).toEqual({ answered: true, boolean: true });
      expect(text()).toContain('Recorded as yes');
    });

    it('offers to take a switch answer away again', () => {
      build(aField({ fieldType: CustomTrackingFieldType.TOGGLE }), true);

      expect(text()).toContain('Recorded as yes');

      query<HTMLButtonElement>('.lcars-btn').click();
      fixture.detectChanges();

      expect(component.group.value).toEqual({
        answered: false,
        boolean: false,
      });
      expect(text()).toContain('Not answered yet');
    });

    it('offers a tick box rather than a switch for a checkbox field', () => {
      build(aField({ fieldType: CustomTrackingFieldType.CHECKBOX }), true);

      expect(query('input[type="checkbox"]')).toBeTruthy();
      expect(text()).toContain('Recorded as ticked');
    });

    it('reports a checkbox answered no as unticked', () => {
      build(aField({ fieldType: CustomTrackingFieldType.CHECKBOX }));

      const box = query<HTMLInputElement>('input[type="checkbox"]');

      box.click();
      box.click();
      fixture.detectChanges();

      expect(text()).toContain('Recorded as unticked');
    });

    it('offers yes, no, unknown and no answer at all', () => {
      build(aField({ fieldType: CustomTrackingFieldType.YES_NO_UNKNOWN }));

      expect(
        queryAll('option').map(option => option.textContent?.trim()),
      ).toEqual(['No answer', 'Yes', 'No', 'Unknown']);
    });
  });

  describe('choices', () => {
    const options = [
      anOption({ id: 'a', label: 'Escort' }),
      anOption({ id: 'b', label: 'Cruiser' }),
      anOption({ id: 'c', label: 'Retired', withdrawn: true }),
    ];

    it('offers one radio per option, and one for no answer', () => {
      build(aField({ fieldType: CustomTrackingFieldType.RADIO, options }));

      expect(text()).toContain('No answer');
      expect(text()).toContain('Escort');
    });

    it('records the option a radio group chose', () => {
      build(aField({ fieldType: CustomTrackingFieldType.RADIO, options }));

      queryAll<HTMLInputElement>('input[type="radio"]')[1].click();
      fixture.detectChanges();

      expect(component.chosen).toEqual(['a']);

      queryAll<HTMLInputElement>('input[type="radio"]')[0].click();
      fixture.detectChanges();

      expect(component.chosen).toEqual([]);
    });

    // A withdrawn option stays listed for whoever already chose it, so their
    // answer goes on reading correctly. It cannot be chosen afresh.
    it('hides a withdrawn option nobody chose', () => {
      build(aField({ fieldType: CustomTrackingFieldType.RADIO, options }));

      expect(text()).not.toContain('Retired');
    });

    it('keeps a withdrawn option that was already chosen', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.RADIO,
        options,
      });

      fixture = TestBed.createComponent(CustomTrackingValueFieldComponent);
      component = fixture.componentInstance;
      component.field = field;
      component.configuration = configuration;
      component.group = buildValueGroup(
        field,
        anAnswer({ optionIds: ['c'] }),
        configuration.limits,
      );
      fixture.detectChanges();

      expect(text()).toContain('Retired');
      expect(text()).toContain('Withdrawn');
    });

    it('offers a menu for a dropdown field', () => {
      build(aField({ fieldType: CustomTrackingFieldType.DROPDOWN, options }));

      const select = query<HTMLSelectElement>('select');

      select.value = 'b';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(component.chosen).toEqual(['b']);
    });

    it('offers a tick box per option for a list field', () => {
      build(
        aField({ fieldType: CustomTrackingFieldType.CHECKBOX_LIST, options }),
      );

      queryAll<HTMLInputElement>('input[type="checkbox"]')[0].click();
      queryAll<HTMLInputElement>('input[type="checkbox"]')[1].click();
      fixture.detectChanges();

      expect(component.chosen).toEqual(['a', 'b']);

      queryAll<HTMLInputElement>('input[type="checkbox"]')[0].click();
      fixture.detectChanges();

      expect(component.chosen).toEqual(['b']);
    });

    it('offers a multiple-choice menu for a multi-select field', () => {
      build(
        aField({ fieldType: CustomTrackingFieldType.MULTI_SELECT, options }),
      );

      expect(query<HTMLSelectElement>('select').multiple).toBe(true);
    });

    // Pressed as well as filled, so the state does not rest on colour alone.
    it('offers tags as chips that report whether they are pressed', () => {
      build(aField({ fieldType: CustomTrackingFieldType.TAGS, options }));

      const chip = queryAll<HTMLButtonElement>('.custom-tracking-value-tag')[0];

      expect(chip.getAttribute('aria-pressed')).toBe('false');

      chip.click();
      fixture.detectChanges();

      expect(
        queryAll<HTMLButtonElement>(
          '.custom-tracking-value-tag',
        )[0].getAttribute('aria-pressed'),
      ).toBe('true');
    });
  });

  describe('colours', () => {
    const colour = aField({ fieldType: CustomTrackingFieldType.COLOUR });

    const choose = (mode: string): void => {
      const select = query<HTMLSelectElement>('select');

      select.value = mode;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    it('offers a colour from the palette, one of your own, or none', () => {
      build(colour);

      expect(queryAll('option')).toHaveLength(3);
    });

    // A name rather than a colour: a value recorded against the palette
    // follows the palette if it is ever adjusted.
    it('names palette colours rather than showing their values', () => {
      build(colour);
      choose('TOKEN');

      expect(text()).toContain('Sunflower');
    });

    it('writes a chosen palette colour out beside its swatch', () => {
      build(colour);
      choose('TOKEN');

      const select = queryAll<HTMLSelectElement>('select')[1];

      select.value = 'LCARS_SUNFLOWER';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(query('.custom-tracking-value-swatch')).toBeTruthy();
      expect(component.swatchFor('LCARS_SUNFLOWER')).toBe(
        'var(--lcars-sunflower)',
      );
      expect(component.labelFor('LCARS_SUNFLOWER')).toBe('Sunflower');
    });

    it('falls back where a stored colour is not one of ours', () => {
      build(colour);

      expect(component.swatchFor('GONE')).toBe('transparent');
      expect(component.labelFor('GONE')).toBe('GONE');
    });

    // The value is written out beside the swatch, so it reads the same to
    // somebody who cannot see the colour.
    it('writes a colour of your own out beside its swatch', () => {
      build(colour);
      choose('LITERAL');

      expect(text()).toContain('Nothing entered yet');

      typeInto('input[type="text"]', '#336699');

      expect(text()).toContain('#336699');
    });
  });

  it('asks for a video by its address', () => {
    build(aField({ fieldType: CustomTrackingFieldType.YOUTUBE }));

    expect(query('input[type="url"]')).toBeTruthy();
    expect(text()).toContain('never the address itself');
  });

  describe('reporting what is wrong', () => {
    const failing = (
      field: CustomTrackingField,
      control: string,
      value: string,
    ): void => {
      build(field);
      component.group.get(control)?.setValue(value);
      component.group.markAllAsTouched();
      fixture.detectChanges();
    };

    it('says nothing while nothing is wrong', () => {
      build(aField());

      expect(component.errorMessage).toBe('');
      expect(query('.field-error')).toBeNull();
    });

    // The message is linked to the control it is about, so a screen reader
    // reads it out with the field rather than leaving it on the page alone.
    it('links the message to the control it is about', () => {
      failing(
        aField({ fieldType: CustomTrackingFieldType.INTEGER }),
        'integer',
        '1.5',
      );

      expect(query<HTMLElement>('.field-error').id).toBe(component.errorId);
      expect(
        query<HTMLInputElement>('input').getAttribute('aria-describedby'),
      ).toBe(component.errorId);
    });

    it('names the failure it recognises', () => {
      failing(
        aField({ fieldType: CustomTrackingFieldType.INTEGER }),
        'integer',
        '1.5',
      );

      expect(component.errorMessage).toBe('This has to be a whole number.');
    });

    it('describes a length requirement in words', () => {
      failing(
        aField({ configuration: { maxLength: 5 } }),
        'text',
        'far too long',
      );

      expect(component.errorMessage).toBe(
        'This has to be 5 characters or fewer.',
      );
    });

    it('describes a length requirement with both ends', () => {
      failing(
        aField({ configuration: { minLength: 2, maxLength: 5 } }),
        'text',
        'a',
      );

      expect(component.errorMessage).toBe(
        'This has to be between 2 and 5 characters.',
      );
    });

    it('describes how many decimal places are kept', () => {
      failing(
        aField({
          fieldType: CustomTrackingFieldType.DECIMAL,
          configuration: { precision: 2 },
        }),
        'decimal',
        '1.234',
      );

      expect(component.errorMessage).toBe('Keep this to 2 decimal places.');
    });

    it('describes how many choices are wanted', () => {
      const field = aField({
        fieldType: CustomTrackingFieldType.CHECKBOX_LIST,
        configuration: { minimumSelections: 2, maximumSelections: 3 },
        options: [anOption({ id: 'a' })],
      });

      build(field);
      component.group.get('optionIds')?.setValue(['a']);
      component.group.markAllAsTouched();
      fixture.detectChanges();

      expect(component.errorMessage).toBe('Choose at least 2.');

      component.group.get('optionIds')?.setValue(['a', 'b', 'c', 'd']);
      fixture.detectChanges();

      expect(component.errorMessage).toBe('Choose no more than 3.');
    });

    it('describes a numeric bound in words', () => {
      failing(
        aField({
          fieldType: CustomTrackingFieldType.INTEGER,
          configuration: { minimum: 1, maximum: 10 },
        }),
        'integer',
        '11',
      );

      expect(component.errorMessage).toBe('This has to be between 1 and 10.');
    });

    it('describes a bound with only one end', () => {
      failing(
        aField({
          fieldType: CustomTrackingFieldType.INTEGER,
          configuration: { minimum: 1 },
        }),
        'integer',
        '0',
      );

      expect(component.errorMessage).toBe('This has to be 1 or more.');

      failing(
        aField({
          fieldType: CustomTrackingFieldType.INTEGER,
          configuration: { maximum: 10 },
        }),
        'integer',
        '11',
      );

      expect(component.errorMessage).toBe('This has to be 10 or less.');
    });

    it('apologises generally where it has nothing more specific to say', () => {
      failing(
        aField({
          fieldType: CustomTrackingFieldType.DURATION,
          configuration: {
            includeDays: false,
            includeHours: true,
            includeMinutes: false,
            includeSeconds: false,
          },
        }),
        'hours',
        '-1',
      );

      expect(component.errorMessage).toBe(
        'This is not something the field accepts.',
      );
    });

    // A range that ends before it starts is not the fault of either date, so
    // pointing at one of them would say something untrue about it.
    it('reports a fault of the pair against the pair', () => {
      build(aField({ fieldType: CustomTrackingFieldType.DATE_RANGE }));
      component.group.setValue({
        startDate: '2409-02-01',
        endDate: '2409-01-01',
      });
      component.group.markAllAsTouched();
      fixture.detectChanges();

      expect(component.errorMessage).toBe('This cannot end before it starts.');
    });
  });
});
