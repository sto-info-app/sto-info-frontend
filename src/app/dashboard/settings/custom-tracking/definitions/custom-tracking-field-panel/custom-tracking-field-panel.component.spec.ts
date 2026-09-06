import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CustomTrackingEmptyMode,
  CustomTrackingField,
  CustomTrackingFieldType,
  CustomTrackingOption,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingFieldPanelComponent } from './custom-tracking-field-panel.component';

describe('CustomTrackingFieldPanelComponent', () => {
  const option = (
    overrides: Partial<CustomTrackingOption> = {},
  ): CustomTrackingOption => ({
    id: 'option-1',
    fieldId: 'field-1',
    label: 'Escort',
    orderIndex: 1000,
    isDefault: false,
    withdrawn: false,
    ...overrides,
  });

  const field: CustomTrackingField = {
    id: 'field-1',
    tabId: 'tab-1',
    fieldType: CustomTrackingFieldType.DROPDOWN,
    name: 'Class',
    description: 'What kind of ship it is.',
    orderIndex: 1000,
    publiclyVisible: false,
    required: false,
    ownerEmptyMode: CustomTrackingEmptyMode.SHOW_LABEL,
    publicEmptyMode: CustomTrackingEmptyMode.HIDE,
    emptyPlaceholder: null,
    configuration: {},
    suppressed: false,
    options: [],
  };

  let fixture: ComponentFixture<CustomTrackingFieldPanelComponent>;
  let component: CustomTrackingFieldPanelComponent;

  const text = (): string => fixture.nativeElement.textContent as string;

  const buttonLabelled = (label: string): HTMLButtonElement =>
    fixture.nativeElement.querySelector(`button[aria-label="${label}"]`);

  const build = (
    overrides: Partial<CustomTrackingFieldPanelComponent> = {},
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingFieldPanelComponent);
    component = fixture.componentInstance;
    component.field = field;
    component.typeLabel = 'Menu';
    component.index = 0;
    component.count = 2;
    Object.assign(component, overrides);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingFieldPanelComponent],
    }).compileComponents();
  });

  it('says what the field is called and what it asks for', () => {
    build();

    expect(text()).toContain('Class');
    expect(text()).toContain('What kind of ship it is.');
  });

  // What a field asks for is one of the facts about it rather than a mark on
  // its bar: "Menu" means nothing without the word Type beside it.
  it('states the field type as a labelled value', () => {
    build();

    const facts: HTMLElement = fixture.nativeElement.querySelector(
      '.custom-tracking-field-facts',
    );

    expect(facts.textContent).toContain('Type');
    expect(facts.textContent).toContain('Menu');
  });

  it('says nothing where a field has no description', () => {
    build({ field: { ...field, description: null } });

    expect(
      fixture.nativeElement.querySelector('.custom-tracking-field-description'),
    ).toBeNull();
  });

  // A reader who cannot tell one badge colour from another still has to be
  // able to tell these apart.
  it('says in words when an answer is compulsory', () => {
    build({ field: { ...field, required: true } });

    expect(text()).toContain('Answer required');
  });

  it('says nothing about compulsion where there is none', () => {
    build();

    expect(text()).not.toContain('Answer required');
  });

  it('says whether the field is public', () => {
    build({ field: { ...field, publiclyVisible: true } });

    expect(text()).toContain('Public');

    build();

    expect(text()).toContain('Private');
  });

  it('says when a moderator has hidden it', () => {
    build({ field: { ...field, suppressed: true } });

    expect(text()).toContain('Hidden by a moderator');
  });

  it.each([
    [CustomTrackingEmptyMode.HIDE, 'hidden'],
    [CustomTrackingEmptyMode.SHOW_LABEL, 'name only'],
    [CustomTrackingEmptyMode.SHOW_PLACEHOLDER, 'placeholder'],
  ])('describes the %s empty mode as %s', (mode, description) => {
    build({ field: { ...field, ownerEmptyMode: mode, publicEmptyMode: mode } });

    expect(component.emptySummary).toBe(description);
    expect(component.publicEmptySummary).toBe(description);
  });

  // Withdrawn options cannot be chosen, so counting them would overstate what
  // the field asks of anybody filling it in.
  it('counts only the options still on offer', () => {
    build({
      usesOptions: true,
      field: {
        ...field,
        options: [
          option(),
          option({ id: 'option-2', label: 'Retired', withdrawn: true }),
        ],
      },
    });

    expect(component.liveOptionCount).toBe(1);
    expect(text()).toContain('1 to choose from');
  });

  it('counts nothing for a field that offers no choices', () => {
    build({ usesOptions: false });

    expect(text()).not.toContain('to choose from');
  });

  // A choice field with nothing to choose from cannot be answered at all, and
  // that is worth saying before somebody tries.
  it('warns when a choice field offers nothing yet', () => {
    build({ usesOptions: true });

    expect(component.needsOptions).toBe(true);
    expect(text()).toContain('offers nothing to choose from yet');
  });

  it('says nothing once a choice field offers something', () => {
    build({ usesOptions: true, field: { ...field, options: [option()] } });

    expect(component.needsOptions).toBe(false);
  });

  it('asks to be edited, deleted and moved', () => {
    build({ index: 1, count: 3 });

    const events: string[] = [];
    component.edited.subscribe(() => events.push('edited'));
    component.removed.subscribe(() => events.push('removed'));
    component.moveUp.subscribe(() => events.push('up'));
    component.moveDown.subscribe(() => events.push('down'));

    buttonLabelled('Edit Class').click();
    buttonLabelled('Delete Class').click();
    buttonLabelled('Move Class up').click();
    buttonLabelled('Move Class down').click();

    expect(events).toEqual(['edited', 'removed', 'up', 'down']);
  });

  it('offers nothing while a change is in flight', () => {
    build({ isSaving: true });

    expect(buttonLabelled('Edit Class').disabled).toBe(true);
    expect(buttonLabelled('Delete Class').disabled).toBe(true);
  });
});
