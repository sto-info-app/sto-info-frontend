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
});
