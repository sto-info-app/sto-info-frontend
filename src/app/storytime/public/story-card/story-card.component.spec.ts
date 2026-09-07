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
      author: null,
      arcs: [],
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

  // Whose it is and where it sits lead the facts: a reader scanning a listing
  // is choosing what to open, and both answer that before the rating does.
  it('names the author and the Arc ahead of the rest', () => {
    const element = render(
      buildStory({
        author: { username: 'midniteshadow7', publiclyVisible: true },
        arcs: [{ id: 'arc-1', title: 'The Dominion Trilogy', slug: 'trilogy' }],
      }),
    );
    const labels = [...element.querySelectorAll('.info-item .label')].map(
      label => label.textContent,
    );

    expect(labels).toEqual([
      'Author',
      'Arc',
      'Content rating',
      'Status',
      'Chapters',
    ]);
  });

  // A name only leads somewhere when its owner has chosen to be listed. A
  // profile that is not listed has no page to open.
  it('links a listed author to their profile', () => {
    const element = render(
      buildStory({
        author: { username: 'midniteshadow7', publiclyVisible: true },
      }),
    );
    const link = element.querySelector('.storytime-facts__author');

    expect(link?.getAttribute('href')).toBe(
      '/community/registry/profiles/midniteshadow7',
    );
  });

  it('credits an unlisted author by name without a link', () => {
    const element = render(
      buildStory({
        author: { username: 'midniteshadow7', publiclyVisible: false },
      }),
    );

    expect(element.textContent).toContain('midniteshadow7');
    expect(element.querySelector('.storytime-facts__author')).toBeNull();
  });

  it('links each Arc the Story is read as part of', () => {
    const element = render(
      buildStory({
        arcs: [
          { id: 'arc-1', title: 'The Dominion Trilogy', slug: 'trilogy' },
          { id: 'arc-2', title: 'The Long Watch', slug: 'long-watch' },
        ],
      }),
    );
    const links = [
      ...element.querySelectorAll('.storytime-story-card__arcs a'),
    ];

    expect(links.map(link => link.textContent?.trim())).toEqual([
      'The Dominion Trilogy',
      'The Long Watch',
    ]);
    expect(links[0].getAttribute('href')).toBe('/storytime/arcs/trilogy');
  });

  // Singular and plural, because "Arcs: The Long Watch" reads as a mistake.
  it.each([
    [1, 'Arc'],
    [2, 'Arcs'],
  ])('labels %i Arc as %s', (count, label) => {
    const element = render(
      buildStory({
        arcs: Array.from({ length: count }, (_unused, index) => ({
          id: `arc-${index}`,
          title: `Arc ${index}`,
          slug: `arc-${index}`,
        })),
      }),
    );

    expect(element.querySelector('.info-item .label')?.textContent).toBe(label);
  });

  // What a Story does not have renders as nothing at all rather than an empty
  // frame, a warning nobody needs, or a bare row: artwork, the Mature warning
  // and the tag row are each optional throughout Storytime.
  it.each([
    ['no image when the Story has none', 'img'],
    ['no warning icon for a General rating', '.fa-triangle-exclamation'],
    ['no tag row for an untagged Story', '.storytime-tag-row'],
    ['no author when nobody is named', '.storytime-facts__author'],
    ['no Arc row for a Story in none', '.storytime-story-card__arcs'],
  ])('renders %s', (_case, selector) => {
    const element = render(buildStory());

    expect(element.querySelector(selector)).toBeNull();
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
});
