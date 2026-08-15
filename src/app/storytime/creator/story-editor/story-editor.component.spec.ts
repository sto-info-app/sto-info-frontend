import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagedStory } from 'src/app/models/storytime.models';
import { StorytimeService } from '../../storytime.service';
import { StoryService } from '../../story.service';
import { StoryEditorComponent } from './story-editor.component';

describe('StoryEditorComponent', () => {
  let fixture: ComponentFixture<StoryEditorComponent>;
  let storyService: {
    getMyStory: jest.Mock;
    createStory: jest.Mock;
    updateStory: jest.Mock;
  };
  let storytimeService: { getLanguages: jest.Mock };
  let router: { navigate: jest.Mock };
  let routeParams: Map<string, string>;

  const existingStory = {
    id: 'story-1',
    title: 'A Story',
    slug: 'a-story',
    shortDescription: 'A summary',
    description: '# Source',
    contentRating: 'GENERAL',
    completionState: 'ONGOING',
    visibility: 'PRIVATE',
    languageCode: 'en',
    version: 4,
  } as ManagedStory;

  /**
   * Builds and renders the component.
   */
  const render = (): void => {
    fixture = TestBed.createComponent(StoryEditorComponent);
    fixture.detectChanges();
  };

  beforeEach(() => {
    routeParams = new Map();
    storyService = {
      getMyStory: jest.fn().mockReturnValue(of(existingStory)),
      createStory: jest.fn().mockReturnValue(of({ id: 'new-story' })),
      updateStory: jest.fn().mockReturnValue(of(existingStory)),
    };
    storytimeService = {
      getLanguages: jest
        .fn()
        .mockReturnValue(of([{ code: 'en', name: 'English' }])),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [StoryEditorComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
        { provide: StorytimeService, useValue: storytimeService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: routeParams } },
        },
      ],
    });
  });

  describe('creating', () => {
    it('starts with an empty form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(true);
      expect(fixture.componentInstance.form.value.title).toBe('');
      expect(storyService.getMyStory).not.toHaveBeenCalled();
    });

    it('offers the languages the server accepts', () => {
      render();

      expect(fixture.componentInstance.languages).toEqual([
        { code: 'en', name: 'English' },
      ]);
    });

    it('refuses to save without a title', () => {
      render();
      fixture.componentInstance.save();

      expect(storyService.createStory).not.toHaveBeenCalled();
    });

    it('creates the Story and goes to its editor', () => {
      render();
      fixture.componentInstance.form.patchValue({ title: 'A New Story' });
      fixture.componentInstance.save();

      expect(storyService.createStory).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'A New Story' }),
      );
      expect(router.navigate).toHaveBeenCalled();
    });

    // A new Story has no version to send.
    it('sends no version when creating', () => {
      render();
      fixture.componentInstance.form.patchValue({ title: 'A New Story' });
      fixture.componentInstance.save();

      expect(storyService.createStory).toHaveBeenCalledWith(
        expect.not.objectContaining({ version: expect.anything() }),
      );
    });
  });

  describe('editing', () => {
    beforeEach(() => {
      routeParams.set('storyId', 'story-1');
    });

    it('loads the Story into the form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(false);
      expect(fixture.componentInstance.form.value.title).toBe('A Story');
      expect(fixture.componentInstance.form.value.description).toBe('# Source');
    });

    // The version goes with the update so a stale edit is refused rather than
    // silently overwriting a change made elsewhere.
    it('sends the version it loaded', () => {
      render();
      fixture.componentInstance.save();

      expect(storyService.updateStory).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({ version: 4 }),
      );
    });

    // A Story with no summary or description must load as empty fields, not
    // as the string "null".
    it('loads a Story with no summary or description as blank fields', () => {
      storyService.getMyStory.mockReturnValue(
        of({
          ...existingStory,
          shortDescription: null,
          description: null,
        } as ManagedStory),
      );

      render();

      expect(fixture.componentInstance.form.value.shortDescription).toBe('');
      expect(fixture.componentInstance.form.value.description).toBe('');
    });

    it('reports a Story it could not load', () => {
      storyService.getMyStory.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      render();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be loaded',
      );
    });

    // The server names the specific problem, which is more use than a generic
    // failure would be.
    it('shows the reason the server refused a save', () => {
      storyService.updateStory.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'This Story has changed since you loaded it.' },
            }),
        ),
      );

      render();
      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'changed since you loaded it',
      );
      expect(fixture.componentInstance.isSaving).toBe(false);
    });

    it('falls back to a generic message when the server gives none', () => {
      storyService.updateStory.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();
      fixture.componentInstance.save();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be saved',
      );
    });
  });
});
