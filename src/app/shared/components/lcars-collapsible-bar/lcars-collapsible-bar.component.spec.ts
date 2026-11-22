import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LcarsCollapsibleBarComponent } from './lcars-collapsible-bar.component';

/** A page with one group of controls under the bar. */
@Component({
  selector: 'app-collapsible-bar-host',
  standalone: true,
  imports: [LcarsCollapsibleBarComponent],
  template: `
    <app-lcars-collapsible-bar
      label="Sort"
      [(collapsed)]="sortCollapsed" />
    @if (!sortCollapsed) {
      <p class="group">Sort controls</p>
    }
  `,
})
class CollapsibleBarHostComponent {
  sortCollapsed = false;
}

describe('LcarsCollapsibleBarComponent', () => {
  let fixture: ComponentFixture<CollapsibleBarHostComponent>;

  /** @returns The page as rendered. */
  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /** @returns The caret's button. */
  const caret = (): HTMLButtonElement =>
    page().querySelector('button.cta-icon') as HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CollapsibleBarHostComponent] });
    fixture = TestBed.createComponent(CollapsibleBarHostComponent);
    fixture.detectChanges();
  });

  it('names the group, and offers to hide it while it is shown', () => {
    expect(page().querySelector('.lcars-text-bar span')?.textContent).toBe(
      'Sort',
    );
    expect(caret().title).toBe('Hide Sort');
    expect(caret().querySelector('i')?.classList).toContain('fa-caret-up');
    expect(page().querySelector('.group')).not.toBeNull();
  });

  it('hides the group, then shows it again', () => {
    caret().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.sortCollapsed).toBe(true);
    expect(caret().title).toBe('Show Sort');
    expect(caret().querySelector('i')?.classList).toContain('fa-caret-down');
    expect(page().querySelector('.group')).toBeNull();

    caret().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.sortCollapsed).toBe(false);
    expect(page().querySelector('.group')).not.toBeNull();
  });
});
