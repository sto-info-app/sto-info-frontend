import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  CompletionState,
  ContentRating,
  Story,
} from 'src/app/models/storytime.models';
import { StoryCardComponent } from './story-card.component';

describe('StoryCardComponent', () => {
  let fixture: ComponentFixture<StoryCardComponent>;

  /**
   * Builds a Story for the card.
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
      contentRating: ContentRating.GENERAL,
      completionState: CompletionState.ONGOING,
      publishedChapterCount: 3,
      profileImageThumbnailUrl: null,
      profileImageAlt: null,
      ...overrides,
    }) as Story;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoryCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StoryCardComponent);
  });

  /**
   * Renders the card with the supplied Story.
   *
   * @param story - The Story to render.
   * @returns The rendered element.
   */
  const render = (story: Story): HTMLElement => {
    fixture.componentRef.setInput('story', story);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the title and summary', () => {
    const element = render(buildStory());

    expect(element.textContent).toContain('A Story');
    expect(element.textContent).toContain('A summary');
  });

  it('describes the rating and status in words', () => {
    const element = render(buildStory());

    expect(element.textContent).toContain('General');
    expect(element.textContent).toContain('Ongoing');
  });

  it('pluralises the Chapter count', () => {
    expect(render(buildStory()).textContent).toContain('3 Chapters');
  });

  it('uses the singular for one Chapter', () => {
    const element = render(buildStory({ publishedChapterCount: 1 }));

    expect(element.textContent).toContain('1 Chapter');
    expect(element.textContent).not.toContain('1 Chapters');
  });

  // Artwork is optional throughout Storytime: a missing image must render as
  // nothing at all rather than an empty frame.
  it('renders no image when the Story has none', () => {
    const element = render(buildStory());

    expect(element.querySelector('img')).toBeNull();
  });

  it('renders the image with its alternative text when present', () => {
    const element = render(
      buildStory({
        profileImageThumbnailUrl: 'https://cdn.test/image',
        profileImageAlt: 'A starship',
      }),
    );
    const image = element.querySelector('img');

    expect(image?.getAttribute('src')).toBe('https://cdn.test/image');
    expect(image?.getAttribute('alt')).toBe('A starship');
  });

  it('flags a Mature rating with a warning icon', () => {
    const element = render(buildStory({ contentRating: ContentRating.MATURE }));

    expect(element.querySelector('.fa-triangle-exclamation')).not.toBeNull();
    expect(element.textContent).toContain('Mature');
  });

  it('does not flag a General rating', () => {
    const element = render(buildStory());

    expect(element.querySelector('.fa-triangle-exclamation')).toBeNull();
  });

  it('omits the summary when there is none', () => {
    const element = render(buildStory({ shortDescription: null }));

    expect(element.querySelector('.storytime-story-card__summary')).toBeNull();
  });
});
