import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { CommentService } from '../../comment.service';
import { FollowService } from '../../follow.service';
import { ReactionService } from '../../reaction.service';
import { ReadingListService } from '../../reading-list.service';
import {
  Character,
  ChapterSummary,
  ContentRating,
  CrewCredit,
  ReaderStoryStatus,
  Story,
  StoryProgress,
  StorytimeReportReason,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { ChapterService } from '../../chapter.service';
import { CharacterService } from '../../character.service';
import { CrewService } from '../../crew.service';
import { ProgressService } from '../../progress.service';
import { StorytimeModerationService } from '../../storytime-moderation.service';
import { StoryService } from '../../story.service';
import { StoryDetailComponent } from './story-detail.component';

describe('StoryDetailComponent', () => {
  let fixture: ComponentFixture<StoryDetailComponent>;
  let storyService: { getStory: jest.Mock };
  let chapterService: { getChapters: jest.Mock };
  let characterService: { getCharacters: jest.Mock };
  let crewService: { getCredits: jest.Mock };
  let progressService: {
    getStoryProgress: jest.Mock;
    setStoryStatus: jest.Mock;
    completeStory: jest.Mock;
    resetStory: jest.Mock;
  };
  let authService: {
    isLoggedIn: jest.Mock;
    isLoggedInAsAdmin: jest.Mock;
    getUserId: jest.Mock;
    getHttpOptionsWithAccessToken: jest.Mock;
  };
  let reactionService: { getSummary: jest.Mock };
  let commentService: { getComments: jest.Mock };
  let followService: { getFollowState: jest.Mock };
  let readingListService: { getMyLists: jest.Mock; getListsHolding: jest.Mock };
  let moderationService: { report: jest.Mock };
  let dialog: { open: jest.Mock };

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
    characterService = { getCharacters: jest.fn().mockReturnValue(of([])) };
    crewService = { getCredits: jest.fn().mockReturnValue(of([])) };
    progressService = {
      getStoryProgress: jest.fn().mockReturnValue(of(buildProgress())),
      setStoryStatus: jest.fn().mockReturnValue(of(buildProgress())),
      completeStory: jest.fn().mockReturnValue(of(buildProgress())),
      resetStory: jest.fn().mockReturnValue(of(buildProgress())),
    };
    // The page carries the social controls, which read their own services and
    // take the reader from the token. Stubbing them keeps this spec about the
    // Story rather than about what readers do with it.
    authService = {
      isLoggedIn: jest.fn().mockReturnValue(true),
      isLoggedInAsAdmin: jest.fn().mockReturnValue(false),
      getUserId: jest.fn().mockReturnValue('reader-1'),
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue({}),
    };
    reactionService = {
      getSummary: jest.fn().mockReturnValue(
        of({
          targetId: 'story-1',
          upVotes: 0,
          downVotes: 0,
          rating: 0,
          mine: null,
        }),
      ),
    };
    commentService = { getComments: jest.fn().mockReturnValue(of([])) };
    followService = {
      getFollowState: jest
        .fn()
        .mockReturnValue(of({ isFollowing: false, followerCount: 0 })),
    };
    readingListService = {
      getMyLists: jest.fn().mockReturnValue(of([])),
      getListsHolding: jest.fn().mockReturnValue(of([])),
    };
    moderationService = {
      report: jest.fn().mockReturnValue(of({ id: 'report-1' })),
    };
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => of(null) }),
    };

    TestBed.configureTestingModule({
      imports: [StoryDetailComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
        { provide: ChapterService, useValue: chapterService },
        { provide: CharacterService, useValue: characterService },
        { provide: CrewService, useValue: crewService },
        { provide: ProgressService, useValue: progressService },
        { provide: AuthService, useValue: authService },
        { provide: StorytimeModerationService, useValue: moderationService },
        { provide: MatDialog, useValue: dialog },
        { provide: ReactionService, useValue: reactionService },
        { provide: CommentService, useValue: commentService },
        { provide: FollowService, useValue: followService },
        { provide: ReadingListService, useValue: readingListService },
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

  // Two views of the same work, read one at a time rather than one after the
  // other. The conversation still folds away, but it belongs to the thread
  // rather than to this page, and is tested where it is built.
  describe('the tabs', () => {
    /**
     * Reads the tab strip's buttons.
     *
     * @param element - The rendered page.
     * @returns One button per tab, in the order they are shown.
     */
    const tabButtons = (element: HTMLElement): HTMLButtonElement[] => [
      ...element.querySelectorAll<HTMLButtonElement>('.lcars-tabs .lcars-tab'),
    ];

    /**
     * Reads a panel by the name it carries.
     *
     * @param element - The rendered page.
     * @param name - The panel's label.
     * @returns The panel, or null when the page has no such panel.
     */
    const panelFor = (element: HTMLElement, name: string): Element | null =>
      element.querySelector(`[role="tabpanel"][aria-label="${name}"]`);

    beforeEach(() => {
      characterService.getCharacters.mockReturnValue(
        of([
          {
            id: 'character-1',
            slug: 'captain-shran',
            name: 'Captain Shran',
            shortBio: 'An Andorian officer.',
            portraitImageThumbnailUrl: null,
            portraitImageAlt: null,
          },
        ] as Character[]),
      );
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
    });

    // Chapters leads: it is what somebody arriving at a Story came for.
    it('opens on the Chapters', () => {
      const element = render();

      expect(
        tabButtons(element).map(button => button.textContent?.trim()),
      ).toEqual(['Chapters', 'Cast']);
      expect(panelFor(element, 'Chapters')?.hasAttribute('hidden')).toBe(false);
      expect(panelFor(element, 'Cast')?.hasAttribute('hidden')).toBe(true);
    });

    it('shows the cast when its tab is chosen', () => {
      const element = render();

      tabButtons(element)[1].click();
      fixture.detectChanges();

      expect(panelFor(element, 'Cast')?.hasAttribute('hidden')).toBe(false);
      expect(panelFor(element, 'Chapters')?.hasAttribute('hidden')).toBe(true);
      expect(element.textContent).toContain('Captain Shran');
    });

    it('goes back to the Chapters again', () => {
      const element = render();

      tabButtons(element)[1].click();
      fixture.detectChanges();
      tabButtons(element)[0].click();
      fixture.detectChanges();

      expect(panelFor(element, 'Chapters')?.hasAttribute('hidden')).toBe(false);
      expect(element.textContent).toContain('Chapter One');
    });

    it('marks the chosen tab for a screen reader', () => {
      const element = render();
      const [chapters, cast] = tabButtons(element);

      expect(chapters.getAttribute('aria-selected')).toBe('true');
      expect(cast.getAttribute('aria-selected')).toBe('false');

      cast.click();
      fixture.detectChanges();

      expect(chapters.getAttribute('aria-selected')).toBe('false');
      expect(cast.getAttribute('aria-selected')).toBe('true');
    });

    // A tab that opens on an empty list is worse than no tab at all.
    it('offers no cast tab for a Story with nobody in it', () => {
      characterService.getCharacters.mockReturnValue(of([]));

      const element = render();

      expect(
        tabButtons(element).map(button => button.textContent?.trim()),
      ).toEqual(['Chapters']);
      expect(panelFor(element, 'Cast')).toBeNull();
    });
  });

  describe('the facts that need explaining', () => {
    /**
     * Reads a fact's help control.
     *
     * Matched on the start of the caption rather than anywhere in it: the
     * explanation lives inside the label, so a label carrying help reads as
     * its caption followed by every word of that explanation.
     *
     * @param element - The rendered page.
     * @param name - The fact's caption.
     * @returns The control beside that caption, or null when it has none.
     */
    const helpFor = (element: HTMLElement, name: string): Element | null =>
      [...element.querySelectorAll('.info-item')]
        .find(item =>
          item.querySelector('.label')?.textContent?.trim().startsWith(name),
        )
        ?.querySelector('app-storytime-setting-help') ?? null;

    // A rating and a status are each one word standing for a decision about
    // somebody else's reading, and neither word explains itself.
    it.each([['Status'], ['Content rating']])('offers help on %s', name => {
      expect(helpFor(render(), name)).not.toBeNull();
    });

    it('leaves the facts that speak for themselves alone', () => {
      const element = render();

      expect(helpFor(element, 'Chapters')).toBeNull();
    });

    it('explains every rating there is', () => {
      const element = render();
      const help = helpFor(element, 'Content rating');

      expect(help?.textContent).toContain('General');
      expect(help?.textContent).toContain('Mature');
      expect(help?.textContent).toContain('Adults Only');
    });

    it('explains every status there is', () => {
      const element = render();
      const help = helpFor(element, 'Status');

      expect(help?.textContent).toContain('The Story is still being written.');
      expect(help?.textContent).toContain(
        'The Story will not receive any more Chapters.',
      );
    });

    // Closed until asked for: the page is read, not interrogated.
    it('keeps the explanation out of the way until it is opened', () => {
      const details = helpFor(render(), 'Status')?.querySelector('details');

      expect((details as HTMLDetailsElement | null)?.open).toBe(false);
    });
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

  describe('the cast', () => {
    it('lists the Story’s Characters', () => {
      characterService.getCharacters.mockReturnValue(
        of([
          {
            id: 'character-1',
            slug: 'captain-shran',
            name: 'Captain Shran',
            shortBio: 'An Andorian officer.',
            portraitImageThumbnailUrl: null,
            portraitImageAlt: null,
          },
        ] as Character[]),
      );

      const element = render();

      expect(element.textContent).toContain('Captain Shran');
      expect(element.textContent).toContain('An Andorian officer.');
    });

    it('links each Character to their page', () => {
      characterService.getCharacters.mockReturnValue(
        of([
          { id: 'character-1', slug: 'captain-shran', name: 'Shran' },
        ] as Character[]),
      );

      const element = render();

      expect(
        element
          .querySelector(
            '.storytime-panel-card--character .storytime-panel-card__heading',
          )
          ?.getAttribute('href'),
      ).toContain('captain-shran');
    });

    // Not every Story has a cast, and an empty heading over nothing is worse
    // than no section at all.
    it('shows no cast section when there are no Characters', () => {
      const element = render();

      expect(element.querySelector('.storytime-cast')).toBeNull();
      expect(element.textContent).not.toContain('Cast');
    });

    it('leaves the Story readable when the cast cannot be loaded', () => {
      characterService.getCharacters.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = render();

      expect(element.textContent).toContain('A Story');
      expect(fixture.componentInstance.characters).toEqual([]);
    });
  });

  describe('the credits', () => {
    it('lists them as they should read', () => {
      crewService.getCredits.mockReturnValue(
        of([
          {
            id: 'credit-1',
            displayLabel: 'Narrator',
            notes: 'Chapters 1–4',
          },
        ] as CrewCredit[]),
      );

      const element = render();

      expect(element.textContent).toContain('Narrator');
      expect(element.textContent).toContain('Chapters 1–4');
    });

    // A credit with nothing said about it used to render as a heading bar and
    // nothing else, which read as unfinished beside its neighbours.
    it('falls back to what the role means when there are no notes', () => {
      crewService.getCredits.mockReturnValue(
        of([
          {
            id: 'credit-1',
            displayLabel: 'Composer',
            notes: null,
            role: {
              id: 'role-1',
              code: 'COMPOSER',
              name: 'Composer',
              description: 'Composed music.',
              displayOrder: 1,
            },
          },
        ] as CrewCredit[]),
      );

      const element = render();

      expect(
        element.querySelector('.storytime-credits__notes')?.textContent,
      ).toContain('Composed music.');
    });

    // What the creator wrote about this credit beats what the role means in
    // general, which is only there because they wrote nothing.
    it('prefers the creator’s own notes to the role’s description', () => {
      crewService.getCredits.mockReturnValue(
        of([
          {
            id: 'credit-1',
            displayLabel: 'Composer',
            notes: 'Wrote the theme in an afternoon.',
            role: {
              id: 'role-1',
              code: 'COMPOSER',
              name: 'Composer',
              description: 'Composed music.',
              displayOrder: 1,
            },
          },
        ] as CrewCredit[]),
      );

      const element = render();
      const shown = element.querySelector('.storytime-credits__notes');

      expect(shown?.textContent).toContain('Wrote the theme in an afternoon.');
      expect(shown?.textContent).not.toContain('Composed music.');
    });

    // Nothing to say and no role to explain: the bar stands on its own rather
    // than opening an empty box under it.
    it('says nothing at all when there is nothing to say', () => {
      crewService.getCredits.mockReturnValue(
        of([
          {
            id: 'credit-1',
            displayLabel: 'Contributor',
            notes: null,
            role: null,
          },
        ] as CrewCredit[]),
      );

      const element = render();

      expect(element.querySelector('.storytime-credits__notes')).toBeNull();
      expect(element.querySelector('.storytime-credits')).not.toBeNull();
    });

    // They are behind a tab, which only exists when there is something to
    // thank somebody for.
    it('offers them as a tab of their own', () => {
      crewService.getCredits.mockReturnValue(
        of([{ id: 'credit-1', displayLabel: 'Narrator' }] as CrewCredit[]),
      );

      const element = render();
      const tabs = [...element.querySelectorAll('.lcars-tabs .lcars-tab')].map(
        tab => tab.textContent?.trim(),
      );

      expect(tabs).toContain('Credits');
      expect(
        element
          .querySelector('[role="tabpanel"][aria-label="Credits"]')
          ?.hasAttribute('hidden'),
      ).toBe(true);
    });

    it('shows them once their tab is chosen', () => {
      crewService.getCredits.mockReturnValue(
        of([{ id: 'credit-1', displayLabel: 'Narrator' }] as CrewCredit[]),
      );

      const element = render();
      const credits = [
        ...element.querySelectorAll<HTMLButtonElement>(
          '.lcars-tabs .lcars-tab',
        ),
      ].find(tab => tab.textContent?.trim() === 'Credits');

      credits?.click();
      fixture.detectChanges();

      expect(
        element
          .querySelector('[role="tabpanel"][aria-label="Credits"]')
          ?.hasAttribute('hidden'),
      ).toBe(false);
      expect(element.querySelector('.storytime-credits')).not.toBeNull();
    });

    // Most Stories are written by one person and have no credits roll at all.
    it('offers no credits tab when there are none', () => {
      const element = render();
      const tabs = [...element.querySelectorAll('.lcars-tabs .lcars-tab')].map(
        tab => tab.textContent?.trim(),
      );

      expect(element.querySelector('.storytime-credits')).toBeNull();
      expect(tabs).not.toContain('Credits');
    });

    it('leaves the Story readable when the credits cannot be loaded', () => {
      crewService.getCredits.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = render();

      expect(element.textContent).toContain('A Story');
      expect(fixture.componentInstance.credits).toEqual([]);
    });
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

  describe('reporting the Story', () => {
    it('offers the action to a signed-in reader', () => {
      const element = render();

      expect(element.textContent).toContain('Report this Story');
    });

    // An anonymous report cannot be followed up or answered.
    it('offers nothing to a signed-out reader', () => {
      authService.isLoggedIn.mockReturnValue(false);

      const element = render();

      expect(element.textContent).not.toContain('Report this Story');
    });

    it('sends what the reader chose in the dialog', () => {
      dialog.open.mockReturnValue({
        afterClosed: () =>
          of({
            reasonCode: StorytimeReportReason.PLAGIARISM,
            description: 'Copied from elsewhere.',
          }),
      });

      render();
      fixture.componentInstance.report();

      expect(moderationService.report).toHaveBeenCalledWith({
        targetType: StorytimeTargetType.STORY,
        targetId: 'story-1',
        reasonCode: StorytimeReportReason.PLAGIARISM,
        description: 'Copied from elsewhere.',
      });
    });

    // A reporter is told their report arrived, and nothing else: what an
    // administrator decides about somebody else's Story is not theirs to read.
    it('says only that the report arrived', () => {
      dialog.open.mockReturnValue({
        afterClosed: () => of({ reasonCode: StorytimeReportReason.HARASSMENT }),
      });

      render();
      fixture.componentInstance.report();

      expect(fixture.componentInstance.reportMessage).toContain('Thank you');
    });

    it('sends nothing when the reader closes the dialog', () => {
      render();
      fixture.componentInstance.report();

      expect(moderationService.report).not.toHaveBeenCalled();
    });

    it('explains a report the server refused', () => {
      dialog.open.mockReturnValue({
        afterClosed: () => of({ reasonCode: StorytimeReportReason.HARASSMENT }),
      });
      moderationService.report.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'You have already reported this.' },
            }),
        ),
      );

      render();
      fixture.componentInstance.report();

      expect(fixture.componentInstance.reportMessage).toContain(
        'already reported',
      );
    });

    it('falls back to a generic message when the server gives none', () => {
      dialog.open.mockReturnValue({
        afterClosed: () => of({ reasonCode: StorytimeReportReason.HARASSMENT }),
      });
      moderationService.report.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();
      fixture.componentInstance.report();

      expect(fixture.componentInstance.reportMessage).toContain(
        'could not be sent',
      );
    });

    // The Story is loaded before anything can be reported about it.
    it('does nothing when there is no Story', () => {
      storyService.getStory.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      );

      render();
      fixture.componentInstance.report();

      expect(dialog.open).not.toHaveBeenCalled();
    });
  });
});
