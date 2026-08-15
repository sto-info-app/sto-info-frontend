import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ContentRating, Story } from 'src/app/models/storytime.models';
import { StoryService } from '../../story.service';
import { StoryDetailComponent } from './story-detail.component';

describe('StoryDetailComponent', () => {
  let fixture: ComponentFixture<StoryDetailComponent>;
  let storyService: { getStory: jest.Mock };

  /**
   * Builds a Story for the page.
   *
   * @param overrides - Fields to change.
   * @returns The Story.
   */
  const buildStory = (overrides: Partial<Story> = {}): Story =>
    ({
      id: 'story-1',
      slug: 'a-story',
      title: 'A Story',
      shortDescription: 'A summary',
      descriptionHtml: null,
      contentRating: ContentRating.GENERAL,
      completionState: 'ONGOING',
      languageCode: 'en',
      publishedChapterCount: 2,
      rating: 5,
      bannerImageUrl: null,
      bannerImageAlt: null,
      ...overrides,
    }) as Story;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(StoryDetailComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    storyService = { getStory: jest.fn().mockReturnValue(of(buildStory())) };

    TestBed.configureTestingModule({
      imports: [StoryDetailComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['storySlug', 'a-story']])),
            snapshot: { paramMap: new Map() },
          },
        },
      ],
    });
  });

  it('shows the Story', () => {
    const element = render();

    expect(element.textContent).toContain('A Story');
    expect(element.textContent).toContain('A summary');
  });

  // The lang attribute lets a screen reader pronounce the Story correctly.
  it('carries the Story language on the article', () => {
    const element = render();

    expect(element.querySelector('article')?.getAttribute('lang')).toBe('en');
  });

  it('carries a non-English language too', () => {
    storyService.getStory.mockReturnValue(
      of(buildStory({ languageCode: 'tlh' })),
    );

    const element = render();

    expect(element.querySelector('article')?.getAttribute('lang')).toBe('tlh');
  });

  it('renders the server-rendered description', () => {
    storyService.getStory.mockReturnValue(
      of(buildStory({ descriptionHtml: '<p id="b1">Rendered</p>' })),
    );

    const element = render();

    expect(
      element.querySelector('.storytime-story__description')?.innerHTML,
    ).toContain('Rendered');
  });

  it('warns about a Mature rating', () => {
    storyService.getStory.mockReturnValue(
      of(buildStory({ contentRating: ContentRating.MATURE })),
    );

    const element = render();

    expect(element.textContent).toContain('Mature');
    expect(fixture.componentInstance.needsRatingWarning).toBe(true);
  });

  it('does not warn about a General rating', () => {
    render();

    expect(fixture.componentInstance.needsRatingWarning).toBe(false);
  });

  // Artwork is optional: no banner must mean no image element at all.
  it('renders no banner when the Story has none', () => {
    const element = render();

    expect(element.querySelector('.storytime-story__banner')).toBeNull();
  });

  it('renders the banner with its alternative text when present', () => {
    storyService.getStory.mockReturnValue(
      of(
        buildStory({
          bannerImageUrl: 'https://cdn.test/banner',
          bannerImageAlt: 'A nebula',
        }),
      ),
    );

    const element = render();
    const banner = element.querySelector('.storytime-story__banner');

    expect(banner?.getAttribute('alt')).toBe('A nebula');
  });

  // A route without the parameter should still make a request that fails
  // cleanly, rather than throwing before it starts.
  it('asks for an empty slug when the route carries none', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [StoryDetailComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map()),
            snapshot: { paramMap: new Map() },
          },
        },
      ],
    });

    render();

    expect(storyService.getStory).toHaveBeenCalledWith('');
  });

  it('explains a missing Story', () => {
    storyService.getStory.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be found',
    );
  });

  it('reports another failure differently', () => {
    storyService.getStory.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be read',
    );
  });
});
