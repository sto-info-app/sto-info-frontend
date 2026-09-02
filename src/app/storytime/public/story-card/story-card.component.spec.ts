import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  CompletionState,
  ContentRating,
  Story,
  StorytimeTagCategory,
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
      tags: [],
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

  // Every fact is named, so a reader does not have to work out what a bare
  // word or number in a row of them is meant to be.
  it('names each fact it shows', () => {
    const element = render(buildStory());
    const facts = [...element.querySelectorAll('.info-item')].map(item => [
      item.querySelector('.label')?.textContent,
      item.querySelector('.value')?.textContent?.trim(),
    ]);

    expect(facts).toEqual([
      ['Content rating', 'General'],
      ['Status', 'Ongoing'],
      ['Chapters', '3'],
    ]);
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

  // The same row the Spotlight panel closes with, so what a Story is about
  // reads the same wherever a reader meets it.
  it('closes the panel with what the Story is tagged with', () => {
    const element = render(
      buildStory({
        tags: [
          {
            id: 'tag-1',
            slug: 'first-contact',
            name: 'First contact',
            description: null,
            category: StorytimeTagCategory.THEME,
            displayOrder: 0,
          },
        ],
      }),
    );

    expect(
      [...element.querySelectorAll('.storytime-tag-row__tag')].map(tag =>
        tag.textContent?.trim(),
      ),
    ).toEqual(['First contact']);
  });

  it('renders no tag row for an untagged Story', () => {
    const element = render(buildStory());

    expect(element.querySelector('.storytime-tag-row')).toBeNull();
  });
});
