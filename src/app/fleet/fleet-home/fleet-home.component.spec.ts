import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Observable, of, Subject } from 'rxjs';

import { FleetConfiguration } from 'src/app/models/fleet.models';
import { FleetConfigurationService } from 'src/app/shared/services/fleet-configuration.service';

import { FleetHomeComponent } from './fleet-home.component';

/**
 * Builds a configuration fixture.
 *
 * @param isEnabled - Whether the master switch is on.
 * @returns A configuration as the server would serve it.
 */
function buildConfiguration(isEnabled: boolean): FleetConfiguration {
  return {
    features: {
      isEnabled,
      registrationEnabled: isEnabled,
      importsEnabled: isEnabled,
      chatEnabled: isEnabled,
    },
    policy: {
      chatMemberHistoryHours: 4,
      chatTranscriptHistoryDays: 7,
      customChannelLimit: 3,
      chatRetentionDays: 45,
      importSourceRetentionDays: 180,
    },
  };
}

describe('FleetHomeComponent', () => {
  let fixture: ComponentFixture<FleetHomeComponent>;
  let configuration$: Observable<FleetConfiguration | null>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetHomeComponent],
      providers: [
        provideRouter([]),
        {
          provide: FleetConfigurationService,
          useValue: {
            getConfiguration: (): Observable<FleetConfiguration | null> =>
              configuration$,
          },
        },
      ],
    }).compileComponents();
  });

  /**
   * Renders the page.
   */
  function render(): void {
    fixture = TestBed.createComponent(FleetHomeComponent);
    fixture.detectChanges();
  }

  /**
   * Finds one element on the page.
   *
   * @param selector - The CSS selector.
   * @returns The element, or null.
   */
  const find = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  /**
   * The page's whole text.
   *
   * @returns The text content.
   */
  const text = (): string => fixture.nativeElement.textContent as string;

  it('sits inside the shared Fleet shell under its own heading', () => {
    configuration$ = of(buildConfiguration(false));

    render();

    expect(find('app-fleet-page-shell')).not.toBeNull();
    expect(find('h1')?.textContent).toContain('Fleet Directory');
  });

  // Guessing while the request is in flight means showing a notice and then
  // replacing it, which reads as the site changing its mind.
  it('shows the loading bar before the server has answered', () => {
    configuration$ = new Subject<FleetConfiguration | null>();

    render();

    expect(find('app-loading-bar')).not.toBeNull();
    expect(find('app-feature-unavailable')).toBeNull();
  });

  it('says the feature is switched off when the switch is off', () => {
    configuration$ = of(buildConfiguration(false));

    render();

    expect(find('app-feature-unavailable')).not.toBeNull();
    expect(text()).toContain('Currently Offline');
    expect(text()).toContain('Fleet Community is switched off');
  });

  /**
   * With the backend not answering, nobody knows what the switch says. Saying
   * it is off would be a guess, and the two notices exist to avoid making it.
   */
  it('says the systems are not answering when the configuration cannot be read', () => {
    configuration$ = of(null);

    render();

    expect(text()).toContain('Connection Lost');
    expect(text()).toContain('systems are not answering');
  });

  it('hands the page over to the listing routes when the feature is on', () => {
    configuration$ = of(buildConfiguration(true));

    render();

    expect(find('app-feature-unavailable')).toBeNull();
    expect(find('router-outlet')).not.toBeNull();
  });

  // Each listing is its own route, which is what keeps it bookmarkable and
  // the back button honest.
  it('offers the three listings as links', () => {
    configuration$ = of(buildConfiguration(true));

    render();

    const tabs = Array.from(
      fixture.nativeElement.querySelectorAll('.lcars-tab'),
    ) as HTMLAnchorElement[];

    expect(tabs.map(tab => tab.textContent?.trim())).toEqual([
      'Fleets',
      'Communities',
      'Armadas',
    ]);
    expect(tabs.map(tab => tab.getAttribute('href'))).toEqual([
      '/fleets',
      '/fleets/communities',
      '/fleets/armadas',
    ]);
  });

  // `/fleets` is the prefix of both of the others, so an inexact match would
  // leave the Fleets tab lit on all three.
  it('lights the Fleets tab only on an exact match', () => {
    configuration$ = of(buildConfiguration(true));

    render();

    const component = fixture.componentInstance;

    expect(component.tabsFor('ENABLED').map(tab => tab.exact)).toEqual([
      true,
      false,
      false,
    ]);
  });

  // A strip of tabs over a notice saying the feature is off would offer three
  // addresses that all say the same thing.
  it.each(['LOADING', 'OFFLINE', 'DISABLED'] as const)(
    'draws no tab strip while %s',
    state => {
      configuration$ = of(buildConfiguration(false));

      render();

      expect(fixture.componentInstance.tabsFor(state)).toEqual([]);
    },
  );

  it('does not treat a switched-on directory as an error', () => {
    configuration$ = of(buildConfiguration(true));

    render();

    expect(find('app-lcars-error-message')).toBeNull();
  });
});
