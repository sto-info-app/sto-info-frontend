import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { CommentService } from '../../comment.service';
import { FollowService } from '../../follow.service';
import { ReactionService } from '../../reaction.service';
import { ReadingListService } from '../../reading-list.service';
import {
  Arc,
  ArcMembership,
  ArcMembershipStatus,
  ArcProgress,
  ArcWithStories,
} from 'src/app/models/storytime.models';
import { ArcService } from '../../arc.service';
import { ArcDetailComponent } from './arc-detail.component';

describe('ArcDetailComponent', () => {
  let fixture: ComponentFixture<ArcDetailComponent>;
  let arcService: { getArc: jest.Mock; getArcProgress: jest.Mock };
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
  let params: BehaviorSubject<Map<string, string>>;

  /**
   * Builds a reader's progress through the Arc.
   *
   * @param overrides - Fields to change.
   * @returns The progress.
   */
  const buildProgress = (
    overrides: Partial<ArcProgress> = {},
  ): ArcProgress => ({
    arcId: 'arc-1',
    totalStories: 2,
    completedStories: 1,
    percentComplete: 50,
    continueStoryId: 'story-2',
    continueChapterId: null,
    ...overrides,
  });

  /**
   * Builds an Arc.
   *
   * @param overrides - Fields to change.
   * @returns The Arc.
   */
  const buildArc = (overrides: Partial<Arc> = {}): Arc =>
    ({
      id: 'arc-1',
      slug: 'the-long-war',
      title: 'The Long War',
      ownerUserId: 'curator-1',
      shortDescription: 'A summary',
      descriptionHtml: '<p id="b1">A curated order.</p>',
      languageCode: 'en',
      bannerImageUrl: null,
      bannerImageAlt: null,
      profileImageUrl: null,
      profileImageAlt: null,
      rating: 0,
      publishedAt: null,
      ...overrides,
    }) as Arc;

  /**
   * Builds a membership with its Story.
   *
   * @param overrides - Fields to change.
   * @returns The membership.
   */
  const buildMembership = (
    overrides: Partial<ArcMembership> = {},
  ): ArcMembership =>
    ({
      id: 'membership-1',
      arcId: 'arc-1',
      storyId: 'story-1',
      orderIndex: 1000,
      membershipStatus: ArcMembershipStatus.APPROVED,
      introductoryNote: null,
      story: {
        slug: 'a-story',
        title: 'A Story',
        shortDescription: 'Where it begins.',
      },
      ...overrides,
    }) as ArcMembership;

  /**
   * Builds the response for the page.
   *
   * @param overrides - Fields to change.
   * @returns The response.
   */
  const buildResponse = (
    overrides: Partial<ArcWithStories> = {},
  ): ArcWithStories => ({
    arc: buildArc(),
    stories: [buildMembership()],
    ...overrides,
  });

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ArcDetailComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    params = new BehaviorSubject(new Map([['arcSlug', 'the-long-war']]));
    arcService = {
      getArc: jest.fn().mockReturnValue(of(buildResponse())),
      getArcProgress: jest.fn().mockReturnValue(of(buildProgress())),
    };
    // The page carries the social controls, which read their own services.
    // Stubbing them keeps this spec about the Arc rather than about what
    // readers do with it.
    authService = {
      isLoggedIn: jest.fn().mockReturnValue(false),
      isLoggedInAsAdmin: jest.fn().mockReturnValue(false),
      getUserId: jest.fn().mockReturnValue('reader-1'),
      getHttpOptionsWithAccessToken: jest.fn().mockReturnValue(null),
    };
    reactionService = {
      getSummary: jest.fn().mockReturnValue(
        of({
          targetId: 'arc-1',
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

    TestBed.configureTestingModule({
      imports: [ArcDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ArcService, useValue: arcService },
        { provide: AuthService, useValue: authService },
        { provide: ReactionService, useValue: reactionService },
        { provide: CommentService, useValue: commentService },
        { provide: FollowService, useValue: followService },
        { provide: ReadingListService, useValue: readingListService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: new Map() } },
        },
      ],
    });
  });

  it('shows the Arc', () => {
    const element = render();

    expect(element.textContent).toContain('The Long War');
    expect(element.textContent).toContain('A summary');
  });

  it('renders the server-rendered description', () => {
    const element = render();

    expect(
      element.querySelector('.storytime-arc__description')?.innerHTML,
    ).toContain('A curated order.');
  });

  // The lang attribute lets a screen reader pronounce the Arc correctly.
  it('carries the Arc language on the article', () => {
    const element = render();

    expect(element.querySelector('article')?.getAttribute('lang')).toBe('en');
  });

  it('lists the reading order', () => {
    const element = render();
    const link = element.querySelector('.storytime-arc__stories a');

    expect(link?.textContent).toContain('A Story');
    expect(link?.getAttribute('href')).toContain('a-story');
  });

  // The curator's note about a Story's place is more use than the Story's own
  // summary, which the reader will see when they get there.
  it('prefers the curator’s note to the Story’s summary', () => {
    arcService.getArc.mockReturnValue(
      of(
        buildResponse({
          stories: [buildMembership({ introductoryNote: 'Start here.' })],
        }),
      ),
    );

    const element = render();

    expect(element.textContent).toContain('Start here.');
    expect(element.textContent).not.toContain('Where it begins.');
  });

  it('falls back to the Story’s summary when there is no note', () => {
    const element = render();

    expect(element.textContent).toContain('Where it begins.');
  });

  // A curator may assemble an Arc before its Stories are out, so an empty
  // reading order is a real state rather than a mistake.
  it('explains an Arc whose Stories are not published yet', () => {
    arcService.getArc.mockReturnValue(of(buildResponse({ stories: [] })));

    const element = render();

    expect(element.textContent).toContain(
      'None of the Stories in this Arc are published yet',
    );
  });

  it('reloads when the route moves to another Arc', () => {
    render();

    params.next(new Map([['arcSlug', 'another-arc']]));

    expect(arcService.getArc).toHaveBeenLastCalledWith('another-arc');
  });

  it('asks for an empty slug when the route carries none', () => {
    params.next(new Map());

    render();

    expect(arcService.getArc).toHaveBeenCalledWith('');
  });

  it('explains a missing Arc', () => {
    arcService.getArc.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be found',
    );
  });

  it('reports another failure differently', () => {
    arcService.getArc.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be read',
    );
  });

  it('shows nothing where an Arc has no description', () => {
    arcService.getArc.mockReturnValue(
      of(buildResponse({ arc: buildArc({ descriptionHtml: null }) })),
    );

    const element = render();

    expect(element.querySelector('.storytime-arc__description')).toBeNull();
  });

  // Artwork is optional throughout Storytime.
  it('renders no banner when the Arc has none', () => {
    const element = render();

    expect(element.querySelector('.storytime-arc__banner')).toBeNull();
  });

  it('renders the banner with its alternative text when present', () => {
    arcService.getArc.mockReturnValue(
      of(
        buildResponse({
          arc: buildArc({
            bannerImageUrl: 'https://cdn.test/banner',
            bannerImageAlt: 'A fleet',
          }),
        }),
      ),
    );

    const element = render();

    expect(
      element.querySelector('.storytime-arc__banner')?.getAttribute('alt'),
    ).toBe('A fleet');
  });

  describe('progress through the Arc', () => {
    /**
     * Builds a response with two Stories, so progress has somewhere to point.
     *
     * @returns The response.
     */
    const buildTwoStoryResponse = (): ArcWithStories =>
      buildResponse({
        stories: [
          buildMembership(),
          buildMembership({
            id: 'membership-2',
            storyId: 'story-2',
            story: { slug: 'a-sequel', title: 'A Sequel' } as never,
          }),
        ],
      });

    beforeEach(() => {
      authService.isLoggedIn.mockReturnValue(true);
      arcService.getArc.mockReturnValue(of(buildTwoStoryResponse()));
    });

    it('tells the reader how far they have got', () => {
      const element = render();

      expect(element.textContent).toContain('read 1 of 2 Stories');
      expect(arcService.getArcProgress).toHaveBeenCalledWith('the-long-war');
    });

    it('offers to continue from where they left off', () => {
      const element = render();
      const link = element.querySelector('.storytime-arc__continue');

      expect(link?.textContent).toContain('A Sequel');
      expect(link?.getAttribute('href')).toContain('a-sequel');
    });

    // Everything before where they are up to has been read, and marking it
    // says at a glance what is left.
    it('marks the Stories already behind them', () => {
      const element = render();
      const read = element.querySelectorAll('.storytime-arc__story--read');

      expect(read).toHaveLength(1);
      expect(read[0].textContent).toContain('A Story');
    });

    // Nothing is behind a reader who has not started.
    it('marks nothing as read for a reader who has not started', () => {
      arcService.getArcProgress.mockReturnValue(
        of(
          buildProgress({
            completedStories: 0,
            percentComplete: 0,
            continueStoryId: 'story-1',
          }),
        ),
      );

      const element = render();

      expect(
        element.querySelectorAll('.storytime-arc__story--read'),
      ).toHaveLength(0);
    });

    // Nothing left to continue to means the whole Arc is behind them.
    it('marks every Story as read once the Arc is finished', () => {
      arcService.getArcProgress.mockReturnValue(
        of(
          buildProgress({
            completedStories: 2,
            percentComplete: 100,
            continueStoryId: null,
          }),
        ),
      );

      const element = render();

      expect(
        element.querySelectorAll('.storytime-arc__story--read'),
      ).toHaveLength(2);
      expect(element.querySelector('.storytime-arc__continue')).toBeNull();
    });

    // A Story the reader cannot open is not on the page, so there is nothing
    // to link to.
    it('offers nothing to continue to when the Story is not shown', () => {
      arcService.getArcProgress.mockReturnValue(
        of(buildProgress({ continueStoryId: 'story-99' })),
      );

      const element = render();

      expect(element.querySelector('.storytime-arc__continue')).toBeNull();
    });

    it('shows how far through the Arc the reader is', () => {
      const element = render();
      const bar = element.querySelector('.storytime-arc__progress-bar');

      expect(bar?.getAttribute('value')).toBe('50');
    });

    // An Arc with nothing in it cannot be part-read.
    it('shows no progress for an empty Arc', () => {
      arcService.getArc.mockReturnValue(of(buildResponse({ stories: [] })));
      arcService.getArcProgress.mockReturnValue(
        of(
          buildProgress({
            totalStories: 0,
            completedStories: 0,
            percentComplete: 0,
            continueStoryId: null,
          }),
        ),
      );

      const element = render();

      expect(element.querySelector('.storytime-arc__progress')).toBeNull();
    });

    // Progress is bookkeeping: losing it must not cost the reader the Arc.
    it('still shows the Arc when progress cannot be read', () => {
      arcService.getArcProgress.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      const element = render();

      expect(element.textContent).toContain('The Long War');
      expect(fixture.componentInstance.progress).toBeNull();
      expect(fixture.componentInstance.errorMessage).toBe('');
    });
  });

  // There is nobody to have progress, so asking would only be a 401.
  it('asks for no progress when nobody is signed in', () => {
    render();

    expect(arcService.getArcProgress).not.toHaveBeenCalled();
    expect(fixture.componentInstance.hasProgress).toBe(false);
  });
});
