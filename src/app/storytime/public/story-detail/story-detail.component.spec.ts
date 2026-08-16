import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ChapterSummary,
  ContentRating,
  ReaderStoryStatus,
  Story,
  StoryProgress,
} from 'src/app/models/storytime.models';
import { ChapterService } from '../../chapter.service';
import { ProgressService } from '../../progress.service';
import { StoryService } from '../../story.service';
import { StoryDetailComponent } from './story-detail.component';

describe('StoryDetailComponent', () => {
  let fixture: ComponentFixture<StoryDetailComponent>;
  let storyService: { getStory: jest.Mock };
  let chapterService: { getChapters: jest.Mock };
  let progressService: {
    getStoryProgress: jest.Mock;
    setStoryStatus: jest.Mock;
    completeStory: jest.Mock;
    resetStory: jest.Mock;
  };
  let authService: { isLoggedIn: jest.Mock };

  /**
   * Builds the readable Chapters of the Story.
   *
   * @returns Two Chapters, in reading order.
   */
  const buildChapters = (): ChapterSummary[] =>
    [
      { id: 'chapter-1', slug: 'chapter-one', title: 'Chapter One' },
      { id: 'chapter-2', slug: 'chapter-two', title: 'Chapter Two' },
    ] as ChapterSummary[];

  /**
   * Builds the reader's progress.
   *
   * @param overrides - Fields to change.
   * @returns The progress.
   */
  const buildProgress = (
    overrides: Partial<StoryProgress> = {},
  ): StoryProgress =>
    ({
      storyId: 'story-1',
      status: ReaderStoryStatus.IN_PROGRESS,
      totalChapters: 2,
      readChapters: 1,
      percentComplete: 50,
      newChapterCount: 0,
      continueChapterId: 'chapter-2',
      lastReadChapterId: 'chapter-1',
      lastReadAt: null,
      completedAt: null,
      ...overrides,
    }) as StoryProgress;

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
    chapterService = { getChapters: jest.fn().mockReturnValue(of([])) };
    progressService = {
      getStoryProgress: jest.fn().mockReturnValue(of(buildProgress())),
      setStoryStatus: jest.fn().mockReturnValue(of(buildProgress())),
      completeStory: jest.fn().mockReturnValue(of(buildProgress())),
      resetStory: jest.fn().mockReturnValue(of(buildProgress())),
    };
    authService = { isLoggedIn: jest.fn().mockReturnValue(true) };

    TestBed.configureTestingModule({
      imports: [StoryDetailComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
        { provide: ChapterService, useValue: chapterService },
        { provide: ProgressService, useValue: progressService },
        { provide: AuthService, useValue: authService },
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
        { provide: ChapterService, useValue: chapterService },
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

  describe('Chapter list', () => {
    it('lists the published Chapters', () => {
      chapterService.getChapters.mockReturnValue(
        of([
          {
            id: 'chapter-1',
            slug: 'chapter-one',
            title: 'Chapter One',
            synopsis: 'A summary',
            estimatedReadingMinutes: 3,
          },
        ]),
      );

      const element = render();

      expect(element.textContent).toContain('Chapter One');
      expect(element.textContent).toContain('3 min read');
    });

    it('explains when a Story has no Chapters yet', () => {
      expect(render().textContent).toContain('No Chapters have been published');
    });

    // The Chapters are fetched separately so a failure there leaves the Story
    // itself readable.
    it('keeps the Story readable when the Chapter list fails', () => {
      chapterService.getChapters.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = render();

      expect(element.textContent).toContain('A Story');
      expect(fixture.componentInstance.chapterErrorMessage).toContain(
        'could not be loaded',
      );
      expect(fixture.componentInstance.errorMessage).toBe('');
    });
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

  describe("the reader's own progress", () => {
    beforeEach(() => {
      chapterService.getChapters.mockReturnValue(of(buildChapters()));
    });

    it('shows how far the reader has got', () => {
      const element = render();

      expect(element.textContent).toContain('1 of 2 Chapters read');
      expect(element.textContent).toContain('In progress');
    });

    it('sends Continue Reading to the first unfinished Chapter', () => {
      const element = render();
      const link = element.querySelector('.storytime-story__continue');

      expect(link?.textContent).toContain('Chapter Two');
      expect(link?.getAttribute('href')).toContain('chapter-two');
    });

    // A reader who has not started should be invited in, not asked to
    // "continue" something they have not begun.
    it('invites a new reader to start', () => {
      progressService.getStoryProgress.mockReturnValue(
        of(
          buildProgress({
            status: ReaderStoryStatus.NOT_STARTED,
            readChapters: 0,
            percentComplete: 0,
            continueChapterId: 'chapter-1',
          }),
        ),
      );

      const element = render();

      expect(element.textContent).toContain('Start reading');
      expect(element.textContent).not.toContain('Continue reading');
    });

    it('offers nothing to continue to once the Story is finished', () => {
      progressService.getStoryProgress.mockReturnValue(
        of(
          buildProgress({
            status: ReaderStoryStatus.COMPLETED,
            readChapters: 2,
            percentComplete: 100,
            continueChapterId: null,
          }),
        ),
      );

      const element = render();

      expect(element.querySelector('.storytime-story__continue')).toBeNull();
    });

    // The Chapter list and the progress are loaded separately, so the link has
    // to survive a progress row that names a Chapter the list does not hold.
    it('offers nothing to continue to for an unknown Chapter', () => {
      progressService.getStoryProgress.mockReturnValue(
        of(buildProgress({ continueChapterId: 'chapter-nine' })),
      );

      const element = render();

      expect(element.querySelector('.storytime-story__continue')).toBeNull();
    });

    it('says when there is new content since the reader last read', () => {
      progressService.getStoryProgress.mockReturnValue(
        of(buildProgress({ newChapterCount: 1 })),
      );

      const element = render();

      expect(element.textContent).toContain('1 new Chapter since');
    });

    it('counts several new Chapters', () => {
      progressService.getStoryProgress.mockReturnValue(
        of(buildProgress({ newChapterCount: 3 })),
      );

      const element = render();

      expect(element.textContent).toContain('3 new Chapters since');
    });

    it('sets a status the reader chose', () => {
      render();

      fixture.componentInstance.setStatus(ReaderStoryStatus.ON_HOLD);

      expect(progressService.setStoryStatus).toHaveBeenCalledWith(
        'story-1',
        ReaderStoryStatus.ON_HOLD,
      );
    });

    // Offering a reader the status they already have would do nothing.
    it('does not offer the status the Story already has', () => {
      progressService.getStoryProgress.mockReturnValue(
        of(buildProgress({ status: ReaderStoryStatus.ON_HOLD })),
      );

      const element = render();
      const buttons = Array.from(element.querySelectorAll('button')).map(
        button => button.textContent?.trim(),
      );

      expect(buttons).not.toContain('On hold');
      expect(buttons).toContain('Abandoned');
    });

    it('marks the whole Story read', () => {
      render();

      fixture.componentInstance.completeStory();

      expect(progressService.completeStory).toHaveBeenCalledWith('story-1');
    });

    it('offers no shortcut to finishing an already finished Story', () => {
      progressService.getStoryProgress.mockReturnValue(
        of(buildProgress({ readChapters: 2, percentComplete: 100 })),
      );

      const element = render();
      const buttons = Array.from(element.querySelectorAll('button')).map(
        button => button.textContent?.trim(),
      );

      expect(buttons).not.toContain('Mark whole Story read');
    });

    it('starts the Story again', () => {
      render();

      fixture.componentInstance.resetStory();

      expect(progressService.resetStory).toHaveBeenCalledWith('story-1');
    });

    it('keeps what comes back from a change', () => {
      progressService.setStoryStatus.mockReturnValue(
        of(buildProgress({ status: ReaderStoryStatus.ABANDONED })),
      );
      render();

      fixture.componentInstance.setStatus(ReaderStoryStatus.ABANDONED);

      expect(fixture.componentInstance.progress?.status).toBe(
        ReaderStoryStatus.ABANDONED,
      );
    });

    // Progress is bookkeeping. A failure to load or change it must leave the
    // Story readable rather than taking the page down.
    it('leaves the Story readable when progress cannot be loaded', () => {
      progressService.getStoryProgress.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = render();

      expect(element.textContent).toContain('A Story');
      expect(fixture.componentInstance.progress).toBeNull();
    });

    it('keeps the previous progress when a change fails', () => {
      progressService.setStoryStatus.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();

      fixture.componentInstance.setStatus(ReaderStoryStatus.ON_HOLD);

      expect(fixture.componentInstance.progress?.status).toBe(
        ReaderStoryStatus.IN_PROGRESS,
      );
    });

    // Progress is personal; there is none for a reader the server cannot
    // identify.
    describe('for a signed-out reader', () => {
      beforeEach(() => {
        authService.isLoggedIn.mockReturnValue(false);
      });

      it('asks for no progress', () => {
        render();

        expect(progressService.getStoryProgress).not.toHaveBeenCalled();
      });

      it('shows no progress controls', () => {
        const element = render();

        expect(element.querySelector('.storytime-story__progress')).toBeNull();
      });
    });
  });
});
