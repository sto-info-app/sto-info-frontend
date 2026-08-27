import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  StorytimeTag,
  StorytimeTagCategory,
} from 'src/app/models/storytime.models';
import { TagService } from '../../tag.service';
import { TagAdminComponent } from './tag-admin.component';

describe('TagAdminComponent', () => {
  let fixture: ComponentFixture<TagAdminComponent>;
  let tagService: {
    getTags: jest.Mock;
    createTag: jest.Mock;
    updateTag: jest.Mock;
    deleteTag: jest.Mock;
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
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(TagAdminComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    tagService = {
      getTags: jest.fn().mockReturnValue(of([buildTag()])),
      createTag: jest.fn().mockReturnValue(of(buildTag())),
      updateTag: jest.fn().mockReturnValue(of(buildTag())),
      deleteTag: jest.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [TagAdminComponent],
      providers: [
        provideRouter([]),
        { provide: TagService, useValue: tagService },
      ],
    });
  });

  it('shows the vocabulary grouped into its shelves', () => {
    const element = render();

    expect(element.textContent).toContain('Faction');
    expect(element.textContent).toContain('Klingon');
    expect(element.textContent).toContain('klingon');
  });

  it('says so when there are no tags yet', () => {
    tagService.getTags.mockReturnValue(of([]));

    expect(render().textContent).toContain('There are no tags yet');
  });

  it('adds a tag', () => {
    render();
    fixture.componentInstance.form.patchValue({
      name: '  Klingon  ',
      category: StorytimeTagCategory.FACTION,
    });
    fixture.componentInstance.save();

    expect(tagService.createTag).toHaveBeenCalledWith({
      name: 'Klingon',
      category: StorytimeTagCategory.FACTION,
      slug: undefined,
      description: null,
      displayOrder: 0,
    });
  });

  it('refuses to add a tag with no name', () => {
    render();
    fixture.componentInstance.save();

    expect(tagService.createTag).not.toHaveBeenCalled();
  });

  it('loads a tag into the form to edit it', () => {
    render();
    fixture.componentInstance.edit(buildTag());

    expect(fixture.componentInstance.editingTagId).toBe('tag-1');
    expect(fixture.componentInstance.form.getRawValue().name).toBe('Klingon');
    expect(fixture.componentInstance.form.getRawValue().slug).toBe('klingon');
  });

  // A tag with no explanation must load as an empty field, not as "null".
  it('loads a tag with no description as a blank field', () => {
    render();
    fixture.componentInstance.edit(buildTag({ description: null }));

    expect(fixture.componentInstance.form.getRawValue().description).toBe('');
  });

  it('saves an edit against the tag being edited', () => {
    render();
    fixture.componentInstance.edit(buildTag());
    fixture.componentInstance.form.patchValue({ name: 'Klingon Empire' });
    fixture.componentInstance.save();

    expect(tagService.updateTag).toHaveBeenCalledWith(
      'tag-1',
      expect.objectContaining({ name: 'Klingon Empire' }),
    );
    expect(tagService.createTag).not.toHaveBeenCalled();
  });

  it('returns to adding after an edit is saved', () => {
    render();
    fixture.componentInstance.edit(buildTag());
    fixture.componentInstance.save();

    expect(fixture.componentInstance.editingTagId).toBeNull();
  });

  it('abandons an edit', () => {
    render();
    fixture.componentInstance.edit(buildTag());
    fixture.componentInstance.cancelEdit();

    expect(fixture.componentInstance.editingTagId).toBeNull();
    expect(fixture.componentInstance.form.getRawValue().name).toBe('');
  });

  it('removes a tag and reloads', () => {
    render();
    fixture.componentInstance.remove(buildTag());

    expect(tagService.deleteTag).toHaveBeenCalledWith('tag-1');
    expect(tagService.getTags).toHaveBeenCalledTimes(2);
  });

  // Leaving a deleted tag loaded in the form would invite an edit that could
  // not be saved.
  it('clears the form when the tag being edited is removed', () => {
    render();
    fixture.componentInstance.edit(buildTag());
    fixture.componentInstance.remove(buildTag());

    expect(fixture.componentInstance.editingTagId).toBeNull();
  });

  it('keeps the form when a different tag is removed', () => {
    render();
    fixture.componentInstance.edit(buildTag());
    fixture.componentInstance.remove(buildTag({ id: 'tag-2' }));

    expect(fixture.componentInstance.editingTagId).toBe('tag-1');
  });

  it('shows the reason the server refused a change', () => {
    tagService.createTag.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: "The tag 'klingon' already exists." },
          }),
      ),
    );

    render();
    fixture.componentInstance.form.patchValue({ name: 'Klingon' });
    fixture.componentInstance.save();

    expect(fixture.componentInstance.errorMessage).toContain('already exists');
  });

  it('falls back to a generic message when the server gives none', () => {
    tagService.createTag.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();
    fixture.componentInstance.form.patchValue({ name: 'Klingon' });
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
  });

  // A category added on the server before the client is redeployed should read
  // as itself rather than as a blank heading.
  it('shows an unknown category by its own name', () => {
    tagService.getTags.mockReturnValue(
      of([buildTag({ category: 'ALLEGIANCE' as never })]),
    );

    expect(render().textContent).toContain('ALLEGIANCE');
  });
});
