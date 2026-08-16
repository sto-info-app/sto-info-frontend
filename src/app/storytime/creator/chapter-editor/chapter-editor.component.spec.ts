import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagedChapter } from 'src/app/models/storytime.models';
import { ChapterService } from '../../chapter.service';
import { StorytimeService } from '../../storytime.service';
import { ChapterEditorComponent } from './chapter-editor.component';

describe('ChapterEditorComponent', () => {
  let fixture: ComponentFixture<ChapterEditorComponent>;
  let chapterService: {
    getMyChapter: jest.Mock;
    createChapter: jest.Mock;
    updateChapter: jest.Mock;
  };
  let storytimeService: { getLanguages: jest.Mock };
  let router: { navigate: jest.Mock };
  let routeParams: Map<string, string>;

  const existingChapter = {
    id: 'chapter-1',
    storyId: 'story-1',
    title: 'Chapter One',
    slug: 'chapter-one',
    synopsis: 'A summary',
    contentSource: 'The Enterprise went to warp.',
    languageCode: 'en',
    ownLanguageCode: null,
    version: 4,
  } as ManagedChapter;

  /**
   * Builds and renders the component.
   */
  const render = (): void => {
    fixture = TestBed.createComponent(ChapterEditorComponent);
    fixture.detectChanges();
  };

  beforeEach(() => {
    routeParams = new Map([['storyId', 'story-1']]);
    chapterService = {
      getMyChapter: jest.fn().mockReturnValue(of(existingChapter)),
      createChapter: jest.fn().mockReturnValue(of({ id: 'new-chapter' })),
      updateChapter: jest.fn().mockReturnValue(of(existingChapter)),
    };
    storytimeService = {
      getLanguages: jest
        .fn()
        .mockReturnValue(of([{ code: 'en', name: 'English' }])),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ChapterEditorComponent],
      providers: [
        provideRouter([]),
        { provide: ChapterService, useValue: chapterService },
        { provide: StorytimeService, useValue: storytimeService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: routeParams } },
        },
      ],
    });
  });

  describe('writing a new Chapter', () => {
    it('starts with an empty form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(true);
      expect(chapterService.getMyChapter).not.toHaveBeenCalled();
    });

    it('creates the Chapter in the Story from the route', () => {
      render();
      fixture.componentInstance.form.patchValue({ title: 'Chapter Two' });
      fixture.componentInstance.save();

      expect(chapterService.createChapter).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({ title: 'Chapter Two' }),
      );
      expect(router.navigate).toHaveBeenCalled();
    });

    it('starts with an empty Story when the route carries none', () => {
      TestBed.overrideProvider(ActivatedRoute, {
        useValue: { snapshot: { paramMap: new Map() } },
      });

      render();

      expect(fixture.componentInstance.storyId).toBe('');
    });

    it('refuses to save without a title', () => {
      render();
      fixture.componentInstance.save();

      expect(chapterService.createChapter).not.toHaveBeenCalled();
    });

    // An empty language means "the same as the Story", which the server
    // expects as an absent field rather than an empty string.
    it('omits the language when the Chapter follows its Story', () => {
      render();
      fixture.componentInstance.form.patchValue({
        title: 'Chapter Two',
        languageCode: '',
      });
      fixture.componentInstance.save();

      expect(chapterService.createChapter).toHaveBeenCalledWith(
        'story-1',
        expect.not.objectContaining({ languageCode: expect.anything() }),
      );
    });

    it('sends a language when the writer chooses one', () => {
      render();
      fixture.componentInstance.form.patchValue({
        title: 'Chapter Two',
        languageCode: 'tlh',
      });
      fixture.componentInstance.save();

      expect(chapterService.createChapter).toHaveBeenCalledWith(
        'story-1',
        expect.objectContaining({ languageCode: 'tlh' }),
      );
    });
  });

  describe('editing an existing Chapter', () => {
    beforeEach(() => {
      routeParams.set('chapterId', 'chapter-1');
    });

    it('loads the Chapter into the form', () => {
      render();

      expect(fixture.componentInstance.isNew).toBe(false);
      expect(fixture.componentInstance.form.value.title).toBe('Chapter One');
      expect(fixture.componentInstance.form.value.contentSource).toBe(
        'The Enterprise went to warp.',
      );
    });

    // Binding to the resolved language would silently pin an inherited one the
    // first time the writer saved.
    it('leaves the language blank when the Chapter follows its Story', () => {
      render();

      expect(fixture.componentInstance.form.value.languageCode).toBe('');
    });

    it('shows the language when the Chapter sets its own', () => {
      chapterService.getMyChapter.mockReturnValue(
        of({ ...existingChapter, ownLanguageCode: 'tlh' } as ManagedChapter),
      );

      render();

      expect(fixture.componentInstance.form.value.languageCode).toBe('tlh');
    });

    // A Chapter with no synopsis must load as an empty field, not the string
    // "null".
    it('loads a Chapter with no synopsis as a blank field', () => {
      chapterService.getMyChapter.mockReturnValue(
        of({ ...existingChapter, synopsis: null } as ManagedChapter),
      );

      render();

      expect(fixture.componentInstance.form.value.synopsis).toBe('');
    });

    it('sends the version it loaded', () => {
      render();
      fixture.componentInstance.save();

      expect(chapterService.updateChapter).toHaveBeenCalledWith(
        'chapter-1',
        expect.objectContaining({ version: 4 }),
      );
    });

    it('reports a Chapter it could not load', () => {
      chapterService.getMyChapter.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      render();

      expect(fixture.componentInstance.errorMessage).toContain(
        'could not be loaded',
      );
    });

    it('shows the reason the server refused a save', () => {
      chapterService.updateChapter.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                message: 'This Chapter has changed since you loaded it.',
              },
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
      chapterService.updateChapter.mockReturnValue(
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
