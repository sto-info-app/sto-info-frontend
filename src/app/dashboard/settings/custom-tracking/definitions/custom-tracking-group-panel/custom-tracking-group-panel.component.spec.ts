import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomTrackingGroupPanelComponent } from './custom-tracking-group-panel.component';

describe('CustomTrackingGroupPanelComponent', () => {
  let fixture: ComponentFixture<CustomTrackingGroupPanelComponent>;
  let component: CustomTrackingGroupPanelComponent;

  const text = (): string => fixture.nativeElement.textContent as string;

  const buttonLabelled = (label: string): HTMLButtonElement =>
    fixture.nativeElement.querySelector(`button[aria-label="${label}"]`);

  const toggle = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.custom-tracking-panel-toggle');

  const build = (
    overrides: Partial<CustomTrackingGroupPanelComponent> = {},
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingGroupPanelComponent);
    component = fixture.componentInstance;
    component.name = 'Ship collection';
    component.childKind = 'tab';
    component.index = 0;
    component.count = 2;
    Object.assign(component, overrides);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingGroupPanelComponent],
    }).compileComponents();
  });

  it('says what it is called and what is inside it', () => {
    build({ childCount: 4 });

    expect(text()).toContain('Ship collection');
    expect(text()).toContain('4 tabs');
  });

  it('counts one child without pluralising it', () => {
    build({ childCount: 1 });

    expect(component.childSummary).toBe('1 tab');
  });

  it('counts an empty panel as none', () => {
    build({ childCount: 0 });

    expect(component.childSummary).toBe('0 tabs');
  });

  // A viewer needs to be told which state the panel is in, not just shown it.
  it('reports whether it is open', () => {
    build({ isExpanded: false });

    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-controls')).toBe(component.contentId);

    build({ isExpanded: true });

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('hides what is inside while it is closed', () => {
    build({ isExpanded: false, description: 'Everything I fly.' });

    const body: HTMLElement = fixture.nativeElement.querySelector(
      '.custom-tracking-panel-body',
    );

    expect(body.hidden).toBe(true);
  });

  it('shows what it is for once it is open', () => {
    build({ isExpanded: true, description: 'Everything I fly.' });

    expect(text()).toContain('Everything I fly.');
  });

  it('asks to be opened when its bar is pressed', () => {
    build();

    let toggled = 0;
    component.toggled.subscribe(() => toggled++);

    toggle().click();

    expect(toggled).toBe(1);
  });

  // Public is opt-in, so a panel says which it is either way rather than
  // leaving silence to mean private.
  it('says whether it is public', () => {
    build({ publiclyVisible: true });

    expect(text()).toContain('Public');

    build({ publiclyVisible: false });

    expect(text()).toContain('Private');
  });

  it('says when a moderator has hidden it', () => {
    build({ suppressed: true });

    expect(text()).toContain('Hidden by a moderator');
  });

  it('says nothing about moderation when nothing has happened', () => {
    build({ suppressed: false });

    expect(text()).not.toContain('Hidden by a moderator');
  });

  it('asks to be edited and deleted', () => {
    build({ isExpanded: true });

    const events: string[] = [];
    component.edited.subscribe(() => events.push('edited'));
    component.removed.subscribe(() => events.push('removed'));

    buttonLabelled('Edit Ship collection').click();
    buttonLabelled('Delete Ship collection').click();

    expect(events).toEqual(['edited', 'removed']);
  });

  it('asks to be moved', () => {
    build({ index: 1, count: 3 });

    const moves: string[] = [];
    component.moveUp.subscribe(() => moves.push('up'));
    component.moveDown.subscribe(() => moves.push('down'));

    buttonLabelled('Move Ship collection up').click();
    buttonLabelled('Move Ship collection down').click();

    expect(moves).toEqual(['up', 'down']);
  });

  it('offers nothing while a change is in flight', () => {
    build({ isExpanded: true, isSaving: true });

    expect(buttonLabelled('Edit Ship collection').disabled).toBe(true);
    expect(buttonLabelled('Delete Ship collection').disabled).toBe(true);
  });
});
