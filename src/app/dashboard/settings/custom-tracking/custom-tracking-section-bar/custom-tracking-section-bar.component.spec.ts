import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomTrackingSectionBarComponent } from './custom-tracking-section-bar.component';

describe('CustomTrackingSectionBarComponent', () => {
  let fixture: ComponentFixture<CustomTrackingSectionBarComponent>;
  let component: CustomTrackingSectionBarComponent;

  const text = (): string => fixture.nativeElement.textContent as string;

  const toggle = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.custom-tracking-panel-toggle');

  const build = (
    overrides: Partial<CustomTrackingSectionBarComponent> = {},
  ): void => {
    fixture = TestBed.createComponent(CustomTrackingSectionBarComponent);
    component = fixture.componentInstance;
    component.name = 'Ship collection';
    component.contentId = 'section-body';
    Object.assign(component, overrides);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTrackingSectionBarComponent],
    }).compileComponents();
  });

  it('says what the section is called', () => {
    build();

    expect(text()).toContain('Ship collection');
  });

  it('says what it holds where it was given a count', () => {
    build({ summary: '4 tabs' });

    expect(text()).toContain('4 tabs');
  });

  it('counts nothing where it was given nothing to count', () => {
    build();

    expect(
      fixture.nativeElement.querySelector('.custom-tracking-count'),
    ).toBeNull();
  });

  // The builder states a section's visibility on the info panel just beneath
  // this bar. Saying it twice, a line apart, is one statement too many.
  it('says nothing about visibility where it was told nothing', () => {
    build();

    expect(text()).not.toContain('Public');
    expect(text()).not.toContain('Private');
  });

  // Public is opt-in, so a bar told about visibility says which it is either
  // way rather than leaving silence to mean private.
  it('says whether the section is public', () => {
    build({ publiclyVisible: true });

    expect(text()).toContain('Public');

    build({ publiclyVisible: false });

    expect(text()).toContain('Private');
  });

  it('says when a moderator has hidden it', () => {
    build({ suppressed: true });

    expect(text()).toContain('Hidden by a moderator');

    build({ suppressed: false });

    expect(text()).not.toContain('Hidden by a moderator');
  });

  // A viewer has to be told which state the section is in, not only shown it.
  it('reports what the caret controls and whether it is open', () => {
    build({ isExpanded: false });

    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-controls')).toBe('section-body');
    expect(toggle().getAttribute('aria-label')).toBe('Expand Ship collection');

    build({ isExpanded: true });

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(component.toggleLabel).toBe('Collapse Ship collection');
  });

  it('asks to be opened when the caret is pressed', () => {
    build();

    let toggled = 0;
    component.toggled.subscribe(() => toggled++);

    toggle().click();

    expect(toggled).toBe(1);
  });
});
