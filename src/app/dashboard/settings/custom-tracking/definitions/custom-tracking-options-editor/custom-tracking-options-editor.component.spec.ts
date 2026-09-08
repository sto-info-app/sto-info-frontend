import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CustomTrackingLimits,
  CustomTrackingOption,
} from 'src/app/models/custom-tracking.models';

import {
  CustomTrackingOptionDefault,
  CustomTrackingOptionRename,
  CustomTrackingOptionsEditorComponent,
} from './custom-tracking-options-editor.component';

describe('CustomTrackingOptionsEditorComponent', () => {
  const limits = {
    MAX_LABEL_LENGTH: 100,
    MAX_OPTIONS_PER_FIELD: 3,
  } as CustomTrackingLimits;

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

  let fixture: ComponentFixture<CustomTrackingOptionsEditorComponent>;
  let component: CustomTrackingOptionsEditorComponent;

  const text = (): string => fixture.nativeElement.textContent as string;

  const build = (
    options: CustomTrackingOption[],
    overrides: Partial<CustomTrackingOptionsEditorComponent> = {},
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingOptionsEditorComponent);
    component = fixture.componentInstance;
    component.options = options;
    component.limits = limits;
    Object.assign(component, overrides);
    fixture.detectChanges();
  };

  const buttonLabelled = (label: string): HTMLButtonElement =>
    fixture.nativeElement.querySelector(`button[aria-label="${label}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingOptionsEditorComponent],
    }).compileComponents();
  });

  it('says when a field offers nothing to choose yet', () => {
    build([]);

    expect(text()).toContain('This field offers nothing to choose yet');
  });

  it('counts the live options against the published ceiling', () => {
    build([option(), option({ id: 'option-2', label: 'Cruiser' })]);

    expect(text()).toContain('2 of 3');
  });

  it('adds what was typed', () => {
    build([]);

    const added: string[] = [];
    component.created.subscribe(label => added.push(label));

    component.newLabel.setValue('  Science  ');
    component.add();

    expect(added).toEqual(['Science']);
    expect(component.newLabel.value).toBe('');
  });

  it('adds nothing when nothing was typed', () => {
    build([]);

    const added: string[] = [];
    component.created.subscribe(label => added.push(label));

    component.newLabel.setValue('   ');
    component.add();

    expect(added).toEqual([]);
  });

  it('adds nothing while a change is in flight', () => {
    build([], { isSaving: true });

    const added: string[] = [];
    component.created.subscribe(label => added.push(label));

    component.newLabel.setValue('Science');
    component.add();

    expect(added).toEqual([]);
  });

  // A withdrawn option occupies no place in what a user can choose from, so it
  // is the live ones that count against the ceiling.
  it('stops offering to add once the ceiling is reached', () => {
    build([
      option(),
      option({ id: 'option-2', label: 'Cruiser' }),
      option({ id: 'option-3', label: 'Science' }),
    ]);

    expect(component.isFull).toBe(true);
    expect(text()).toContain('already offering the most');
  });

  it('does not count withdrawn options against the ceiling', () => {
    build([
      option(),
      option({ id: 'option-2', label: 'Cruiser' }),
      option({ id: 'option-3', label: 'Retired', withdrawn: true }),
    ]);

    expect(component.isFull).toBe(false);
  });

  it('adds nothing once the ceiling is reached', () => {
    build([
      option(),
      option({ id: 'option-2', label: 'Cruiser' }),
      option({ id: 'option-3', label: 'Science' }),
    ]);

    const added: string[] = [];
    component.created.subscribe(label => added.push(label));

    component.newLabel.setValue('Carrier');
    component.add();

    expect(added).toEqual([]);
  });

  // The option keeps its identity, which is what lets a label be corrected
  // without rewriting every value that chose it.
  it('rewords an option without replacing it', () => {
    build([option()]);

    const renames: CustomTrackingOptionRename[] = [];
    component.renamed.subscribe(rename => renames.push(rename));

    component.startEditing(option());
    fixture.detectChanges();

    expect(component.editedLabel.value).toBe('Escort');

    component.editedLabel.setValue('  Escort carrier  ');
    component.saveEditing(option());

    expect(renames).toEqual([
      { optionId: 'option-1', label: 'Escort carrier' },
    ]);
    expect(component.editingOptionId).toBeNull();
  });

  it('rewords nothing when the wording was cleared', () => {
    build([option()]);

    const renames: CustomTrackingOptionRename[] = [];
    component.renamed.subscribe(rename => renames.push(rename));

    component.startEditing(option());
    component.editedLabel.setValue('  ');
    component.saveEditing(option());

    expect(renames).toEqual([]);
  });

  it('rewords nothing while a change is in flight', () => {
    build([option()], { isSaving: true });

    const renames: CustomTrackingOptionRename[] = [];
    component.renamed.subscribe(rename => renames.push(rename));

    component.startEditing(option());
    component.editedLabel.setValue('Escort carrier');
    component.saveEditing(option());

    expect(renames).toEqual([]);
  });

  it('can back out of a rewording', () => {
    build([option()]);

    component.startEditing(option());
    component.cancelEditing();

    expect(component.editingOptionId).toBeNull();
  });

  it('turns a default on and off', () => {
    build([option({ isDefault: true })]);

    const defaults: CustomTrackingOptionDefault[] = [];
    component.defaultToggled.subscribe(change => defaults.push(change));

    component.toggleDefault(option({ isDefault: true }));
    component.toggleDefault(option({ isDefault: false }));

    expect(defaults).toEqual([
      { optionId: 'option-1', isDefault: false },
      { optionId: 'option-1', isDefault: true },
    ]);
  });

  it('changes no default while a change is in flight', () => {
    build([option()], { isSaving: true });

    const defaults: CustomTrackingOptionDefault[] = [];
    component.defaultToggled.subscribe(change => defaults.push(change));

    component.toggleDefault(option());

    expect(defaults).toEqual([]);
  });

  it('withdraws an option when asked', () => {
    build([option()]);

    const withdrawals: CustomTrackingOption[] = [];
    component.withdrawn.subscribe(value => withdrawals.push(value));

    buttonLabelled('Withdraw Escort').click();

    expect(withdrawals).toEqual([expect.objectContaining({ id: 'option-1' })]);
  });

  it('withdraws nothing while a change is in flight', () => {
    build([option()], { isSaving: true });

    const withdrawals: CustomTrackingOption[] = [];
    component.withdrawn.subscribe(value => withdrawals.push(value));

    component.withdraw(option());

    expect(withdrawals).toEqual([]);
  });

  // A value that already chose one has to go on reading correctly, and an
  // editor offering to replace it has to be able to say what it was.
  it('keeps withdrawn options listed and says why', () => {
    build([
      option(),
      option({ id: 'option-2', label: 'Retired', withdrawn: true }),
    ]);

    expect(component.withdrawnOptions).toEqual([
      expect.objectContaining({ id: 'option-2' }),
    ]);
    expect(text()).toContain('Withdrawn');
    expect(text()).toContain('go on reading correctly');
  });

  // A complete list either describes the collection exactly or does not, and
  // the server says which.
  it('asks for a new order as the whole list', () => {
    build([
      option(),
      option({ id: 'option-2', label: 'Cruiser' }),
      option({ id: 'option-3', label: 'Science' }),
    ]);

    const orders: string[][] = [];
    component.reordered.subscribe(order => orders.push(order));

    component.moveDown(0);
    component.moveUp(2);

    expect(orders).toEqual([
      ['option-2', 'option-1', 'option-3'],
      ['option-1', 'option-3', 'option-2'],
    ]);
  });

  it('asks for no order while a change is in flight', () => {
    build([option(), option({ id: 'option-2', label: 'Cruiser' })], {
      isSaving: true,
    });

    const orders: string[][] = [];
    component.reordered.subscribe(order => orders.push(order));

    component.moveDown(0);

    expect(orders).toEqual([]);
  });

  // Nothing typed while recording a value joins the list; the taxonomy is
  // defined here and only here.
  it('says where a tag list comes from', () => {
    build([option()], { optionNoun: 'tag' });

    expect(text()).toContain('A tag field draws from this list');
  });

  it('says how many choices a single-answer field takes', () => {
    build([option()], { allowsMultiple: false });

    expect(text()).toContain('Exactly one of these may be chosen');
  });

  it('says how many choices a multiple-answer field takes', () => {
    build([option()], { allowsMultiple: true });

    expect(text()).toContain('More than one of these may be chosen');
  });
});
