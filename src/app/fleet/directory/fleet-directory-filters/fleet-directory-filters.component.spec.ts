import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import {
  FLEET_SORTS_WITH_FRESHNESS,
  FLEET_SORTS_WITHOUT_FRESHNESS,
} from 'src/app/fleet/directory/fleet-directory-page.models';
import {
  FleetDirectorySort,
  FleetDirectoryStatusFilter,
} from 'src/app/models/fleet.models';

import { FleetDirectoryFiltersComponent } from './fleet-directory-filters.component';

describe('FleetDirectoryFiltersComponent', () => {
  let fixture: ComponentFixture<FleetDirectoryFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetDirectoryFiltersComponent],
    }).compileComponents();
  });

  /**
   * Renders the filter bar.
   *
   * @param search - What the URL is holding as a search.
   * @param sortOptions - The orderings this listing offers.
   */
  function render(
    search = '',
    sortOptions = FLEET_SORTS_WITHOUT_FRESHNESS,
  ): void {
    fixture = TestBed.createComponent(FleetDirectoryFiltersComponent);
    fixture.componentRef.setInput('search', search);
    fixture.componentRef.setInput('searchLabel', 'Fleet name');
    fixture.componentRef.setInput('searchPlaceholder', 'e.g. Starfleet');
    fixture.componentRef.setInput('status', FleetDirectoryStatusFilter.ACTIVE);
    fixture.componentRef.setInput('sort', FleetDirectorySort.NAME);
    fixture.componentRef.setInput('sortOptions', sortOptions);
    fixture.detectChanges();
    // `ngModel` writes the control's value on a microtask, so nothing the
    // reader would see is in the DOM until the queue has drained.
    tick();
  }

  /**
   * Finds one element.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = <T extends HTMLElement>(selector: string): T =>
    fixture.nativeElement.querySelector(selector) as T;

  /**
   * The labels of a select's options.
   *
   * @param selector - The select's CSS selector.
   * @returns The option labels.
   */
  const optionLabels = (selector: string): string[] =>
    Array.from(find<HTMLSelectElement>(selector).options).map(
      option => option.textContent?.trim() ?? '',
    );

  it('shows the search the URL is holding', fakeAsync(() => {
    render('starfleet');

    expect(find<HTMLInputElement>('#fleet-directory-search').value).toBe(
      'starfleet',
    );
  }));

  it('labels the search box with what this listing searches', fakeAsync(() => {
    render();

    expect(
      find('label[for="fleet-directory-search"]').textContent?.trim(),
    ).toBe('Fleet name');
  }));

  // The server is asked a whole question at a time. A listing reloading per
  // character would send nineteen requests for "Starfleet Command".
  it('searches on submit rather than on every keystroke', fakeAsync(() => {
    render();

    let asked: string | undefined;
    fixture.componentInstance.searchChange.subscribe(value => (asked = value));

    const input = find<HTMLInputElement>('#fleet-directory-search');
    input.value = 'starfleet';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    tick();

    expect(asked).toBeUndefined();

    find<HTMLFormElement>('form').dispatchEvent(new Event('submit'));

    expect(asked).toBe('starfleet');
  }));

  // An edge space is part of an in-game name, but it is not part of a search
  // for one: somebody who types a trailing space has not asked for the Fleet
  // whose name ends in one.
  it('trims what was typed before searching for it', fakeAsync(() => {
    render();

    let asked: string | undefined;
    fixture.componentInstance.searchChange.subscribe(value => (asked = value));

    const input = find<HTMLInputElement>('#fleet-directory-search');
    input.value = '  starfleet  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    tick();

    find<HTMLFormElement>('form').dispatchEvent(new Event('submit'));

    expect(asked).toBe('starfleet');
  }));

  it('offers no Clear button until there is something to clear', fakeAsync(() => {
    render();

    expect(find('.lcars-btn.red')).toBeNull();
  }));

  it('empties the box and stops searching when Clear is pressed', fakeAsync(() => {
    render('starfleet');

    let asked: string | undefined;
    fixture.componentInstance.searchChange.subscribe(value => (asked = value));

    find<HTMLButtonElement>('.lcars-btn.red').click();
    fixture.detectChanges();
    tick();

    expect(asked).toBe('');
    expect(find<HTMLInputElement>('#fleet-directory-search').value).toBe('');
  }));

  it('offers the three lifecycle choices', fakeAsync(() => {
    render();

    expect(optionLabels('#fleet-directory-status')).toEqual([
      'Operating',
      'Closed',
      'Every record',
    ]);
  }));

  it('reports the lifecycle filter the reader picked', fakeAsync(() => {
    render();

    let asked: FleetDirectoryStatusFilter | undefined;
    fixture.componentInstance.statusChange.subscribe(value => (asked = value));

    const select = find<HTMLSelectElement>('#fleet-directory-status');
    select.value = FleetDirectoryStatusFilter.ANY;
    select.dispatchEvent(new Event('change'));

    expect(asked).toBe(FleetDirectoryStatusFilter.ANY);
  }));

  it('offers only the orderings this listing accepts', fakeAsync(() => {
    render();

    expect(optionLabels('#fleet-directory-sort')).toEqual([
      'Name',
      'Newest first',
    ]);
  }));

  // Nothing observes a Community or an Armada, so freshness belongs to the
  // Fleet listing and nowhere else.
  it('offers freshness where the listing has a roster behind it', fakeAsync(() => {
    render('', FLEET_SORTS_WITH_FRESHNESS);

    expect(optionLabels('#fleet-directory-sort')).toEqual([
      'Name',
      'Newest first',
      'Most recently imported',
    ]);
  }));

  it('reports the ordering the reader picked', fakeAsync(() => {
    render('', FLEET_SORTS_WITH_FRESHNESS);

    let asked: FleetDirectorySort | undefined;
    fixture.componentInstance.sortChange.subscribe(value => (asked = value));

    const select = find<HTMLSelectElement>('#fleet-directory-sort');
    select.value = FleetDirectorySort.FRESHNESS;
    select.dispatchEvent(new Event('change'));

    expect(asked).toBe(FleetDirectorySort.FRESHNESS);
  }));
});
