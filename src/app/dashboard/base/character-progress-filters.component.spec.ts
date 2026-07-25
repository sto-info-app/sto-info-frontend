import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterProgressFiltersComponent } from './character-progress-filters.component';

describe('CharacterProgressFiltersComponent', () => {
  let component: CharacterProgressFiltersComponent;
  let fixture: ComponentFixture<CharacterProgressFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterProgressFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterProgressFiltersComponent);
    component = fixture.componentInstance;
    component.searchId = 'item-search';
    component.searchLabel = 'Search items';
  });

  it('renders the expanded controls with the supplied search metadata', () => {
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('#item-search');
    const toggle: HTMLButtonElement =
      fixture.nativeElement.querySelector('.cta-icon');

    expect(input.placeholder).toBe('Search items…');
    expect(toggle.getAttribute('aria-label')).toBe('Hide Filters');
    expect(
      fixture.nativeElement.querySelector('.clear-filters-btn'),
    ).toBeNull();
  });

  it('emits filter changes and commands', async () => {
    component.completeCount = 1;
    component.activeFilterCount = 1;
    component.searchText = 'omega';
    const collapsedSpy = jest.fn();
    const searchSpy = jest.fn();
    const hideCompleteSpy = jest.fn();
    const clearSpy = jest.fn();
    const refreshSpy = jest.fn();
    component.filtersCollapsedChange.subscribe(collapsedSpy);
    component.searchTextChange.subscribe(searchSpy);
    component.hideCompleteChange.subscribe(hideCompleteSpy);
    component.clearFilters.subscribe(clearSpy);
    component.refresh.subscribe(refreshSpy);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.cta-icon').click();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('#item-search');
    input.value = 'delta';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.filter-section button'),
    );
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();

    expect(collapsedSpy).toHaveBeenCalledWith(true);
    expect(searchSpy).toHaveBeenCalledWith('delta');
    expect(hideCompleteSpy).toHaveBeenCalledWith(true);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('hides the controls and offers to expand them when collapsed', () => {
    component.filtersCollapsed = true;
    fixture.detectChanges();

    const toggle: HTMLButtonElement =
      fixture.nativeElement.querySelector('.cta-icon');
    expect(toggle.getAttribute('aria-label')).toBe('Show Filters');
    expect(fixture.nativeElement.querySelector('.filter-section')).toBeNull();
  });

  it('offers to show completed items while that filter is active', () => {
    component.completeCount = 1;
    component.hideComplete = true;
    component.showCompleteLabel = 'Show Maxed';
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.filter-section button',
    );
    expect(button.textContent?.trim()).toBe('Show Maxed');
    expect(button.classList.contains('perano')).toBe(true);
  });
});
