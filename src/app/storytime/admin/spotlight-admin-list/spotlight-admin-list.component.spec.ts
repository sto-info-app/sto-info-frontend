import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ManagedSpotlight,
  SpotlightEntityType,
} from 'src/app/models/storytime.models';
import { SpotlightService } from '../../spotlight.service';
import { SpotlightAdminListComponent } from './spotlight-admin-list.component';

describe('SpotlightAdminListComponent', () => {
  let fixture: ComponentFixture<SpotlightAdminListComponent>;
  let spotlightService: {
    getAll: jest.Mock;
    publish: jest.Mock;
    unpublish: jest.Mock;
    remove: jest.Mock;
  };

  const now = new Date('2026-06-15T12:00:00.000Z');

  /**
   * Builds a Spotlight entry.
   *
   * @param overrides - Fields to change.
   * @returns The entry.
   */
  const buildEntry = (
    overrides: Partial<ManagedSpotlight> = {},
  ): ManagedSpotlight =>
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
      overrideImageId: null,
      storyId: 'story-1',
      arcId: null,
      displayPriority: 0,
      isPublished: false,
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: null,
      story: { id: 'story-1', slug: 'a-fine-story', title: 'A Fine Story' },
      arc: null,
      createdByUserId: 'editor-1',
      updatedByUserId: 'editor-1',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      ...overrides,
    }) as ManagedSpotlight;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(SpotlightAdminListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    spotlightService = {
      getAll: jest.fn().mockReturnValue(of([buildEntry()])),
      publish: jest.fn().mockReturnValue(of(buildEntry())),
      unpublish: jest.fn().mockReturnValue(of(buildEntry())),
      remove: jest.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [SpotlightAdminListComponent],
      providers: [
        provideRouter([]),
        { provide: SpotlightService, useValue: spotlightService },
      ],
    });
  });

  it('lists every entry', () => {
    const element = render();

    expect(element.textContent).toContain('Start here');
    expect(element.textContent).toContain('A Fine Story');
  });

  it('says so when nothing has been chosen', () => {
    spotlightService.getAll.mockReturnValue(of([]));

    expect(render().textContent).toContain('Nothing has been chosen');
  });

  // Published and showing are different things, and a list of dates should not
  // leave an editor working out which is which.
  describe.each([
    ['Draft', { isPublished: false }],
    ['Scheduled', { isPublished: true, startsAt: '2026-07-01T00:00:00.000Z' }],
    ['Showing', { isPublished: true }],
    ['Finished', { isPublished: true, endsAt: '2026-06-10T00:00:00.000Z' }],
  ])('an entry that is %s', (state, overrides) => {
    it(`describes it as ${state}`, () => {
      render();

      expect(
        fixture.componentInstance.stateOf(
          buildEntry(overrides as Partial<ManagedSpotlight>),
          now,
        ),
      ).toBe(state);
    });
  });

  // An entry pointing at work that has gone is the one an editor most needs to
  // find, so it is listed rather than hidden.
  it('names an entry whose work can no longer be shown', () => {
    spotlightService.getAll.mockReturnValue(
      of([buildEntry({ story: null, arc: null })]),
    );

    expect(render().textContent).toContain('can no longer be shown');
  });

  it('names the featured Arc', () => {
    render();

    expect(
      fixture.componentInstance.titleFor(
        buildEntry({
          entityType: SpotlightEntityType.ARC,
          story: null,
          arc: { title: 'The Long War' } as never,
        }),
      ),
    ).toBe('The Long War');
  });

  it('publishes an entry and reloads', () => {
    render();
    fixture.componentInstance.publish(buildEntry());

    expect(spotlightService.publish).toHaveBeenCalledWith('spotlight-1');
    expect(spotlightService.getAll).toHaveBeenCalledTimes(2);
  });

  it('withdraws an entry', () => {
    render();
    fixture.componentInstance.unpublish(buildEntry());

    expect(spotlightService.unpublish).toHaveBeenCalledWith('spotlight-1');
  });

  it('deletes an entry', () => {
    render();
    fixture.componentInstance.remove(buildEntry());

    expect(spotlightService.remove).toHaveBeenCalledWith('spotlight-1');
  });

  // A refused publish names exactly why, most often that the work has since
  // been taken down.
  it('shows the reason the server gave for a refused action', () => {
    spotlightService.publish.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'That Story cannot be featured.' },
          }),
      ),
    );

    render();
    fixture.componentInstance.publish(buildEntry());

    expect(fixture.componentInstance.errorMessage).toContain(
      'cannot be featured',
    );
  });

  it('falls back to a generic message when the server gives none', () => {
    spotlightService.publish.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();
    fixture.componentInstance.publish(buildEntry());

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be saved',
    );
  });

  it('reports a failure to load', () => {
    spotlightService.getAll.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be loaded',
    );
  });

  // The default is the real path: everywhere but the tests asks about now.
  it('judges an entry against now by default', () => {
    render();

    expect(fixture.componentInstance.stateOf(buildEntry())).toBe('Draft');
  });
});
