import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FleetScopeCardVm } from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.model';
import { FLEET_SCOPE_FLEET } from 'src/app/fleet/constants/fleet-scope.constants';
import {
  FleetDirectoryResults,
  FleetDirectoryState,
} from 'src/app/fleet/directory/fleet-directory-page.models';

import { FleetDirectoryResultsComponent } from './fleet-directory-results.component';

/**
 * Builds a card to draw.
 *
 * @param id - The card's identity.
 * @returns A card presentation model.
 */
function card(id: string): FleetScopeCardVm {
  return {
    id,
    scope: FLEET_SCOPE_FLEET,
    emblem: null,
    name: `Fleet ${id}`,
    communityName: null,
    platform: 'PC',
    link: null,
    unlinkedTitle: null,
    status: null,
    lastObservedLabel: null,
    meta: [],
    actions: [],
  };
}

/**
 * Builds a page of results.
 *
 * @param overrides - Fields to override.
 * @returns The results.
 */
function results(
  overrides: Partial<FleetDirectoryResults> = {},
): FleetDirectoryResults {
  return {
    cards: [card('a'), card('b')],
    total: 2,
    page: 1,
    pageSize: 12,
    ...overrides,
  };
}

describe('FleetDirectoryResultsComponent', () => {
  let fixture: ComponentFixture<FleetDirectoryResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetDirectoryResultsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /**
   * Renders the results.
   *
   * @param state - What the listing has to show.
   */
  function render(state: FleetDirectoryState): void {
    fixture = TestBed.createComponent(FleetDirectoryResultsComponent);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('heading', 'Fleets');
    fixture.componentRef.setInput('loadingText', 'Scanning Fleet records');
    fixture.componentRef.setInput('emptyMessage', 'No Fleet answers to that.');
    fixture.detectChanges();
  }

  /**
   * Finds one element.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  /**
   * The pager's two buttons.
   *
   * @returns Previous and Next.
   */
  const pagerButtons = (): HTMLButtonElement[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll('.lcars-pagination button'),
    );

  it('names the listing above it', () => {
    render({ kind: 'READY', results: results() });

    expect(find('.lcars-text-bar')?.textContent).toContain('Fleets');
  });

  it('badges the total so a duplicate search can read it at a glance', () => {
    render({ kind: 'READY', results: results({ total: 17 }) });

    expect(find('.header-count-badge')?.textContent).toBe('17');
  });

  it('badges nothing when nothing matched', () => {
    render({ kind: 'READY', results: results({ cards: [], total: 0 }) });

    expect(find('.header-count-badge')).toBeNull();
  });

  it('says it is loading rather than showing an empty list', () => {
    render({ kind: 'LOADING' });

    expect(find('app-loading-bar')).not.toBeNull();
    expect(find('.lcars-empty-state')).toBeNull();
    expect(find('.fleet-directory-results__grid')).toBeNull();
  });

  // A stale list left on screen beneath an error reads as a list that is
  // still true.
  it('shows the failure alone, with no list beneath it', () => {
    render({ kind: 'ERROR', message: 'The directory could not be read.' });

    expect(find('app-lcars-error-message')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'The directory could not be read.',
    );
    expect(find('.fleet-directory-results__grid')).toBeNull();
  });

  it('says plainly when the question has no answers', () => {
    render({ kind: 'READY', results: results({ cards: [], total: 0 }) });

    expect(find('.lcars-empty-state')?.textContent).toContain(
      'No Fleet answers to that.',
    );
  });

  it('draws one card per record', () => {
    render({ kind: 'READY', results: results() });

    expect(
      fixture.nativeElement.querySelectorAll('app-fleet-scope-card'),
    ).toHaveLength(2);
  });

  it('offers no pager when everything fits on one page', () => {
    render({ kind: 'READY', results: results({ total: 12, pageSize: 12 }) });

    expect(find('.lcars-pagination')).toBeNull();
  });

  it('says which page of how many the reader is on', () => {
    render({
      kind: 'READY',
      results: results({ total: 30, page: 2, pageSize: 12 }),
    });

    expect(find('.lcars-pagination')?.textContent).toContain('Page 2 of 3');
  });

  it('asks for the next page when Next is pressed', () => {
    render({
      kind: 'READY',
      results: results({ total: 30, page: 2, pageSize: 12 }),
    });

    let asked: number | undefined;
    fixture.componentInstance.pageChange.subscribe(page => (asked = page));

    pagerButtons()[1].click();

    expect(asked).toBe(3);
  });

  it('asks for the previous page when Previous is pressed', () => {
    render({
      kind: 'READY',
      results: results({ total: 30, page: 2, pageSize: 12 }),
    });

    let asked: number | undefined;
    fixture.componentInstance.pageChange.subscribe(page => (asked = page));

    pagerButtons()[0].click();

    expect(asked).toBe(1);
  });

  it('disables Previous on the first page and Next on the last', () => {
    render({
      kind: 'READY',
      results: results({ total: 30, page: 1, pageSize: 12 }),
    });

    expect(pagerButtons()[0].disabled).toBe(true);
    expect(pagerButtons()[1].disabled).toBe(false);

    fixture.componentRef.setInput('state', {
      kind: 'READY',
      results: results({ total: 30, page: 3, pageSize: 12 }),
    });
    fixture.detectChanges();

    expect(pagerButtons()[0].disabled).toBe(false);
    expect(pagerButtons()[1].disabled).toBe(true);
  });

  it('counts no pages while there is no answer to count', () => {
    render({ kind: 'LOADING' });

    expect(fixture.componentInstance.totalPages).toBe(0);
  });
});
