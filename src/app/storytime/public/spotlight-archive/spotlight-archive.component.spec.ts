import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  Spotlight,
  SpotlightEntityType,
} from 'src/app/models/storytime.models';
import { SpotlightService } from '../../spotlight.service';
import { SpotlightArchiveComponent } from './spotlight-archive.component';

describe('SpotlightArchiveComponent', () => {
  let fixture: ComponentFixture<SpotlightArchiveComponent>;
  let spotlightService: { getSpotlight: jest.Mock; getArchive: jest.Mock };

  /**
   * Builds a Spotlight selection.
   *
   * @param overrides - Fields to change.
   * @returns The selection.
   */
  const buildEntry = (overrides: Partial<Spotlight> = {}): Spotlight =>
    ({
      id: 'spotlight-1',
      slug: 'a-fine-story',
      entityType: SpotlightEntityType.STORY,
      headline: 'Start here',
      summary: 'Worth your evening.',
      selectionReason: null,
      overrideImageUrl: null,
      overrideImageMobileUrl: null,
      overrideImageAlt: null,
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: null,
      story: { id: 'story-1', slug: 'a-fine-story', title: 'A Fine Story' },
      arc: null,
      ...overrides,
    }) as Spotlight;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(SpotlightArchiveComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    spotlightService = {
      getSpotlight: jest.fn().mockReturnValue(of([buildEntry()])),
      getArchive: jest.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [SpotlightArchiveComponent],
      providers: [
        provideRouter([]),
        { provide: SpotlightService, useValue: spotlightService },
      ],
    });
  });

  it('shows what is in the Spotlight now', () => {
    const element = render();

    expect(element.textContent).toContain('Start here');
    expect(element.textContent).toContain('A Fine Story');
  });

  it('says so when nothing is showing', () => {
    spotlightService.getSpotlight.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('Nothing is in the Spotlight');
  });

  // Being chosen is worth something to the person chosen, and an archive that
  // evaporates would take that with it.
  it('lists what has shown before, with the dates it ran', () => {
    spotlightService.getArchive.mockReturnValue(
      of([
        buildEntry({
          id: 'spotlight-2',
          headline: 'Last month',
          endsAt: '2026-05-31T00:00:00.000Z',
        }),
      ]),
    );

    const element = render();

    expect(element.textContent).toContain('Previously in the Spotlight');
    expect(element.textContent).toContain('Last month');
    expect(element.textContent).toContain('2026');
  });

  it('leaves out the archive heading when there is no archive', () => {
    const element = render();

    expect(element.textContent).not.toContain('Previously in the Spotlight');
  });

  it('sends a reader to the featured Story', () => {
    const link = render().querySelector(
      '.storytime-panel-card--spotlight .storytime-panel-card__heading',
    );

    expect(link?.getAttribute('href')).toContain('stories/a-fine-story');
  });

  it('sends a reader to the featured Arc', () => {
    spotlightService.getSpotlight.mockReturnValue(
      of([
        buildEntry({
          entityType: SpotlightEntityType.ARC,
          story: null,
          arc: { slug: 'the-long-war', title: 'The Long War' } as never,
        }),
      ]),
    );

    const element = render();

    expect(
      element
        .querySelector(
          '.storytime-panel-card--spotlight .storytime-panel-card__heading',
        )
        ?.getAttribute('href'),
    ).toContain('arcs/the-long-war');
    expect(element.textContent).toContain('The Long War');
  });

  it('shows why a work was chosen when an editor said', () => {
    spotlightService.getSpotlight.mockReturnValue(
      of([buildEntry({ selectionReason: 'It stayed with us.' })]),
    );

    expect(render().textContent).toContain('It stayed with us.');
  });

  it('reports a failure to load', () => {
    spotlightService.getArchive.mockReturnValue(
      throwError(() => new Error('unavailable')),
    );

    const element = render();

    expect(element.textContent).toContain('could not be loaded');
    expect(fixture.componentInstance.isLoading).toBe(false);
  });

  // A selection whose work has gone is filtered out by the server, so an empty
  // title is a state the page must survive rather than one it must produce.
  it('describes a selection with nothing attached', () => {
    render();

    expect(
      fixture.componentInstance.titleFor(
        buildEntry({ story: null, arc: null }),
      ),
    ).toBe('');
  });
});
