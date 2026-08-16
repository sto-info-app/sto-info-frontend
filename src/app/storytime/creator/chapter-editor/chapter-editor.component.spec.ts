import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  ChapterAppearance,
  ChapterMedia,
  ManagedChapter,
  ManagedCharacter,
} from 'src/app/models/storytime.models';
import { ChapterService } from '../../chapter.service';
import { CharacterService } from '../../character.service';
import { MediaService } from '../../media.service';
import { StorytimeService } from '../../storytime.service';
import { ChapterEditorComponent } from './chapter-editor.component';

describe('ChapterEditorComponent', () => {
  let fixture: ComponentFixture<ChapterEditorComponent>;
  let chapterService: {
    getMyChapter: jest.Mock;
    createChapter: jest.Mock;
    updateChapter: jest.Mock;
  };
  let characterService: {
    getMyCharacters: jest.Mock;
    getAppearances: jest.Mock;
    setAppearances: jest.Mock;
  };
  let mediaService: {
    getMyChapterMedia: jest.Mock;
    addMedia: jest.Mock;
    removeMedia: jest.Mock;
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
    mediaService = {
      getMyChapterMedia: jest.fn().mockReturnValue(of([])),
      addMedia: jest.fn().mockReturnValue(of({ id: 'media-1' })),
      removeMedia: jest.fn().mockReturnValue(of(undefined)),
    };
    characterService = {
      getMyCharacters: jest.fn().mockReturnValue(
        of([
          { id: 'character-1', name: 'Shran' },
          { id: 'character-2', name: 'T’Pol' },
        ] as ManagedCharacter[]),
      ),
      getAppearances: jest.fn().mockReturnValue(of([])),
      setAppearances: jest.fn().mockReturnValue(of([])),
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
        { provide: CharacterService, useValue: characterService },
        { provide: MediaService, useValue: mediaService },
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

  describe('videos', () => {
    /**
     * Renders the editor for an existing Chapter, where videos can exist.
     */
    const renderExisting = (): void => {
      routeParams.set('chapterId', 'chapter-1');
      render();
    };

    /**
     * Builds a saved video.
     *
     * @param id - The video identifier.
     * @returns The video.
     */
    const buildMedia = (id = 'media-1') =>
      ({
        id,
        chapterId: 'chapter-1',
        externalId: 'dQw4w9WgXcQ',
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        title: 'The escape',
      }) as ChapterMedia;

    it('lists the videos already on the Chapter', () => {
      mediaService.getMyChapterMedia.mockReturnValue(of([buildMedia()]));

      renderExisting();

      expect(fixture.componentInstance.media).toHaveLength(1);
      expect(mediaService.getMyChapterMedia).toHaveBeenCalledWith('chapter-1');
    });

    // The URL is sent whole and parsed on the server, so the client never has
    // to guess at what a valid YouTube link looks like.
    it('sends the pasted link as it stands', () => {
      renderExisting();
      fixture.componentInstance.mediaUrl = '  https://youtu.be/dQw4w9WgXcQ  ';

      fixture.componentInstance.addMedia();

      expect(mediaService.addMedia).toHaveBeenCalledWith('chapter-1', {
        url: 'https://youtu.be/dQw4w9WgXcQ',
      });
    });

    it('clears the box once the video is added', () => {
      renderExisting();
      fixture.componentInstance.mediaUrl = 'https://youtu.be/dQw4w9WgXcQ';

      fixture.componentInstance.addMedia();

      expect(fixture.componentInstance.mediaUrl).toBe('');
      expect(fixture.componentInstance.media).toHaveLength(1);
    });

    it('does nothing with an empty box', () => {
      renderExisting();

      fixture.componentInstance.addMedia();

      expect(mediaService.addMedia).not.toHaveBeenCalled();
    });

    // A Chapter has to exist before a video can hang off it.
    it('does nothing for a Chapter that has not been saved yet', () => {
      render();
      fixture.componentInstance.mediaUrl = 'https://youtu.be/dQw4w9WgXcQ';

      fixture.componentInstance.addMedia();

      expect(mediaService.addMedia).not.toHaveBeenCalled();
    });

    // The server explains what was wrong with the link, and repeating that
    // beats a generic apology.
    it('shows the reason the server gave', () => {
      mediaService.addMedia.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'That does not look like a YouTube link.' },
            }),
        ),
      );
      renderExisting();
      fixture.componentInstance.mediaUrl = 'https://example.test/nope';

      fixture.componentInstance.addMedia();

      expect(fixture.componentInstance.mediaErrorMessage).toBe(
        'That does not look like a YouTube link.',
      );
    });

    it('falls back to a plain message when the server gave no reason', () => {
      mediaService.addMedia.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      renderExisting();
      fixture.componentInstance.mediaUrl = 'https://youtu.be/dQw4w9WgXcQ';

      fixture.componentInstance.addMedia();

      expect(fixture.componentInstance.mediaErrorMessage).toContain(
        'could not be added',
      );
    });

    it('removes a video', () => {
      mediaService.getMyChapterMedia.mockReturnValue(of([buildMedia()]));
      renderExisting();

      fixture.componentInstance.removeMedia(buildMedia());

      expect(mediaService.removeMedia).toHaveBeenCalledWith('media-1');
      expect(fixture.componentInstance.media).toEqual([]);
    });

    it('keeps the other videos when removing one', () => {
      mediaService.getMyChapterMedia.mockReturnValue(
        of([buildMedia('media-1'), buildMedia('media-2')]),
      );
      renderExisting();

      fixture.componentInstance.removeMedia(buildMedia('media-1'));

      expect(fixture.componentInstance.media).toHaveLength(1);
    });

    it('explains a video that could not be removed', () => {
      mediaService.removeMedia.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      renderExisting();

      fixture.componentInstance.removeMedia(buildMedia());

      expect(fixture.componentInstance.mediaErrorMessage).toContain(
        'could not be removed',
      );
    });

    // A Chapter with no video at all is the normal case.
    it('leaves the writing editable when the videos cannot be loaded', () => {
      mediaService.getMyChapterMedia.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      renderExisting();

      expect(fixture.componentInstance.media).toEqual([]);
      expect(fixture.componentInstance.errorMessage).toBe('');
    });
  });

  describe('who appears in the Chapter', () => {
    /**
     * Renders the editor for an existing Chapter, where a cast can exist.
     */
    const renderExisting = (): void => {
      routeParams.set('chapterId', 'chapter-1');
      render();
    };

    it('offers the Story’s whole cast to choose from', () => {
      renderExisting();

      expect(fixture.componentInstance.cast).toHaveLength(2);
      expect(characterService.getMyCharacters).toHaveBeenCalledWith('story-1');
    });

    it('ticks the Characters already appearing', () => {
      characterService.getAppearances.mockReturnValue(
        of([{ character: { id: 'character-1' } }] as ChapterAppearance[]),
      );

      renderExisting();

      expect(fixture.componentInstance.isAppearing('character-1')).toBe(true);
      expect(fixture.componentInstance.isAppearing('character-2')).toBe(false);
    });

    // An appearance whose Character has been deleted has nothing to tick.
    it('ignores an appearance with no Character behind it', () => {
      characterService.getAppearances.mockReturnValue(
        of([{ character: null }] as ChapterAppearance[]),
      );

      renderExisting();

      expect(fixture.componentInstance.appearingCharacterIds.size).toBe(0);
    });

    it('ticks and unticks a Character', () => {
      renderExisting();

      fixture.componentInstance.toggleAppearance('character-1');
      expect(fixture.componentInstance.isAppearing('character-1')).toBe(true);

      fixture.componentInstance.toggleAppearance('character-1');
      expect(fixture.componentInstance.isAppearing('character-1')).toBe(false);
    });

    // Sent in cast order rather than tick order, so a Chapter's cast reads the
    // same way round as the Story's.
    it('saves the cast in the Story’s order', () => {
      renderExisting();
      fixture.componentInstance.toggleAppearance('character-2');
      fixture.componentInstance.toggleAppearance('character-1');

      fixture.componentInstance.saveCast();

      expect(characterService.setAppearances).toHaveBeenCalledWith(
        'chapter-1',
        [{ characterId: 'character-1' }, { characterId: 'character-2' }],
      );
    });

    it('saves an empty cast', () => {
      renderExisting();

      fixture.componentInstance.saveCast();

      expect(characterService.setAppearances).toHaveBeenCalledWith(
        'chapter-1',
        [],
      );
    });

    // A Chapter has to exist before anybody can appear in it.
    it('does nothing for a Chapter that has not been saved yet', () => {
      render();

      fixture.componentInstance.saveCast();

      expect(characterService.setAppearances).not.toHaveBeenCalled();
    });

    it('does not save twice at once', () => {
      renderExisting();

      fixture.componentInstance.isSavingCast = true;
      fixture.componentInstance.saveCast();

      expect(characterService.setAppearances).not.toHaveBeenCalled();
    });

    it('explains a cast that could not be saved', () => {
      characterService.setAppearances.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      renderExisting();

      fixture.componentInstance.saveCast();

      expect(fixture.componentInstance.castErrorMessage).toContain(
        'could not be saved',
      );
      expect(fixture.componentInstance.isSavingCast).toBe(false);
    });

    // Not every Story has a cast, and a failure here must leave the Chapter
    // editable rather than blocking the writing.
    it('leaves the Chapter editable when the cast cannot be loaded', () => {
      characterService.getMyCharacters.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      renderExisting();

      expect(fixture.componentInstance.cast).toEqual([]);
      expect(fixture.componentInstance.errorMessage).toBe('');
    });

    it('carries on when the existing cast cannot be loaded', () => {
      characterService.getAppearances.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      renderExisting();

      expect(fixture.componentInstance.appearingCharacterIds.size).toBe(0);
    });

    it('asks for no cast before the Story is known', () => {
      routeParams.clear();
      routeParams.set('chapterId', 'chapter-1');
      chapterService.getMyChapter.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      render();

      expect(characterService.getMyCharacters).not.toHaveBeenCalled();
    });
  });
});
