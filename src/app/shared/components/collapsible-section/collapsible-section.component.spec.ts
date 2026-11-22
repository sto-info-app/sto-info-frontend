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

/** Hosts two sections that share a heading, told apart by their keys. */
@Component({
  standalone: true,
  imports: [CollapsibleSectionComponent],
  template: `<app-collapsible-section
      heading="Twice"
      sectionKey="first">
      <p>First.</p>
    </app-collapsible-section>
    <app-collapsible-section
      heading="Twice"
      sectionKey="second">
      <p>Second.</p>
    </app-collapsible-section>`,
})
class KeyedHostComponent {}

/** Hosts a section with a count on its bar. */
@Component({
  standalone: true,
  imports: [CollapsibleSectionComponent],
  template: `<app-collapsible-section
    heading="Chat Queue"
    [badge]="3">
    <p>Queue.</p>
  </app-collapsible-section>`,
})
class BadgeHostComponent {}

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
   * Says whether the section's content is showing.
   *
   * @returns False once it is folded away.
   */
  const contentShown = (): boolean =>
    !(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.collapsible-section__content',
      ) as HTMLElement
    ).hidden;

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
    localStorage.clear();
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

    expect(contentShown()).toBe(false);
    expect(toggleButton().getAttribute('aria-expanded')).toBe('false');
  });

  // A form part way through keeps what was typed while it is folded away.
  it('should keep folded content in the page', () => {
    toggleButton().click();
    fixture.detectChanges();

    expect(hostText()).toContain('Projected content.');
  });

  // What a reader folds stays folded on their next visit to the page.
  it('should open folded on a page where the reader folded it', () => {
    toggleButton().click();
    fixture.detectChanges();

    const again = TestBed.createComponent(HostComponent);
    again.detectChanges();

    expect(
      (again.nativeElement as HTMLElement)
        .querySelector('button')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('should open again on the next visit once the reader opens it', () => {
    toggleButton().click();
    fixture.detectChanges();
    toggleButton().click();
    fixture.detectChanges();

    const again = TestBed.createComponent(HostComponent);
    again.detectChanges();

    expect(
      (again.nativeElement as HTMLElement)
        .querySelector('button')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('should open again when toggled a second time', () => {
    toggleButton().click();
    fixture.detectChanges();
    toggleButton().click();
    fixture.detectChanges();

    expect(contentShown()).toBe(true);
    expect(toggleButton().getAttribute('aria-expanded')).toBe('true');
  });

  // A link to something inside a folded section opens it, and leaves an open
  // one as it is.
  it('should open when revealed, and remember it open', () => {
    const section = fixture.debugElement.children[0]
      .componentInstance as CollapsibleSectionComponent;

    section.reveal();
    fixture.detectChanges();

    expect(contentShown()).toBe(true);

    toggleButton().click();
    fixture.detectChanges();
    section.reveal();
    fixture.detectChanges();

    expect(contentShown()).toBe(true);

    const again = TestBed.createComponent(HostComponent);
    again.detectChanges();

    expect(
      (again.nativeElement as HTMLElement)
        .querySelector('button')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
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
      expect(
        (host.querySelector('.collapsible-section__content') as HTMLElement)
          .hidden,
      ).toBe(true);
    });
  });

  // Two sections with one heading are still two sections to remember.
  it('should remember a section by its key where one is given', () => {
    const keyed = TestBed.createComponent(KeyedHostComponent);
    keyed.detectChanges();
    (
      (keyed.nativeElement as HTMLElement).querySelector(
        'button',
      ) as HTMLButtonElement
    ).click();
    keyed.detectChanges();

    const again = TestBed.createComponent(KeyedHostComponent);
    again.detectChanges();

    expect(
      [...(again.nativeElement as HTMLElement).querySelectorAll('button')].map(
        button => button.getAttribute('aria-expanded'),
      ),
    ).toEqual(['false', 'true']);
  });

  describe('with a badge', () => {
    it('draws none by default', () => {
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.header-count-badge',
        ),
      ).toBeNull();
    });

    it('draws the badge beside the heading', () => {
      const badged = TestBed.createComponent(BadgeHostComponent);
      badged.detectChanges();

      const title = (badged.nativeElement as HTMLElement).querySelector(
        '.collapsible-section__title .title-with-badge',
      );

      expect(title?.textContent).toContain('Chat Queue');
      expect(title?.querySelector('.header-count-badge')?.textContent).toBe(
        '3',
      );
    });
  });

  // Every section is a region named by its heading alone, so a reader and a
  // test find it by that name, badge or no badge.
  it('names its region by its heading', () => {
    const region = (fixture.nativeElement as HTMLElement).querySelector(
      'section.collapsible-section',
    );
    const label = (fixture.nativeElement as HTMLElement).querySelector(
      `#${region?.getAttribute('aria-labelledby')}`,
    );

    expect(label?.textContent).toBe('A heading');
  });

  it('leaves the badge out of the region name', () => {
    const badged = TestBed.createComponent(BadgeHostComponent);
    badged.detectChanges();
    const host = badged.nativeElement as HTMLElement;
    const region = host.querySelector('section.collapsible-section');

    expect(
      host.querySelector(`#${region?.getAttribute('aria-labelledby')}`)
        ?.textContent,
    ).toBe('Chat Queue');
  });
});
