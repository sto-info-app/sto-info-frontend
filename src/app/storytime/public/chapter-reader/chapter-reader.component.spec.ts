import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { CommentService } from '../../comment.service';
import { ReactionService } from '../../reaction.service';
import {
  CONTENT_RATING_DESCRIPTIONS,
  CONTENT_RATING_LABELS,
  ChapterProgress,
  ChapterWithNavigation,
  ContentRating,
  ReaderChapterStatus,
  StoryProgress,
} from 'src/app/models/storytime.models';
import { ChapterService } from '../../chapter.service';
import { MediaService } from '../../media.service';
import { ProgressService } from '../../progress.service';
import { PROGRESS_WRITE_DEBOUNCE_MS } from '../../storytime.constants';
import { ChapterReaderComponent } from './chapter-reader.component';

describe('ChapterReaderComponent', () => {
  let fixture: ComponentFixture<ChapterReaderComponent>;
  let chapterService: { getChapter: jest.Mock };
  let progressService: {
    getChapterProgress: jest.Mock;
    updateChapterProgress: jest.Mock;
    setChapterRead: jest.Mock;
  };
  let authService: {
    isLoggedIn: jest.Mock;
    isLoggedInAsAdmin: jest.Mock;
    getUserId: jest.Mock;
    getHttpOptionsWithAccessToken: jest.Mock;
  };
  let reactionService: { getSummary: jest.Mock };
  let commentService: { getComments: jest.Mock };
  let mediaService: { getChapterMedia: jest.Mock };
  let params: BehaviorSubject<Map<string, string>>;

  /**
   * Builds a Story progress response.
   *
   * @param overrides - Fields to change.
   * @returns The progress.
   */
  const buildStoryProgress = (
    overrides: Partial<StoryProgress> = {},
  ): StoryProgress =>
    ({
      storyId: 'story-1',
      readChapters: 1,
      totalChapters: 3,
      percentComplete: 33,
      newChapterCount: 0,
      continueChapterId: 'chapter-2',
      ...overrides,
    }) as StoryProgress;

  /**
   * Builds a Chapter progress response.
   *
   * @param overrides - Fields to change.
   * @returns The progress.
   */
  const buildChapterProgress = (
    overrides: Partial<ChapterProgress> = {},
  ): ChapterProgress =>
    ({
      chapterId: 'chapter-1',
      status: ReaderChapterStatus.UNREAD,
      progressPercent: null,
      blockId: null,
      lastReadAt: null,
      ...overrides,
    }) as ChapterProgress;

  /**
   * Reports the rendered body at a chosen scroll position, since jsdom lays
   * nothing out and would otherwise report every measurement as zero.
   *
   * @param top - The body's top relative to the viewport.
   */
  const scrollTo = (top: number): void => {
    const body = fixture.componentInstance.bodyElement?.nativeElement;

    if (body) {
      body.getBoundingClientRect = () => ({ top, height: 4000 }) as DOMRect;
      Object.defineProperty(body, 'offsetHeight', {
        value: 4000,
        configurable: true,
      });
    }

    window.dispatchEvent(new Event('scroll'));
  };

  /**
   * Builds a Chapter response.
   *
   * @param overrides - Fields to change on the payload.
   * @returns The response.
   */
  const buildResponse = (
    overrides: Partial<ChapterWithNavigation> = {},
  ): ChapterWithNavigation =>
    ({
      chapter: {
        id: 'chapter-1',
        slug: 'chapter-one',
        title: 'Chapter One',
        synopsis: 'A summary',
        contentHtml: '<p id="b1">The Enterprise went to warp.</p>',
        languageCode: 'en',
        contentRating: ContentRating.GENERAL,
        wordCount: 5,
        estimatedReadingMinutes: 1,
        coverImageUrl: null,
        coverImageAlt: null,
      },
      previous: null,
      next: null,
      ...overrides,
    }) as ChapterWithNavigation;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ChapterReaderComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Renders a Chapter carrying a chosen rating.
   *
   * @param contentRating - The rating inherited from the Story.
   * @returns The rendered element.
   */
  const renderRated = (contentRating: ContentRating): HTMLElement => {
    const response = buildResponse();

    chapterService.getChapter.mockReturnValue(
      of({ ...response, chapter: { ...response.chapter, contentRating } }),
    );

    return render();
  };

  beforeEach(() => {
    params = new BehaviorSubject(
      new Map([
        ['storySlug', 'a-story'],
        ['chapterSlug', 'chapter-one'],
      ]),
    );
    chapterService = {
      getChapter: jest.fn().mockReturnValue(of(buildResponse())),
    };
    progressService = {
      getChapterProgress: jest.fn().mockReturnValue(of(buildChapterProgress())),
      updateChapterProgress: jest
        .fn()
        .mockReturnValue(of(buildStoryProgress())),
      setChapterRead: jest.fn().mockReturnValue(of(buildStoryProgress())),
    };
    // The page carries the rating buttons and the comment thread, which read
    // their own services. Stubbing them keeps this spec about reading.
    authService = {
      isLoggedIn: jest.fn().mockReturnValue(true),
      isLoggedInAsAdmin: jest.fn().mockReturnValue(false),
      getUserId: jest.fn().mockReturnValue('reader-1'),
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue({}),
    };
    reactionService = {
      getSummary: jest.fn().mockReturnValue(
        of({
          targetId: 'chapter-1',
          upVotes: 0,
          downVotes: 0,
          rating: 0,
          mine: null,
        }),
      ),
    };
    commentService = { getComments: jest.fn().mockReturnValue(of([])) };
    mediaService = { getChapterMedia: jest.fn().mockReturnValue(of([])) };

    TestBed.configureTestingModule({
      imports: [ChapterReaderComponent],
      providers: [
        provideRouter([]),
        { provide: ChapterService, useValue: chapterService },
        { provide: ProgressService, useValue: progressService },
        { provide: AuthService, useValue: authService },
        { provide: ReactionService, useValue: reactionService },
        { provide: CommentService, useValue: commentService },
        { provide: MediaService, useValue: mediaService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: new Map() } },
        },
      ],
    });
  });

  it('shows the Chapter', () => {
    const element = render();

    expect(element.textContent).toContain('Chapter One');
    expect(element.textContent).toContain('A summary');
  });

  // A reader who follows a link straight to a Chapter never passes the Story
  // page, so whose work it is has to be said here too.
  describe('who wrote it', () => {
    /**
     * Reads a fact by its caption.
     *
     * @param element - The rendered page.
     * @param name - The caption.
     * @returns The value shown against it, or null when it is not shown.
     */
    const factFor = (element: HTMLElement, name: string): string | null =>
      [...element.querySelectorAll('.info-item')]
        .find(item =>
          item.querySelector('.label')?.textContent?.trim().startsWith(name),
        )
        ?.querySelector('.value')
        ?.textContent?.trim() ?? null;

    it('names the author among the facts', () => {
      chapterService.getChapter.mockReturnValue(
        of(
          buildResponse({
            chapter: {
              ...buildResponse().chapter,
              author: { username: 'captain.picard', publiclyVisible: true },
            },
          }),
        ),
      );

      expect(factFor(render(), 'Author')).toBe('captain.picard');
    });

    it('says nothing when the account has gone', () => {
      chapterService.getChapter.mockReturnValue(
        of(
          buildResponse({
            chapter: { ...buildResponse().chapter, author: null },
          }),
        ),
      );

      expect(factFor(render(), 'Author')).toBeNull();
    });
  });

  it('renders the server-rendered body', () => {
    const element = render();

    expect(
      element.querySelector('.storytime-chapter__body')?.innerHTML,
    ).toContain('The Enterprise went to warp.');
  });

  // The block anchors are what reading progress will be recorded against, so
  // they must survive into the DOM.
  it('keeps the block anchors in the rendered body', () => {
    const element = render();

    expect(
      element.querySelector('.storytime-chapter__body #b1'),
    ).not.toBeNull();
  });

  // The lang attribute lets a screen reader pronounce the Chapter correctly.
  it('carries the resolved language on the article', () => {
    const element = render();

    expect(element.querySelector('article')?.getAttribute('lang')).toBe('en');
  });

  it('carries a Chapter language that differs from its Story', () => {
    chapterService.getChapter.mockReturnValue(
      of(
        buildResponse({
          chapter: {
            ...buildResponse().chapter,
            languageCode: 'tlh',
          },
        } as Partial<ChapterWithNavigation>),
      ),
    );

    const element = render();

    expect(element.querySelector('article')?.getAttribute('lang')).toBe('tlh');
  });

  it('offers no navigation for a lone Chapter', () => {
    const element = render();

    expect(element.querySelector('.storytime-chapter__previous')).toBeNull();
    expect(element.querySelector('.storytime-chapter__next')).toBeNull();
  });

  it('offers navigation to the neighbouring Chapters', () => {
    chapterService.getChapter.mockReturnValue(
      of(
        buildResponse({
          previous: { slug: 'prologue', title: 'Prologue' },
          next: { slug: 'chapter-two', title: 'Chapter Two' },
        }),
      ),
    );

    const element = render();

    expect(element.textContent).toContain('Prologue');
    expect(element.textContent).toContain('Chapter Two');
  });

  // Moving to the next Chapter changes the URL without leaving the component,
  // so the reader has to react to the parameters rather than read them once.
  it('reloads when the route moves to another Chapter', () => {
    render();
    params.next(
      new Map([
        ['storySlug', 'a-story'],
        ['chapterSlug', 'chapter-two'],
      ]),
    );

    expect(chapterService.getChapter).toHaveBeenCalledTimes(2);
    expect(chapterService.getChapter).toHaveBeenLastCalledWith(
      'a-story',
      'chapter-two',
    );
  });

  it('explains a Chapter with no content', () => {
    chapterService.getChapter.mockReturnValue(
      of(
        buildResponse({
          chapter: { ...buildResponse().chapter, contentHtml: null },
        } as Partial<ChapterWithNavigation>),
      ),
    );

    const element = render();

    expect(element.textContent).toContain('no content yet');
  });

  // A route without the parameters should still make a request that fails
  // cleanly, rather than throwing before it starts.
  it('asks for empty slugs when the route carries none', () => {
    params.next(new Map());

    render();

    expect(chapterService.getChapter).toHaveBeenCalledWith('', '');
  });

  it('explains a missing Chapter', () => {
    chapterService.getChapter.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be found',
    );
  });

  it('reports another failure differently', () => {
    chapterService.getChapter.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be read',
    );
  });

  describe('embedded videos', () => {
    /**
     * Builds a video on this Chapter.
     *
     * @returns The video.
     */
    const buildMedia = () =>
      ({
        id: 'media-1',
        chapterId: 'chapter-1',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        title: 'The escape',
        caption: null,
      }) as never;

    it('shows the videos on the Chapter', () => {
      mediaService.getChapterMedia.mockReturnValue(of([buildMedia()]));

      const element = render();

      expect(element.querySelector('.storytime-chapter__media')).not.toBeNull();
      expect(element.textContent).toContain('The escape');
    });

    // Nothing is loaded from YouTube until the reader asks for it.
    it('loads no iframe until the reader presses play', () => {
      mediaService.getChapterMedia.mockReturnValue(of([buildMedia()]));

      const element = render();

      expect(element.querySelector('iframe')).toBeNull();
    });

    it('asks for the Chapter’s videos by its slugs', () => {
      render();

      expect(mediaService.getChapterMedia).toHaveBeenCalledWith(
        'a-story',
        'chapter-one',
      );
    });

    // Most Chapters have no video at all.
    it('shows no media section when there are none', () => {
      const element = render();

      expect(element.querySelector('.storytime-chapter__media')).toBeNull();
    });

    it('leaves the writing readable when the videos cannot be loaded', () => {
      mediaService.getChapterMedia.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = render();

      expect(element.textContent).toContain('The Enterprise went to warp.');
      expect(fixture.componentInstance.media).toEqual([]);
    });

    it('forgets the previous Chapter’s videos when moving on', () => {
      mediaService.getChapterMedia.mockReturnValueOnce(of([buildMedia()]));
      render();

      mediaService.getChapterMedia.mockReturnValue(of([]));
      params.next(
        new Map([
          ['storySlug', 'a-story'],
          ['chapterSlug', 'chapter-two'],
        ]),
      );

      expect(fixture.componentInstance.media).toEqual([]);
    });
  });

  describe('recording where the reader is', () => {
    // A scroll fires continuously. Without the pause a reader moving down a
    // long Chapter would send a request per frame.
    it('waits for the reader to stop scrolling', fakeAsync(() => {
      render();

      scrollTo(-1200);
      scrollTo(-1600);
      scrollTo(-2000);

      expect(progressService.updateChapterProgress).not.toHaveBeenCalled();

      tick(PROGRESS_WRITE_DEBOUNCE_MS);

      expect(progressService.updateChapterProgress).toHaveBeenCalledTimes(1);
    }));

    it('reports the position it settled on', fakeAsync(() => {
      render();

      scrollTo(-1200);
      tick(PROGRESS_WRITE_DEBOUNCE_MS);

      // Derived from the viewport the test environment reports rather than
      // assumed, since the measurement is relative to it.
      const expectedPercent = Math.round(
        ((window.innerHeight + 1200) / 4000) * 100,
      );

      expect(progressService.updateChapterProgress).toHaveBeenCalledWith(
        'chapter-1',
        expect.objectContaining({
          progressPercent: expectedPercent,
          blockId: 'b1',
        }),
      );
    }));

    // Not every Chapter has anchors to report — an empty or unrendered body
    // has none — and a position with no block is still worth recording.
    it('reports a position with no block anchor', fakeAsync(() => {
      chapterService.getChapter.mockReturnValue(
        of(
          buildResponse({
            chapter: {
              ...buildResponse().chapter,
              contentHtml: '<p>No anchors here.</p>',
            },
          } as Partial<ChapterWithNavigation>),
        ),
      );
      render();

      scrollTo(-1200);
      tick(PROGRESS_WRITE_DEBOUNCE_MS);

      expect(progressService.updateChapterProgress).toHaveBeenCalledWith(
        'chapter-1',
        expect.not.objectContaining({ blockId: expect.anything() }),
      );
    }));

    // A reader who scrolls and then moves on within the debounce window must
    // not have their position recorded against the Chapter they moved to.
    it('records against the Chapter the position was measured in', fakeAsync(() => {
      render();
      scrollTo(-1200);

      chapterService.getChapter.mockReturnValue(
        of(
          buildResponse({
            chapter: { ...buildResponse().chapter, id: 'chapter-2' },
          } as Partial<ChapterWithNavigation>),
        ),
      );
      params.next(
        new Map([
          ['storySlug', 'a-story'],
          ['chapterSlug', 'chapter-two'],
        ]),
      );
      tick(PROGRESS_WRITE_DEBOUNCE_MS);

      expect(progressService.updateChapterProgress).toHaveBeenCalledWith(
        'chapter-1',
        expect.anything(),
      );
    }));

    it('shows the Story progress that comes back', fakeAsync(() => {
      render();

      scrollTo(-1200);
      tick(PROGRESS_WRITE_DEBOUNCE_MS);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        '1 of 3 Chapters read',
      );
    }));

    // Nothing about progress is worth interrupting somebody's reading for.
    it('carries on reading when recording fails', fakeAsync(() => {
      progressService.updateChapterProgress.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      const element = render();

      scrollTo(-1200);
      tick(PROGRESS_WRITE_DEBOUNCE_MS);
      fixture.detectChanges();

      expect(element.textContent).toContain('The Enterprise went to warp.');
    }));

    // Progress is personal, so there is nothing to record for a reader the
    // server cannot identify.
    it('records nothing for a signed-out reader', fakeAsync(() => {
      authService.isLoggedIn.mockReturnValue(false);

      render();
      scrollTo(-1200);
      tick(PROGRESS_WRITE_DEBOUNCE_MS);

      expect(progressService.updateChapterProgress).not.toHaveBeenCalled();
      expect(progressService.getChapterProgress).not.toHaveBeenCalled();
    }));

    it('offers no progress controls to a signed-out reader', () => {
      authService.isLoggedIn.mockReturnValue(false);

      const element = render();

      expect(
        element.querySelector('.storytime-chapter__read-toggle'),
      ).toBeNull();
    });
  });

  describe('picking up where the reader left off', () => {
    // Moving somebody's page under them as it loads is disorienting, and a
    // reader who wanted the start of the Chapter would have no way back.
    it('offers to resume rather than jumping', () => {
      progressService.getChapterProgress.mockReturnValue(
        of(
          buildChapterProgress({
            status: ReaderChapterStatus.IN_PROGRESS,
            blockId: 'b1',
          }),
        ),
      );

      const element = render();

      expect(element.textContent).toContain('Pick up where you left off');
    });

    it('scrolls to the stored block when asked', () => {
      progressService.getChapterProgress.mockReturnValue(
        of(
          buildChapterProgress({
            status: ReaderChapterStatus.IN_PROGRESS,
            blockId: 'b1',
          }),
        ),
      );
      const element = render();
      const block = element.querySelector('#b1') as HTMLElement;
      block.scrollIntoView = jest.fn();

      fixture.componentInstance.resume();

      expect(block.scrollIntoView).toHaveBeenCalled();
    });

    // Once taken, the offer is spent: a second click would drag the reader
    // back up to where they had already resumed from.
    it('offers to resume only once', () => {
      progressService.getChapterProgress.mockReturnValue(
        of(
          buildChapterProgress({
            status: ReaderChapterStatus.IN_PROGRESS,
            blockId: 'b1',
          }),
        ),
      );
      const element = render();
      const block = element.querySelector('#b1') as HTMLElement;
      block.scrollIntoView = jest.fn();

      fixture.componentInstance.resume();
      fixture.componentInstance.resume();

      expect(block.scrollIntoView).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.resumeBlockId).toBeNull();
    });

    // A creator who rewrites a Chapter can remove the paragraph somebody
    // stopped at, so the stored anchor may no longer be in the page.
    it('does nothing when the stored block has since gone', () => {
      progressService.getChapterProgress.mockReturnValue(
        of(
          buildChapterProgress({
            status: ReaderChapterStatus.IN_PROGRESS,
            blockId: 'b99',
          }),
        ),
      );
      render();

      expect(() => fixture.componentInstance.resume()).not.toThrow();
      expect(fixture.componentInstance.resumeBlockId).toBeNull();
    });

    it('does nothing when there is no resume anchor to scroll to', () => {
      render();

      fixture.componentInstance.resumeBlockId = null;
      expect(() => fixture.componentInstance.resume()).not.toThrow();
      expect(fixture.componentInstance.resumeBlockId).toBeNull();
    });

    it('offers nothing when the reader has not started the Chapter', () => {
      const element = render();

      expect(element.textContent).not.toContain('Pick up where you left off');
    });

    // A Chapter they finished has no "where they left off" worth returning to.
    it('offers nothing for a Chapter already read', () => {
      progressService.getChapterProgress.mockReturnValue(
        of(
          buildChapterProgress({
            status: ReaderChapterStatus.READ,
            blockId: 'b1',
          }),
        ),
      );

      const element = render();

      expect(element.textContent).not.toContain('Pick up where you left off');
    });

    it('forgets the offer when moving to another Chapter', () => {
      progressService.getChapterProgress.mockReturnValueOnce(
        of(
          buildChapterProgress({
            status: ReaderChapterStatus.IN_PROGRESS,
            blockId: 'b1',
          }),
        ),
      );
      render();

      params.next(
        new Map([
          ['storySlug', 'a-story'],
          ['chapterSlug', 'chapter-two'],
        ]),
      );
      fixture.detectChanges();

      expect(progressService.getChapterProgress).toHaveBeenCalledTimes(2);
      expect(fixture.componentInstance.resumeBlockId).toBeNull();
    });

    it('carries on when the stored position cannot be loaded', () => {
      progressService.getChapterProgress.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = render();

      expect(element.textContent).toContain('The Enterprise went to warp.');
    });
  });

  // A Chapter opened from a link, a feed or a search result never passes the
  // Story page, which is where the rating warning would otherwise have been.
  describe('the rating warning', () => {
    it.each([ContentRating.MATURE, ContentRating.ADULTS_ONLY])(
      'warns before the content of a %s Chapter',
      rating => {
        const element = renderRated(rating);
        const warning = element.querySelector('app-lcars-warning-message');

        expect(warning).not.toBeNull();
        expect(element.textContent).toContain(CONTENT_RATING_LABELS[rating]);
        expect(element.textContent).toContain(
          CONTENT_RATING_DESCRIPTIONS[rating],
        );
      },
    );

    // The warning has to come first to be a warning at all.
    it('places the warning ahead of the Chapter body', () => {
      const element = renderRated(ContentRating.ADULTS_ONLY);
      const warning = element.querySelector('app-lcars-warning-message');
      const body = element.querySelector('.storytime-chapter__body');

      expect(warning).not.toBeNull();
      expect(body).not.toBeNull();
      expect(
        warning!.compareDocumentPosition(body as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    // Warning on everything would teach readers to ignore the warning.
    it('says nothing about a General Chapter', () => {
      const element = renderRated(ContentRating.GENERAL);

      expect(element.querySelector('app-lcars-warning-message')).toBeNull();
    });
  });

  describe('marking a Chapter read', () => {
    it('marks it read', () => {
      render();

      fixture.componentInstance.setRead(true);

      expect(progressService.setChapterRead).toHaveBeenCalledWith(
        'chapter-1',
        true,
      );
      expect(fixture.componentInstance.isRead).toBe(true);
    });

    it('puts it back to unread', () => {
      progressService.getChapterProgress.mockReturnValue(
        of(buildChapterProgress({ status: ReaderChapterStatus.READ })),
      );
      render();

      fixture.componentInstance.setRead(false);

      expect(progressService.setChapterRead).toHaveBeenCalledWith(
        'chapter-1',
        false,
      );
      expect(fixture.componentInstance.isRead).toBe(false);
    });

    it('shows a Chapter the reader has already read as read', () => {
      progressService.getChapterProgress.mockReturnValue(
        of(buildChapterProgress({ status: ReaderChapterStatus.READ })),
      );

      const element = render();

      expect(
        element
          .querySelector('.storytime-chapter__read-toggle')
          ?.getAttribute('aria-pressed'),
      ).toBe('true');
    });

    // Leaving the button showing the change when the server never accepted it
    // would tell the reader something untrue.
    it('leaves the Chapter unread when the request fails', () => {
      progressService.setChapterRead.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      render();

      fixture.componentInstance.setRead(true);

      expect(fixture.componentInstance.isRead).toBe(false);
    });

    it('does nothing for a signed-out reader', () => {
      authService.isLoggedIn.mockReturnValue(false);
      render();

      fixture.componentInstance.setRead(true);

      expect(progressService.setChapterRead).not.toHaveBeenCalled();
    });
  });
});
