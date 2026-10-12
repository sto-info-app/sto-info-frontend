import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollapsibleSectionComponent } from './collapsible-section.component';

/** Hosts the section with something projected into it. */
@Component({
  standalone: true,
  imports: [CollapsibleSectionComponent],
  template: `<app-collapsible-section heading="A heading">
    <p>Projected content.</p>
  </app-collapsible-section>`,
})
class HostComponent {}

/** Hosts the section with a control of its own on the bar. */
@Component({
  standalone: true,
  imports: [CollapsibleSectionComponent],
  template: `<app-collapsible-section heading="With an action">
    <button
      sectionActions
      type="button"
      class="cta-icon"
      id="edit">
      Edit
    </button>
    <p>Projected content.</p>
  </app-collapsible-section>`,
})
class ActionHostComponent {}

describe('CollapsibleSectionComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  /**
   * Reads the host's text.
   *
   * @returns Everything the host renders.
   */
  const hostText = (): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  /**
   * Finds the toggle button.
   *
   * @returns The button that folds the section away.
   */
  const toggleButton = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show its heading', () => {
    expect(hostText()).toContain('A heading');
  });

  // A reader arriving at a page wants to read it, not to open it first.
  it('should start open', () => {
    expect(hostText()).toContain('Projected content.');
    expect(toggleButton().getAttribute('aria-expanded')).toBe('true');
  });

  it('should fold its content away when toggled', () => {
    toggleButton().click();
    fixture.detectChanges();

    expect(hostText()).not.toContain('Projected content.');
    expect(toggleButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('should open again when toggled a second time', () => {
    toggleButton().click();
    fixture.detectChanges();
    toggleButton().click();
    fixture.detectChanges();

    expect(hostText()).toContain('Projected content.');
    expect(toggleButton().getAttribute('aria-expanded')).toBe('true');
  });

  it('should say which way the toggle goes', () => {
    expect(toggleButton().getAttribute('title')).toBe('Collapse');

    toggleButton().click();
    fixture.detectChanges();

    expect(toggleButton().getAttribute('title')).toBe('Expand');
  });

  it('should swap the caret with the state', () => {
    const icon = (): Element | null =>
      (fixture.nativeElement as HTMLElement).querySelector('button i');

    expect(icon()?.classList).toContain('fa-caret-up');

    toggleButton().click();
    fixture.detectChanges();

    expect(icon()?.classList).toContain('fa-caret-down');
  });

  // The button announces what it controls, so the content it hides has to
  // carry that same id.
  it('should tie the button to the content it controls', () => {
    const contentId = toggleButton().getAttribute('aria-controls');

    expect(contentId).toBeTruthy();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(`#${contentId}`),
    ).not.toBeNull();
  });

  // Two sections on one page must not claim the same id, or a screen reader
  // follows aria-controls to the wrong content.
  it('should give each section an id of its own', () => {
    const other = TestBed.createComponent(HostComponent);
    other.detectChanges();

    const otherId = (other.nativeElement as HTMLElement)
      .querySelector('button')
      ?.getAttribute('aria-controls');

    expect(otherId).not.toBe(toggleButton().getAttribute('aria-controls'));
  });

  describe('with a bar action', () => {
    let actionFixture: ComponentFixture<ActionHostComponent>;

    // The outer beforeEach has already configured and instantiated the test
    // module; a standalone host needs no second configuration to be created.
    beforeEach(() => {
      actionFixture = TestBed.createComponent(ActionHostComponent);
      actionFixture.detectChanges();
    });

    it('should lay the host action in the bar ahead of the caret', () => {
      const group = (actionFixture.nativeElement as HTMLElement).querySelector(
        '.lcars-text-bar .lcars-bar-actions',
      ) as HTMLElement;
      const buttons = [...group.querySelectorAll('button')];

      expect(buttons.map(b => b.id || b.getAttribute('aria-expanded'))).toEqual(
        ['edit', 'true'],
      );
    });

    it('should keep the action out of the content that folds away', () => {
      const host = actionFixture.nativeElement as HTMLElement;
      (
        host.querySelector('button[aria-expanded]') as HTMLButtonElement
      ).click();
      actionFixture.detectChanges();

      expect(host.querySelector('#edit')).not.toBeNull();
      expect(host.textContent).not.toContain('Projected content.');
    });
  });
});
