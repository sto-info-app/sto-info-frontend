import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  StorytimeTag,
  StorytimeTagCategory,
} from 'src/app/models/storytime.models';
import { TagService } from '../../tag.service';
import { TagPickerComponent } from './tag-picker.component';

describe('TagPickerComponent', () => {
  let fixture: ComponentFixture<TagPickerComponent>;
  let tagService: {
    getTags: jest.Mock;
    getStoryTags: jest.Mock;
    getArcTags: jest.Mock;
    setStoryTags: jest.Mock;
    setArcTags: jest.Mock;
  };

  /**
   * Builds a tag.
   *
   * @param overrides - Fields to change.
   * @returns The tag.
   */
  const buildTag = (overrides: Partial<StorytimeTag> = {}): StorytimeTag => ({
    id: 'tag-1',
    slug: 'klingon',
    name: 'Klingon',
    description: 'The Empire.',
    category: StorytimeTagCategory.FACTION,
    displayOrder: 0,
    ...overrides,
  });

  /**
   * Builds and renders the picker.
   *
   * @param targetType - What is being tagged.
   * @returns The rendered element.
   */
  const render = (targetType: 'STORY' | 'ARC' = 'STORY'): HTMLElement => {
    fixture = TestBed.createComponent(TagPickerComponent);
    fixture.componentRef.setInput('targetType', targetType);
    fixture.componentRef.setInput('targetId', 'target-1');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    tagService = {
      getTags: jest.fn().mockReturnValue(
        of([
          buildTag(),
          buildTag({
            id: 'tag-2',
            name: 'Adventure',
            category: StorytimeTagCategory.GENRE,
          }),
        ]),
      ),
      getStoryTags: jest.fn().mockReturnValue(of([buildTag()])),
      getArcTags: jest.fn().mockReturnValue(of([])),
      setStoryTags: jest.fn().mockReturnValue(of([buildTag()])),
      setArcTags: jest.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [TagPickerComponent],
      providers: [{ provide: TagService, useValue: tagService }],
    });
  });

  // The vocabulary is administrator-managed, so this is a picker rather than a
  // text box.
  it('shows the vocabulary grouped into its shelves', () => {
    const element = render();

    expect(element.textContent).toContain('Faction');
    expect(element.textContent).toContain('Klingon');
    expect(element.textContent).toContain('Genre');
    expect(element.textContent).toContain('Adventure');
  });

  it('ticks the tags already on the Story', () => {
    render();

    expect(fixture.componentInstance.isChosen(buildTag())).toBe(true);
    expect(fixture.componentInstance.isChosen(buildTag({ id: 'tag-2' }))).toBe(
      false,
    );
  });

  it('reads the tags on an Arc when tagging one', () => {
    render('ARC');

    expect(tagService.getArcTags).toHaveBeenCalledWith('target-1');
    expect(tagService.getStoryTags).not.toHaveBeenCalled();
  });

  it('adds and removes a tag from the chosen set', () => {
    render();

    fixture.componentInstance.toggle(buildTag({ id: 'tag-2' }));
    expect(fixture.componentInstance.isChosen(buildTag({ id: 'tag-2' }))).toBe(
      true,
    );

    fixture.componentInstance.toggle(buildTag({ id: 'tag-2' }));
    expect(fixture.componentInstance.isChosen(buildTag({ id: 'tag-2' }))).toBe(
      false,
    );
  });

  // Replacing the whole set matches the API: a half-applied set is worse than
  // none.
  it('saves the whole chosen set', () => {
    render();
    fixture.componentInstance.toggle(buildTag({ id: 'tag-2' }));
    fixture.componentInstance.save();

    expect(tagService.setStoryTags).toHaveBeenCalledWith('target-1', [
      'tag-1',
      'tag-2',
    ]);
    expect(fixture.componentInstance.isSaved).toBe(true);
  });

  it('saves an Arc’s tags through the Arc route', () => {
    render('ARC');
    fixture.componentInstance.save();

    expect(tagService.setArcTags).toHaveBeenCalledWith('target-1', []);
  });

  it('ignores a second save while one is in flight', () => {
    render();
    fixture.componentInstance.isSaving = true;
    fixture.componentInstance.save();

    expect(tagService.setStoryTags).not.toHaveBeenCalled();
  });

  it('says so when there are no tags to choose from', () => {
    tagService.getTags.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('No tags have been set up yet');
  });

  it('shows the reason the server refused a save', () => {
    tagService.setStoryTags.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'One of those tags no longer exists.' },
          }),
      ),
    );

    render();
    fixture.componentInstance.save();

    expect(fixture.componentInstance.errorMessage).toContain(
      'no longer exists',
    );
    expect(fixture.componentInstance.isSaving).toBe(false);
  });

  it('falls back to a generic message when the server gives none', () => {
    tagService.setStoryTags.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();
    fixture.componentInstance.save();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be saved',
    );
  });

  it('reports a vocabulary that could not be loaded', () => {
    tagService.getTags.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be loaded',
    );
    expect(fixture.componentInstance.isLoading).toBe(false);
  });

  it('reports tags that could not be read back', () => {
    tagService.getStoryTags.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be loaded',
    );
  });

  // A category added on the server before the client is redeployed should read
  // as itself rather than as a blank heading.
  it('shows an unknown category by its own name', () => {
    tagService.getTags.mockReturnValue(
      of([buildTag({ category: 'ALLEGIANCE' as never })]),
    );

    const element = render();

    expect(element.textContent).toContain('ALLEGIANCE');
  });
});
