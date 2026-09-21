import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FLEET_SCOPE_COMMUNITY } from 'src/app/fleet/constants/fleet-scope.constants';
import {
  FleetScopeHeaderVm,
  FleetScopePageState,
} from 'src/app/fleet/scope/fleet-scope-page.models';

import { FleetScopeViewComponent } from './fleet-scope-view.component';

/** A header to draw when the page is ready. */
const HEADER: FleetScopeHeaderVm = {
  scope: FLEET_SCOPE_COMMUNITY,
  name: 'United Federation Alliance',
  platform: null,
  communityName: null,
  communityLink: null,
  banner: null,
  emblem: null,
  status: null,
  facts: [],
};

describe('FleetScopeViewComponent', () => {
  let fixture: ComponentFixture<FleetScopeViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetScopeViewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /**
   * Renders the view.
   *
   * @param state - What the page has to show.
   */
  function render(state: FleetScopePageState): void {
    fixture = TestBed.createComponent(FleetScopeViewComponent);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('loadingText', 'Reading the Community');
    fixture.componentRef.setInput(
      'missingMessage',
      'No Community answers to that address.',
    );
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

  it('says it is loading before the server has answered', () => {
    render({ kind: 'LOADING' });

    expect(find('app-loading-bar')).not.toBeNull();
    expect(find('app-fleet-scope-header')).toBeNull();
  });

  // A closed Community or an out-of-date link is an ordinary thing to run
  // into, and dressing it as a fault would have readers reporting it.
  it('treats an address nothing answers to as news rather than a fault', () => {
    render({ kind: 'MISSING' });

    expect(find('app-lcars-information-message')).not.toBeNull();
    expect(find('app-lcars-error-message')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'No Community answers to that address.',
    );
  });

  it('reports a failure as a failure', () => {
    render({ kind: 'ERROR', message: 'This record could not be read.' });

    expect(find('app-lcars-error-message')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'This record could not be read.',
    );
  });

  it('draws the head of the record when it has one', () => {
    render({ kind: 'READY', header: HEADER, description: null });

    expect(find('app-fleet-scope-header')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'United Federation Alliance',
    );
  });

  it('shows a description beneath its own bar', () => {
    render({
      kind: 'READY',
      header: HEADER,
      description: 'A home for casual PvE fleets.',
    });

    expect(find('.lcars-text-bar')?.textContent).toContain('About');
    expect(find('.fleet-scope-view__description')?.textContent).toContain(
      'A home for casual PvE fleets.',
    );
  });

  it('draws no About bar where nothing was written', () => {
    render({ kind: 'READY', header: HEADER, description: null });

    expect(find('.lcars-text-bar')).toBeNull();
  });

  // A description is somebody's writing, and nothing here may reach a
  // component that renders HTML.
  it('renders a description containing markup as text', () => {
    render({
      kind: 'READY',
      header: HEADER,
      description: '<img src="x" onerror="alert(1)">',
    });

    expect(find('.fleet-scope-view__description img')).toBeNull();
    expect(find('.fleet-scope-view__description')?.textContent).toContain(
      '<img src="x"',
    );
  });
});
