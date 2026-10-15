import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LcarsPanelAccent, LcarsPanelComponent } from './lcars-panel.component';

/** Hosts a panel with marks and content projected into it. */
@Component({
  standalone: true,
  imports: [LcarsPanelComponent],
  template: `<app-lcars-panel
    [heading]="heading()"
    [level]="level()"
    [accent]="accent()">
    <span
      panelMarks
      class="mark"
      >3 open</span
    >
    <p>Panel content.</p>
  </app-lcars-panel>`,
})
class HostComponent {
  readonly heading = signal('Following');
  readonly level = signal<2 | 3 | 4>(3);
  readonly accent = signal<LcarsPanelAccent | null>(null);
}

/** Hosts a panel with nothing to put on its heading block. */
@Component({
  standalone: true,
  imports: [LcarsPanelComponent],
  template: `<app-lcars-panel heading="Plain"><p>Body.</p></app-lcars-panel>`,
})
class PlainHostComponent {}

/** Hosts a search panel the reader may fold away. */
@Component({
  standalone: true,
  imports: [LcarsPanelComponent],
  template: `<app-lcars-panel
    heading="Search"
    [collapsible]="true"
    [panelKey]="panelKey()"
    ><input aria-label="Name"
  /></app-lcars-panel>`,
})
class CollapsibleHostComponent {
  readonly panelKey = signal('');
}

describe('LcarsPanelComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  /**
   * Finds an element in the host.
   *
   * @param selector - What to find.
   * @returns The element, or null.
   */
  const find = (selector: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(selector);

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('puts its name on the heading block, as a level-three heading', () => {
    const name = find('.lcars-panel__heading h3');

    expect(name?.textContent?.trim()).toBe('Following');
  });

  it.each([
    [2, 'h2'],
    [4, 'h4'],
  ] as const)('draws a level-%d heading where asked', (level, tag) => {
    fixture.componentInstance.level.set(level);
    fixture.detectChanges();

    expect(find(`.lcars-panel__heading ${tag}`)?.textContent?.trim()).toBe(
      'Following',
    );
  });

  // A screen reader announces the region by the name on its block.
  it('labels its region with its name', () => {
    const region = find('section.lcars-panel');
    const name = find('.lcars-panel__name');

    expect(region?.getAttribute('aria-labelledby')).toBe(name?.id);
  });

  it('lays projected marks on the heading block and content in the body', () => {
    expect(find('.lcars-panel__marks .mark')?.textContent).toBe('3 open');
    expect(find('.lcars-panel__body p')?.textContent).toBe('Panel content.');
  });

  // With no accent of its own a panel takes the page's rotation.
  it('carries no accent class of its own by default', () => {
    expect(find('app-lcars-panel')?.className).toBe('');
  });

  it('names its own accent where one is given', () => {
    fixture.componentInstance.accent.set('tangerine');
    fixture.detectChanges();

    expect(find('app-lcars-panel')?.classList).toContain('accent-tangerine');
  });

  it('gives each panel a name id of its own', () => {
    const plain = TestBed.createComponent(PlainHostComponent);
    plain.detectChanges();

    const plainId = (plain.nativeElement as HTMLElement).querySelector(
      '.lcars-panel__name',
    )?.id;

    expect(plainId).not.toBe(find('.lcars-panel__name')?.id);
  });

  // A search or a set of filters folds away, remembered for the page as a section's fold is.
  describe('when collapsible', () => {
    let host: ComponentFixture<CollapsibleHostComponent>;

    const toggle = (): HTMLButtonElement =>
      (host.nativeElement as HTMLElement).querySelector(
        '.lcars-panel__toggle',
      ) as HTMLButtonElement;
    const body = (): HTMLElement =>
      (host.nativeElement as HTMLElement).querySelector(
        '.lcars-panel__body',
      ) as HTMLElement;

    const show = (panelKey = ''): void => {
      host = TestBed.createComponent(CollapsibleHostComponent);
      host.componentInstance.panelKey.set(panelKey);
      host.detectChanges();
    };

    it('opens with a caret that says what it does and what it controls', () => {
      show();

      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(toggle().getAttribute('aria-controls')).toBe(body().id);
      expect(toggle().title).toBe('Collapse');
      expect(body().hidden).toBe(false);
    });

    it('hides its body rather than removing it, and opens it again', () => {
      show();
      const input = body().querySelector('input') as HTMLInputElement;
      input.value = 'Starfleet';

      toggle().click();
      host.detectChanges();

      expect(body().hidden).toBe(true);
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(toggle().title).toBe('Expand');
      expect((body().querySelector('input') as HTMLInputElement).value).toBe(
        'Starfleet',
      );

      toggle().click();
      host.detectChanges();

      expect(body().hidden).toBe(false);
    });

    it('stays folded on the next visit to the page', () => {
      show();
      toggle().click();
      host.detectChanges();

      show();

      expect(body().hidden).toBe(true);
    });

    it('remembers a fold by its key where one is given', () => {
      show('directory-search');
      toggle().click();
      host.detectChanges();

      show();
      expect(body().hidden).toBe(false);

      show('directory-search');
      expect(body().hidden).toBe(true);
    });
  });

  it('draws no caret and never folds unless asked', () => {
    expect(find('.lcars-panel__toggle')).toBeNull();
    expect(find('.lcars-panel__body')?.hidden).toBe(false);
  });
});
