import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CustomTrackingLimits,
  CustomTrackingSection,
  CustomTrackingTargetScope,
} from 'src/app/models/custom-tracking.models';

import { CustomTrackingGroupInput } from '../../custom-tracking.service';
import { CustomTrackingGroupFormComponent } from './custom-tracking-group-form.component';

describe('CustomTrackingGroupFormComponent', () => {
  const limits = {
    MAX_LABEL_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
  } as CustomTrackingLimits;

  const section: CustomTrackingSection = {
    id: 'section-1',
    targetScope: CustomTrackingTargetScope.ACCOUNT,
    name: 'Ship collection',
    description: 'Everything I fly.',
    orderIndex: 1000,
    publiclyVisible: true,
    suppressed: false,
  };

  let fixture: ComponentFixture<CustomTrackingGroupFormComponent>;
  let component: CustomTrackingGroupFormComponent;
  let saved: CustomTrackingGroupInput[];

  const text = (): string => fixture.nativeElement.textContent as string;

  const submitButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button[type="submit"]');

  const build = (
    overrides: Partial<CustomTrackingGroupFormComponent> = {},
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingGroupFormComponent);
    component = fixture.componentInstance;
    component.kind = 'section';
    component.limits = limits;
    Object.assign(component, overrides);
    saved = [];
    component.saved.subscribe(input => saved.push(input));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingGroupFormComponent],
    }).compileComponents();
  });

  it('opens empty when something is being created', () => {
    build();

    expect(component.isNew).toBe(true);
    expect(component.groupForm.getRawValue()).toEqual({
      name: '',
      description: '',
      publiclyVisible: false,
    });
    expect(text()).toContain('New section');
  });

  it('opens filled in when something is being changed', () => {
    build({ group: section });

    expect(component.isNew).toBe(false);
    expect(component.groupForm.getRawValue()).toEqual({
      name: 'Ship collection',
      description: 'Everything I fly.',
      publiclyVisible: true,
    });
    expect(text()).toContain('Edit section');
  });

  it('shows a missing description as empty rather than as absent', () => {
    build({ group: { ...section, description: null } });

    expect(component.groupForm.value.description).toBe('');
  });

  it('cannot be saved without a name', () => {
    build();

    expect(submitButton().disabled).toBe(true);

    component.groupForm.controls.name.setValue('Ship collection');
    fixture.detectChanges();

    expect(submitButton().disabled).toBe(false);
  });

  it('refuses a name longer than the server accepts', () => {
    build();

    component.groupForm.controls.name.setValue('x'.repeat(101));

    expect(component.groupForm.controls.name.invalid).toBe(true);
  });

  it('refuses a description longer than the server accepts', () => {
    build();

    component.groupForm.controls.description.setValue('x'.repeat(501));

    expect(component.groupForm.controls.description.invalid).toBe(true);
  });

  it('names the field that is wrong once it has been touched', () => {
    build();

    component.groupForm.controls.name.markAsTouched();
    fixture.detectChanges();

    expect(text()).toContain('Give this section a name');
  });

  // Empty and absent mean the same thing to a reader, so only one of them is
  // ever stored.
  it('sends an empty description as nothing at all', () => {
    build();

    component.groupForm.setValue({
      name: '  Ship collection  ',
      description: '   ',
      publiclyVisible: false,
    });
    component.submit();

    expect(saved).toEqual([
      {
        name: 'Ship collection',
        description: null,
        publiclyVisible: false,
      },
    ]);
  });

  it('sends what was entered', () => {
    build();

    component.groupForm.setValue({
      name: 'Ship collection',
      description: 'Everything I fly.',
      publiclyVisible: true,
    });
    component.submit();

    expect(saved).toEqual([
      {
        name: 'Ship collection',
        description: 'Everything I fly.',
        publiclyVisible: true,
      },
    ]);
  });

  it('sends nothing while it is invalid', () => {
    build();

    component.submit();

    expect(saved).toEqual([]);
  });

  it('does not send twice while one save is in flight', () => {
    build({ isSaving: true });

    component.groupForm.controls.name.setValue('Ship collection');
    component.submit();

    expect(saved).toEqual([]);
  });

  // Otherwise a user has to discover it from a public page that shows nothing.
  it('says a public tab stays private beneath a private section', () => {
    build({ kind: 'tab', ancestorPublic: false });

    component.groupForm.controls.publiclyVisible.setValue(true);
    fixture.detectChanges();

    expect(component.isPublicBeneathPrivate).toBe(true);
    expect(text()).toContain('will stay private for now');
  });

  it('says nothing about ancestors when everything above is public', () => {
    build({ kind: 'tab', ancestorPublic: true });

    component.groupForm.controls.publiclyVisible.setValue(true);
    fixture.detectChanges();

    expect(component.isPublicBeneathPrivate).toBe(false);
    expect(text()).not.toContain('will stay private for now');
  });

  it('reports what the server said', () => {
    build({ errorMessage: 'That name is already used.' });

    expect(text()).toContain('That name is already used.');
  });

  it('can be backed out of', () => {
    build();

    let cancelled = 0;
    component.cancelled.subscribe(() => cancelled++);

    const cancel: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[type="button"].lcars-btn',
    );
    cancel.click();

    expect(cancelled).toBe(1);
  });
});
