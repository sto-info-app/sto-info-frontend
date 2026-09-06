import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CustomTrackingConfiguration,
  CustomTrackingDefaultSource,
  CustomTrackingEmptyMode,
  CustomTrackingField,
  CustomTrackingFieldCategory,
  CustomTrackingFieldType,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingFieldInput } from '../../custom-tracking.service';
import {
  CUSTOM_TRACKING_FIELD_SETTINGS,
  CustomTrackingSettingDescriptor,
} from '../custom-tracking-field-settings.constants';
import { CustomTrackingFieldFormComponent } from './custom-tracking-field-form.component';

describe('CustomTrackingFieldFormComponent', () => {
  const describedType = (
    fieldType: CustomTrackingFieldType,
    category: CustomTrackingFieldCategory,
    label: string,
    usesOptions = false,
  ) => ({
    fieldType,
    label,
    description: `A ${label.toLowerCase()}.`,
    category,
    usesOptions,
    allowsMultipleOptions: false,
    defaultSource: CustomTrackingDefaultSource.NONE,
    usesTimezone: false,
  });

  const configuration: CustomTrackingConfiguration = {
    features: {
      isEnabled: true,
      publicReadEnabled: true,
      definitionEditingEnabled: true,
      valueEditingEnabled: true,
      imagesEnabled: true,
      youTubeEnabled: true,
    },
    fieldTypes: [
      describedType(
        CustomTrackingFieldType.TEXT_SINGLE_LINE,
        CustomTrackingFieldCategory.TEXT,
        'Single line of text',
      ),
      describedType(
        CustomTrackingFieldType.RATING,
        CustomTrackingFieldCategory.NUMBER,
        'Rating',
      ),
      describedType(
        CustomTrackingFieldType.YEAR,
        CustomTrackingFieldCategory.DATE_TIME,
        'Year',
      ),
      describedType(
        CustomTrackingFieldType.TIME,
        CustomTrackingFieldCategory.DATE_TIME,
        'Time',
      ),
      describedType(
        CustomTrackingFieldType.TOGGLE,
        CustomTrackingFieldCategory.BOOLEAN,
        'Switch',
      ),
    ],
    palette: [],
    limits: {
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
    },
    fieldBounds: {
      RATING_MAXIMA: [3, 5, 10],
      MAX_DECIMAL_PRECISION: 6,
      MAX_NUMERIC_MAGNITUDE: 1000000000,
      MIN_YEAR: 1,
      MAX_YEAR: 9999,
      MAX_PATTERN_LENGTH: 200,
    },
  };

  const field: CustomTrackingField = {
    id: 'field-1',
    tabId: 'tab-1',
    fieldType: CustomTrackingFieldType.YEAR,
    name: 'First flown',
    description: 'The year I first took it out.',
    orderIndex: 1000,
    publiclyVisible: true,
    required: true,
    ownerEmptyMode: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
    publicEmptyMode: CustomTrackingEmptyMode.HIDE,
    emptyPlaceholder: 'Not yet flown',
    configuration: { minimumYear: 2010, maximumYear: null },
    suppressed: false,
    options: [],
  };

  let fixture: ComponentFixture<CustomTrackingFieldFormComponent>;
  let component: CustomTrackingFieldFormComponent;
  let saved: CustomTrackingFieldInput[];

  const text = (): string => fixture.nativeElement.textContent as string;

  const build = (
    overrides: Partial<CustomTrackingFieldFormComponent> = {},
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingFieldFormComponent);
    component = fixture.componentInstance;
    component.configuration = configuration;
    Object.assign(component, overrides);
    saved = [];
    component.saved.subscribe(input => saved.push(input));
    fixture.detectChanges();
  };

  const descriptorFor = (
    fieldType: CustomTrackingFieldType,
    key: string,
  ): CustomTrackingSettingDescriptor =>
    CUSTOM_TRACKING_FIELD_SETTINGS[fieldType].find(
      setting => setting.key === key,
    ) as CustomTrackingSettingDescriptor;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingFieldFormComponent],
    }).compileComponents();
  });

  describe('choosing what the field asks for', () => {
    it('offers the types the server published, grouped', () => {
      build();

      expect(component.typeGroups).toEqual([
        {
          label: 'Text',
          types: [
            expect.objectContaining({
              fieldType: CustomTrackingFieldType.TEXT_SINGLE_LINE,
            }),
          ],
        },
        {
          label: 'Numbers',
          types: [
            expect.objectContaining({
              fieldType: CustomTrackingFieldType.RATING,
            }),
          ],
        },
        {
          label: 'Dates and times',
          types: [
            expect.objectContaining({
              fieldType: CustomTrackingFieldType.YEAR,
            }),
            expect.objectContaining({
              fieldType: CustomTrackingFieldType.TIME,
            }),
          ],
        },
        {
          label: 'Yes or no',
          types: [
            expect.objectContaining({
              fieldType: CustomTrackingFieldType.TOGGLE,
            }),
          ],
        },
      ]);
    });

    it('describes the type currently chosen', () => {
      build();

      expect(text()).toContain('A single line of text.');
    });

    // The type decides how every value is stored and read back, so changing it
    // would reinterpret data its owner cannot get back.
    it('does not offer to change the type of a field that exists', () => {
      build({ field });

      expect(
        fixture.nativeElement.querySelector(
          'select#' + component.formId + '-type',
        ),
      ).toBeNull();
      expect(text()).toContain('cannot change what it asks');
    });

    it('names the type of a field the server published no description for', () => {
      build({
        field: { ...field, fieldType: CustomTrackingFieldType.MARKDOWN },
      });

      expect(component.chosenType).toBeNull();
      expect(text()).toContain('MARKDOWN');
    });

    // Controls left behind from the old type would be sent as properties the
    // new type does not have, which the server refuses outright.
    it('replaces the settings when the chosen type changes', () => {
      build();

      expect(Object.keys(component.settingsGroup.controls)).toEqual([
        'minLength',
        'maxLength',
        'pattern',
        'placeholder',
      ]);

      component.fieldForm.controls.fieldType.setValue(
        CustomTrackingFieldType.YEAR,
      );
      component.onTypeChange();

      expect(Object.keys(component.settingsGroup.controls)).toEqual([
        'minimumYear',
        'maximumYear',
      ]);
    });

    it('has no settings section for a type with no settings', () => {
      build();

      component.fieldForm.controls.fieldType.setValue(
        CustomTrackingFieldType.TOGGLE,
      );
      component.onTypeChange();
      fixture.detectChanges();

      expect(component.settingDescriptors).toEqual([]);
      expect(text()).not.toContain('Settings for this kind of field');
    });
  });

  describe('the settings of the chosen type', () => {
    it('offers the served rating scales', () => {
      build();

      expect(
        component.settingChoices(
          descriptorFor(CustomTrackingFieldType.RATING, 'maximum'),
        ),
      ).toEqual([
        { value: '3', label: 'Out of 3' },
        { value: '5', label: 'Out of 5' },
        { value: '10', label: 'Out of 10' },
      ]);
    });

    it('offers the fixed choices of a setting that has them', () => {
      build();

      expect(
        component.settingChoices(
          descriptorFor(CustomTrackingFieldType.TIME, 'timeFormat'),
        ).length,
      ).toBe(3);
    });

    it('offers nothing for a setting that is not a choice', () => {
      build();

      expect(
        component.settingChoices(
          descriptorFor(CustomTrackingFieldType.YEAR, 'minimumYear'),
        ),
      ).toEqual([]);
    });

    it('says what each setting accepts', () => {
      build();

      expect(
        component.boundDescription(
          descriptorFor(CustomTrackingFieldType.YEAR, 'minimumYear'),
        ),
      ).toBe('A whole number from 1 to 9999.');
    });

    it('fills the settings in from an existing field', () => {
      build({ field });

      expect(component.settingsGroup.getRawValue()).toEqual({
        minimumYear: '2010',
        maximumYear: '',
      });
    });

    it('reaches the control behind a setting', () => {
      build({ field });

      expect(
        component.settingControl(
          descriptorFor(CustomTrackingFieldType.YEAR, 'minimumYear'),
        ).value,
      ).toBe('2010');
    });
  });

  describe('what the form holds', () => {
    it('opens empty when a field is being created', () => {
      build();

      expect(component.isNew).toBe(true);
      expect(component.fieldForm.getRawValue()).toMatchObject({
        name: '',
        description: '',
        required: false,
        publiclyVisible: false,
        ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
        publicEmptyMode: CustomTrackingEmptyMode.HIDE,
        emptyPlaceholder: '',
      });
    });

    it('opens filled in when a field is being changed', () => {
      build({ field });

      expect(component.isNew).toBe(false);
      expect(component.fieldForm.getRawValue()).toMatchObject({
        fieldType: CustomTrackingFieldType.YEAR,
        name: 'First flown',
        description: 'The year I first took it out.',
        required: true,
        publiclyVisible: true,
        ownerEmptyMode: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
        publicEmptyMode: CustomTrackingEmptyMode.HIDE,
        emptyPlaceholder: 'Not yet flown',
      });
    });

    it('shows an absent description and placeholder as empty', () => {
      build({
        field: { ...field, description: null, emptyPlaceholder: null },
      });

      expect(component.fieldForm.value.description).toBe('');
      expect(component.fieldForm.value.emptyPlaceholder).toBe('');
    });

    it('cannot be saved without a name', () => {
      build();

      expect(component.fieldForm.invalid).toBe(true);

      component.fieldForm.controls.name.setValue('Class');

      expect(component.fieldForm.valid).toBe(true);
    });

    it('refuses a name longer than the server accepts', () => {
      build();

      component.fieldForm.controls.name.setValue('x'.repeat(101));

      expect(component.fieldForm.controls.name.invalid).toBe(true);
    });

    it('refuses a placeholder longer than the server accepts', () => {
      build();

      component.fieldForm.controls.emptyPlaceholder.setValue('x'.repeat(101));

      expect(component.fieldForm.controls.emptyPlaceholder.invalid).toBe(true);
    });

    it('names the field that is wrong once it has been touched', () => {
      build();

      component.fieldForm.controls.name.markAsTouched();
      fixture.detectChanges();

      expect(text()).toContain('Give this field a name');
    });
  });

  describe('what a reader sees where the field is empty', () => {
    // A reminder of what has not been filled in yet is not necessarily
    // something to publish, so the two are chosen separately.
    it('asks for a placeholder when either audience would see one', () => {
      build();

      expect(component.needsPlaceholder).toBe(false);

      component.fieldForm.controls.publicEmptyMode.setValue(
        CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
      );

      expect(component.needsPlaceholder).toBe(true);
    });

    it('asks for a placeholder when the owner alone would see one', () => {
      build();

      component.fieldForm.controls.ownerEmptyMode.setValue(
        CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
      );
      fixture.detectChanges();

      expect(component.needsPlaceholder).toBe(true);
      expect(text()).toContain('to you and to the public alike');
    });
  });

  describe('the preview of an empty field', () => {
    // "Show the name and a placeholder" is a rule; what somebody wants to know
    // is what will actually be on the page.
    it('shows nothing at all where the field is hidden', () => {
      build();

      component.fieldForm.patchValue({
        publicEmptyMode: CustomTrackingEmptyMode.HIDE,
      });

      expect(component.publicEmptyPreview).toBe(
        'Nothing at all — the field is not shown.',
      );
    });

    it('shows the name on its own', () => {
      build();

      component.fieldForm.patchValue({
        name: '  First flown  ',
        ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
      });

      expect(component.ownerEmptyPreview).toBe('First flown');
    });

    it('shows the name and the placeholder', () => {
      build();

      component.fieldForm.patchValue({
        name: 'First flown',
        emptyPlaceholder: 'Not yet flown',
        ownerEmptyMode: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
      });

      expect(component.ownerEmptyPreview).toBe('First flown — Not yet flown');
    });

    // The preview is drawn while the form is being filled in, so it has to
    // read sensibly before either box has anything in it.
    it('stands in for a name and a placeholder that are not written yet', () => {
      build();

      component.fieldForm.patchValue({
        ownerEmptyMode: CustomTrackingEmptyMode.SHOW_PLACEHOLDER,
      });

      expect(component.ownerEmptyPreview).toBe('This field — Not recorded');
    });

    it('is on the page beside the choosers', () => {
      build();

      component.fieldForm.patchValue({ name: 'First flown' });
      fixture.detectChanges();

      expect(text()).toContain('What that looks like:');
    });
  });

  describe('sending it', () => {
    const fill = (): void => {
      component.fieldForm.patchValue({
        name: '  First flown  ',
        description: '  The year I first took it out.  ',
        required: true,
        publiclyVisible: true,
        ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
        publicEmptyMode: CustomTrackingEmptyMode.HIDE,
        emptyPlaceholder: '   ',
      });
    };

    it('sends the type only when the field is being created', () => {
      build();

      component.fieldForm.controls.fieldType.setValue(
        CustomTrackingFieldType.YEAR,
      );
      component.onTypeChange();
      fill();
      component.submit();

      expect(saved).toEqual([
        {
          fieldType: CustomTrackingFieldType.YEAR,
          name: 'First flown',
          description: 'The year I first took it out.',
          required: true,
          publiclyVisible: true,
          ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
          publicEmptyMode: CustomTrackingEmptyMode.HIDE,
          emptyPlaceholder: null,
          configuration: { minimumYear: null, maximumYear: null },
        },
      ]);
    });

    // Empty and absent mean the same thing to a reader, so only one of them is
    // ever stored.
    it('sends an empty description as nothing at all', () => {
      build();

      component.fieldForm.patchValue({ name: 'Class', description: '   ' });
      component.submit();

      expect(saved[0].description).toBeNull();
    });

    // The server refuses a change that names a type rather than ignoring it,
    // so sending one would turn an ordinary rename into an error.
    it('never sends the type when the field already exists', () => {
      build({ field });

      component.submit();

      expect(saved).toHaveLength(1);
      expect(saved[0]).not.toHaveProperty('fieldType');
      expect(saved[0].configuration).toEqual({
        minimumYear: 2010,
        maximumYear: null,
      });
    });

    it('sends nothing while the form is invalid', () => {
      build();

      component.submit();

      expect(saved).toEqual([]);
    });

    it('does not send twice while one save is in flight', () => {
      build({ isSaving: true });

      component.fieldForm.controls.name.setValue('Class');
      component.submit();

      expect(saved).toEqual([]);
    });
  });

  describe('reporting', () => {
    it('says a public field stays private beneath a private tab', () => {
      build({ ancestorPublic: false });

      component.fieldForm.controls.publiclyVisible.setValue(true);
      fixture.detectChanges();

      expect(component.isPublicBeneathPrivate).toBe(true);
      expect(text()).toContain('will stay private for now');
    });

    it('says nothing about ancestors when everything above is public', () => {
      build({ ancestorPublic: true });

      component.fieldForm.controls.publiclyVisible.setValue(true);

      expect(component.isPublicBeneathPrivate).toBe(false);
    });

    it('reports what the server said', () => {
      build({ errorMessage: 'That name is already used.' });

      expect(text()).toContain('That name is already used.');
    });

    it('can be backed out of', () => {
      build();

      let cancelled = 0;
      component.cancelled.subscribe(() => cancelled++);

      const buttons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button[type="button"]'),
      );
      buttons[buttons.length - 1].click();

      expect(cancelled).toBe(1);
    });
  });
});
