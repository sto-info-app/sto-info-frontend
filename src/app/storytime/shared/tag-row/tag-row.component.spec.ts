import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  StorytimeTag,
  StorytimeTagCategory,
} from 'src/app/models/storytime.models';
import { StorytimeTagRowComponent } from './tag-row.component';

describe('StorytimeTagRowComponent', () => {
  let fixture: ComponentFixture<StorytimeTagRowComponent>;

  /**
   * Builds a tag.
   *
   * @param overrides - Fields to change.
   * @returns The tag.
   */
  const buildTag = (overrides: Partial<StorytimeTag> = {}): StorytimeTag => ({
    id: 'tag-1',
    slug: 'first-contact',
    name: 'First contact',
    description: null,
    category: StorytimeTagCategory.THEME,
    displayOrder: 0,
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorytimeTagRowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StorytimeTagRowComponent);
  });

  /**
   * Renders the row with the supplied tags.
   *
   * @param tags - The tags to show.
   * @returns The rendered element.
   */
  const render = (tags: StorytimeTag[] | null): HTMLElement => {
    fixture.componentRef.setInput('tags', tags);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('names each tag it is given', () => {
    const element = render([
      buildTag(),
      buildTag({ id: 'tag-2', name: 'Diplomacy' }),
    ]);

    expect(
      [...element.querySelectorAll('.storytime-tag-row__tag')].map(tag =>
        tag.textContent?.trim(),
      ),
    ).toEqual(['First contact', 'Diplomacy']);
  });

  // The row has no caption; the icon is what says what it is.
  it('labels the list for a reader who cannot see the icon', () => {
    const element = render([buildTag()]);

    expect(
      element
        .querySelector('.storytime-tag-row__list')
        ?.getAttribute('aria-label'),
    ).toBe('Tags');
  });

  // An untagged work closes its panel where the body ends rather than on an
  // empty strip.
  it('renders nothing when there are no tags', () => {
    const element = render([]);

    expect(element.querySelector('.storytime-tag-row')).toBeNull();
  });

  // A response from before listings carried tags must leave the panel short of
  // a strip rather than break the listing it sits in.
  it('treats nothing as no tags', () => {
    const element = render(null);

    expect(element.querySelector('.storytime-tag-row')).toBeNull();
  });

  it('explains a tag through its description where it has one', () => {
    const element = render([buildTag({ description: 'Meeting a new people' })]);

    expect(
      element.querySelector('.storytime-tag-row__tag')?.getAttribute('title'),
    ).toBe('Meeting a new people');
  });

  it('falls back to the name where a tag has no description', () => {
    const element = render([buildTag()]);

    expect(
      element.querySelector('.storytime-tag-row__tag')?.getAttribute('title'),
    ).toBe('First contact');
  });
});
