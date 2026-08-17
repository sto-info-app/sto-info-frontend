import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import {
  FeedEntry,
  StorytimeActivityType,
} from 'src/app/models/storytime.models';
import { FollowService } from '../../follow.service';
import { ActivityFeedComponent } from './activity-feed.component';

/**
 * Builds a feed entry.
 *
 * @param overrides - What differs from a published Story.
 * @returns The entry.
 */
const buildEntry = (overrides: Partial<FeedEntry> = {}): FeedEntry => ({
  id: 'item-1',
  activityType: StorytimeActivityType.STORY_PUBLISHED,
  actorUserId: 'writer-1',
  storyTitle: 'The Long Patrol',
  storySlug: 'the-long-patrol',
  chapterTitle: null,
  chapterSlug: null,
  arcTitle: null,
  arcSlug: null,
  occurredAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('ActivityFeedComponent', () => {
  let component: ActivityFeedComponent;
  let fixture: ComponentFixture<ActivityFeedComponent>;
  let followService: { getFeed: jest.Mock; markFeedRead: jest.Mock };

  /**
   * Creates the component and runs its first change detection.
   */
  const create = () => {
    fixture = TestBed.createComponent(ActivityFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    followService = {
      getFeed: jest.fn().mockReturnValue(of([buildEntry()])),
      markFeedRead: jest.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [ActivityFeedComponent, RouterTestingModule],
      providers: [{ provide: FollowService, useValue: followService }],
    }).compileComponents();
  });

  it('is created', () => {
    create();

    expect(component).toBeTruthy();
  });

  it('shows what has happened', () => {
    create();

    expect(followService.getFeed).toHaveBeenCalledWith(1);
    expect(fixture.nativeElement.textContent).toContain('The Long Patrol');
    expect(fixture.nativeElement.textContent).toContain(
      'published a new Story',
    );
  });

  // Looking at the feed is what having seen it means.
  it('marks the feed as read on arrival', () => {
    create();

    expect(followService.markFeedRead).toHaveBeenCalled();
  });

  // Failing to move the watermark is not worth an error message over a feed
  // the reader is already looking at.
  it('shows the feed even when the watermark cannot be moved', () => {
    followService.markFeedRead.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();

    expect(component.errorMessage).toBe('');
    expect(component.entries).toHaveLength(1);
  });

  it('says so when there is nothing to show', () => {
    followService.getFeed.mockReturnValue(of([]));

    create();

    expect(fixture.nativeElement.textContent).toContain('Nothing here yet');
  });

  it('reports what the server said when the feed fails', () => {
    followService.getFeed.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { message: 'Storytime is switched off.' },
          }),
      ),
    );

    create();

    expect(component.errorMessage).toBe('Storytime is switched off.');
    expect(component.isLoading).toBe(false);
  });

  it('falls back to its own wording when the server gives none', () => {
    followService.getFeed.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();

    expect(component.errorMessage).toBe('Your feed could not be loaded.');
  });

  describe('paging', () => {
    /**
     * Builds a full page of entries.
     *
     * @returns Thirty entries, which is what a full page holds.
     */
    const fullPage = () =>
      Array.from({ length: 30 }, (_unused, index) =>
        buildEntry({ id: `item-${index}` }),
      );

    it('offers more when a page comes back full', () => {
      followService.getFeed.mockReturnValue(of(fullPage()));

      create();

      expect(component.hasMore).toBe(true);
    });

    it('offers no more when a page comes back short', () => {
      create();

      expect(component.hasMore).toBe(false);
    });

    it('adds the next page to what is already shown', () => {
      followService.getFeed.mockReturnValue(of(fullPage()));

      create();
      followService.getFeed.mockReturnValue(of([buildEntry({ id: 'later' })]));
      component.loadMore();

      expect(followService.getFeed).toHaveBeenLastCalledWith(2);
      expect(component.entries).toHaveLength(31);
      expect(component.hasMore).toBe(false);
    });
  });

  describe('where an entry leads', () => {
    it.each([
      [
        'a Chapter',
        buildEntry({
          activityType: StorytimeActivityType.CHAPTER_PUBLISHED,
          chapterTitle: 'First Contact',
          chapterSlug: 'first-contact',
        }),
        [
          '/storytime',
          'stories',
          'the-long-patrol',
          'chapters',
          'first-contact',
        ],
        'First Contact',
      ],
      [
        'a Story',
        buildEntry(),
        ['/storytime', 'stories', 'the-long-patrol'],
        'The Long Patrol',
      ],
      [
        'an Arc',
        buildEntry({
          activityType: StorytimeActivityType.ARC_UPDATED,
          storyTitle: null,
          storySlug: null,
          arcTitle: 'The Dominion War',
          arcSlug: 'the-dominion-war',
        }),
        ['/storytime', 'arcs', 'the-dominion-war'],
        'The Dominion War',
      ],
    ])('leads to %s', (_name, entry, link, title) => {
      create();

      expect(component.linkFor(entry)).toEqual(link);
      expect(component.titleFor(entry)).toBe(title);
    });

    // A Chapter with no Story to sit in has nowhere sensible to lead, and the
    // server does not send one, but the fallback keeps the link valid.
    it('falls back to the Story when a Chapter has no Story address', () => {
      const entry = buildEntry({
        chapterTitle: 'First Contact',
        chapterSlug: 'first-contact',
        storySlug: null,
      });

      create();

      expect(component.linkFor(entry)).toEqual(['/storytime', 'arcs', '']);
    });
  });

  it.each([
    [StorytimeActivityType.STORY_PUBLISHED, 'published a new Story'],
    [StorytimeActivityType.CHAPTER_PUBLISHED, 'published a new Chapter'],
    [StorytimeActivityType.STORY_UPDATED, 'updated a Story'],
    [StorytimeActivityType.STORY_STATUS_CHANGED, 'changed a Story’s status'],
    [StorytimeActivityType.ARC_UPDATED, 'updated an Arc'],
    [StorytimeActivityType.ARC_STORY_ADDED, 'added a Story to an Arc'],
    [StorytimeActivityType.ARC_STORY_REMOVED, 'removed a Story from an Arc'],
    [StorytimeActivityType.SPOTLIGHT_SELECTED, 'was chosen for the Spotlight'],
  ])('words a %s', (activityType, wording) => {
    create();

    expect(component.wordingFor(buildEntry({ activityType }))).toBe(wording);
  });

  it('reads more when the button is pressed', () => {
    followService.getFeed.mockReturnValue(
      of(
        Array.from({ length: 30 }, (_unused, index) =>
          buildEntry({ id: `item-${index}` }),
        ),
      ),
    );

    create();
    fixture.nativeElement.querySelector('.storytime-feed__more').click();

    expect(followService.getFeed).toHaveBeenLastCalledWith(2);
  });
});
