import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CustomTrackingConfiguration,
  CustomTrackingEmptyMode,
  CustomTrackingFieldType,
  CustomTrackingImageShape,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingDisplayField } from '../custom-tracking-display.models';
import { aConfiguration } from '../custom-tracking.testing';
import { CustomTrackingDisplayFieldComponent } from './custom-tracking-display-field.component';

describe('CustomTrackingDisplayFieldComponent', () => {
  let fixture: ComponentFixture<CustomTrackingDisplayFieldComponent>;
  let component: CustomTrackingDisplayFieldComponent;

  const aDisplayField = (
    overrides: Partial<CustomTrackingDisplayField> = {},
  ): CustomTrackingDisplayField => ({
    id: 'field-1',
    fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
    name: 'Ship name',
    description: null,
    configuration: {},
    emptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
    emptyPlaceholder: null,
    value: null,
    chosen: [],
    image: null,
    answered: false,
    ...overrides,
  });

  const build = (
    field: CustomTrackingDisplayField,
    configuration: CustomTrackingConfiguration | null = aConfiguration(),
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingDisplayFieldComponent);
    component = fixture.componentInstance;
    component.field = field;
    component.configuration = configuration;
    fixture.detectChanges();
  };

  const text = (): string => fixture.nativeElement.textContent as string;

  const query = <T extends HTMLElement>(selector: string): T | null =>
    fixture.nativeElement.querySelector(selector) as T | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingDisplayFieldComponent],
    }).compileComponents();
  });

  it('shows the field’s name and what it is for', () => {
    build(aDisplayField({ description: 'The ship they fly' }));

    expect(text()).toContain('Ship name');
    expect(text()).toContain('The ship they fly');
  });

  it('writes a plain answer out', () => {
    build(aDisplayField({ value: { text: 'Bellerophon' }, answered: true }));

    expect(text()).toContain('Bellerophon');
  });

  // A field reaches this component only because its reader is entitled to see
  // it, so neither the dash nor the placeholder can betray a hidden value.
  it('shows a dash where the field asks only for its label', () => {
    build(aDisplayField());

    expect(text()).toContain('—');
  });

  it('shows the placeholder where the field asks for one', () => {
    build(
      aDisplayField({
        emptyMode: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
        emptyPlaceholder: 'Not yet decided',
      }),
    );

    expect(text()).toContain('Not yet decided');
  });

  it('ignores a placeholder the field did not ask to show', () => {
    build(
      aDisplayField({
        emptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
        emptyPlaceholder: 'Not yet decided',
      }),
    );

    expect(text()).not.toContain('Not yet decided');
  });

  it('shows a dash where a field asks for a placeholder it does not have', () => {
    build(
      aDisplayField({
        emptyMode: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
        emptyPlaceholder: null,
      }),
    );

    expect(component.placeholder).toBe('');
    expect(text()).toContain('—');
  });

  it('names a colour before the palette has arrived', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.COLOUR,
        value: { token: 'LCARS_SUNFLOWER', literal: null },
        answered: true,
      }),
      null,
    );

    expect(component.colour).toEqual({ css: null, label: 'Lcars sunflower' });
  });

  it('renders Markdown rather than showing its source', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.MARKDOWN,
        value: { markdown: '**Bold**' },
        answered: true,
      }),
    );

    expect(query('strong')?.textContent).toBe('Bold');
  });

  it('lists the options an answer chose', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.MULTI_SELECT,
        chosen: [
          { id: 'option-1', label: 'Escort' },
          { id: 'option-2', label: 'Cruiser' },
        ],
        answered: true,
      }),
    );

    expect(
      Array.from(
        fixture.nativeElement.querySelectorAll(
          '.custom-tracking-display-choice',
        ) as HTMLElement[],
      ).map(item => item.textContent),
    ).toEqual(['Escort', 'Cruiser']);
  });

  // The marks are decoration; the label is the answer, so a screen reader is
  // told the score once rather than read ten stars.
  it('announces a rating rather than reading its marks aloud', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.RATING,
        configuration: { maximum: 5 },
        value: { rating: 3 },
        answered: true,
      }),
    );

    expect(
      query('.custom-tracking-display-rating')?.getAttribute('aria-label'),
    ).toBe('3 out of 5');
  });

  it('shows both progress figures and the percentage where asked', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.PROGRESS,
        configuration: { showPercentage: true, showProgressBar: true },
        value: { current: 3, maximum: 12 },
        answered: true,
      }),
    );

    expect(text()).toContain('3 of 12');
    expect(text()).toContain('25%');
    expect(query('.custom-tracking-display-progress-bar')).not.toBeNull();
  });

  it('leaves the bar out where the field does not ask for one', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.PROGRESS,
        value: { current: 3, maximum: 12 },
        answered: true,
      }),
    );

    expect(query('.custom-tracking-display-progress-bar')).toBeNull();
  });

  it('paints a swatch beside a named colour', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.COLOUR,
        value: { token: 'LCARS_SUNFLOWER', literal: null },
        answered: true,
      }),
    );

    expect(text()).toContain('Sunflower');
    expect(query('.custom-tracking-display-swatch')).not.toBeNull();
  });

  it('names a colour it cannot paint', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.COLOUR,
        value: { token: 'LCARS_RETIRED', literal: null },
        answered: true,
      }),
    );

    expect(text()).toContain('Lcars retired');
    expect(query('.custom-tracking-display-swatch')).toBeNull();
  });

  it('fetches a picture through the variant the server named', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.IMAGE,
        image: {
          imageId: 'image-1',
          altText: 'A ship at speed',
          shape: CustomTrackingImageShape.SQUARE,
        },
        value: {},
        answered: true,
      }),
    );

    const image = query<HTMLImageElement>('img');

    expect(image?.src).toContain('/image-1/square300');
    expect(image?.alt).toBe('A ship at speed');
  });

  // A guessed variant name produces a broken picture and no error anywhere, so
  // nothing is drawn until the server has said which one to use.
  it('draws no picture before the configuration has arrived', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.IMAGE,
        image: {
          imageId: 'image-1',
          altText: 'A ship at speed',
          shape: CustomTrackingImageShape.SQUARE,
        },
        value: {},
        answered: true,
      }),
      null,
    );

    expect(query('img')).toBeNull();
    expect(component.imageUrl).toBe('');
  });

  it('draws no picture for a shape the server does not describe', () => {
    build(
      aDisplayField({
        fieldType: CustomTrackingFieldType.IMAGE,
        image: {
          imageId: 'image-1',
          altText: 'A ship at speed',
          shape: CustomTrackingImageShape.PORTRAIT,
        },
        value: {},
        answered: true,
      }),
    );

    expect(component.imageUrl).toBe('');
  });

  describe('a video', () => {
    const aVideoField = (): CustomTrackingDisplayField =>
      aDisplayField({
        fieldType: CustomTrackingFieldType.YOUTUBE,
        value: { videoId: 'abcdefghijk', startSeconds: 90 },
        answered: true,
      });

    // Nothing is fetched from YouTube until a reader presses play, so reading
    // somebody's captain page does not announce the reader to YouTube.
    it('shows a still rather than a player until asked', () => {
      build(aVideoField());

      expect(query('iframe')).toBeNull();
      expect(query<HTMLImageElement>('img')?.src).toContain(
        'i.ytimg.com/vi/abcdefghijk',
      );
    });

    it('loads the player once the reader asks for it', () => {
      build(aVideoField());

      query<HTMLButtonElement>('.custom-tracking-display-poster')?.click();
      fixture.detectChanges();

      expect(query('iframe')).not.toBeNull();
      expect(component.embedSource).not.toBeNull();
    });

    it('offers somewhere to watch it away from the site', () => {
      build(aVideoField());

      expect(
        query<HTMLAnchorElement>('.custom-tracking-display-watch')?.href,
      ).toBe('https://www.youtube.com/watch?v=abcdefghijk&t=90s');
    });

    it('draws nothing for a stored identifier that is not one', () => {
      build(
        aDisplayField({
          fieldType: CustomTrackingFieldType.YOUTUBE,
          value: { videoId: 'nope', startSeconds: null },
          answered: true,
        }),
      );

      expect(query('.custom-tracking-display-video')).toBeNull();
    });

    it('offers no embed before the reader has asked', () => {
      build(aVideoField());

      expect(component.embedSource).toBeNull();
    });
  });
});
