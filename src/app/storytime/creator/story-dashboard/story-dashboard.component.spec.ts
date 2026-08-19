import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChapterService } from '../../chapter.service';
import { CharacterService } from '../../character.service';
import { CrewService } from '../../crew.service';
import {
  ManagedStory,
  StorytimeModerationStatus,
  StorytimeTargetType,
  StoryStatus,
} from 'src/app/models/storytime.models';
import {
  PUBLISHING_REPRESENTATIONS,
  STORYTIME_COPY,
  STORYTIME_POLICY_VERSION,
} from '../../storytime.constants';
import { StorytimeModerationService } from '../../storytime-moderation.service';
import { StoryService } from '../../story.service';
import { StoryDashboardComponent } from './story-dashboard.component';

describe('StoryDashboardComponent', () => {
  let fixture: ComponentFixture<StoryDashboardComponent>;
  let storyService: {
    getMyStories: jest.Mock;
    publishStory: jest.Mock;
    unpublishStory: jest.Mock;
    acceptContentPolicy: jest.Mock;
  };
  let moderationService: { appeal: jest.Mock };
  let chapterService: { getMyChapters: jest.Mock };
  let characterService: { getMyCharacters: jest.Mock };
  let crewService: { getCollaborators: jest.Mock };

  /**
   * Builds a managed Story.
   *
   * @param overrides - Fields to change.
   * @returns The Story.
   */
  const buildStory = (overrides: Partial<ManagedStory> = {}): ManagedStory =>
    ({
      id: 'story-1',
      title: 'A Story',
      status: StoryStatus.DRAFT,
      visibility: 'PRIVATE',
      moderationStatus: 'ACTIVE',
      moderationMessage: null,
      publishedChapterCount: 1,
      contentPolicyAcceptedAt: '2026-06-01T00:00:00Z',
      contentPolicyVersion: STORYTIME_POLICY_VERSION,
      contentPolicyCurrent: true,
      ...overrides,
    }) as ManagedStory;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(StoryDashboardComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    storyService = {
      getMyStories: jest.fn().mockReturnValue(of([buildStory()])),
      publishStory: jest.fn().mockReturnValue(of(buildStory())),
      unpublishStory: jest.fn().mockReturnValue(of(buildStory())),
      acceptContentPolicy: jest.fn().mockReturnValue(of(buildStory())),
    };
    moderationService = {
      appeal: jest.fn().mockReturnValue(of({ id: 'appeal-1' })),
    };
    chapterService = {
      getMyChapters: jest
        .fn()
        .mockReturnValue(of([{ id: 'c1' }, { id: 'c2' }])),
    };
    characterService = {
      getMyCharacters: jest.fn().mockReturnValue(of([{ id: 'ch1' }])),
    };
    crewService = {
      getCollaborators: jest.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      imports: [StoryDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
        { provide: StorytimeModerationService, useValue: moderationService },
        { provide: ChapterService, useValue: chapterService },
        { provide: CharacterService, useValue: characterService },
        { provide: CrewService, useValue: crewService },
      ],
    });
  });

  it('lists the caller Stories', () => {
    const element = render();

    expect(element.textContent).toContain('A Story');
  });

  it('describes status and visibility in words', () => {
    const element = render();

    expect(element.textContent).toContain('Draft');
    expect(element.textContent).toContain('Private');
  });

  describe('what each Story holds', () => {
    // The Story payload counts published Chapters, which is not the number the
    // creator is about to open.
    it('counts what is behind each button', () => {
      const element = render();

      expect(fixture.componentInstance.countsFor(buildStory())).toEqual({
        chapters: 2,
        cast: 1,
        collaborators: 0,
      });
      expect(
        element.querySelector('.header-count-badge')?.textContent,
      ).toContain('2');
    });

    // A count is a number on a button. Failing to fetch one is no reason to
    // tell somebody their Stories are broken, and the counts that did arrive
    // are still worth showing.
    it.each([
      ['Chapters', () => chapterService.getMyChapters, 'chapters'],
      ['the cast', () => characterService.getMyCharacters, 'cast'],
      ['collaborators', () => crewService.getCollaborators, 'collaborators'],
    ] as const)(
      'says nothing when %s cannot be counted',
      (_what, mock, key) => {
        mock().mockReturnValue(
          throwError(() => new HttpErrorResponse({ status: 500 })),
        );

        render();

        expect(fixture.componentInstance.countsFor(buildStory())[key]).toBe(0);
        expect(fixture.componentInstance.errorMessage).toBe('');
      },
    );

    it('counts a Story it has not heard about as empty', () => {
      render();

      expect(
        fixture.componentInstance.countsFor(buildStory({ id: 'other' })),
      ).toEqual({ chapters: 0, cast: 0, collaborators: 0 });
    });
  });

  it('invites a first Story when there are none', () => {
    storyService.getMyStories.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('not written a Story yet');
  });

  it('offers publishing for a draft', () => {
    render();

    expect(fixture.componentInstance.canPublish(buildStory())).toBe(true);
  });

  it('offers unpublishing for a published Story', () => {
    render();

    expect(
      fixture.componentInstance.canPublish(
        buildStory({ status: StoryStatus.PUBLISHED }),
      ),
    ).toBe(false);
  });

  it('publishes a Story and reloads', () => {
    render();
    fixture.componentInstance.publish(buildStory());

    expect(storyService.publishStory).toHaveBeenCalledWith('story-1');
    expect(storyService.getMyStories).toHaveBeenCalledTimes(2);
  });

  it('unpublishes a Story', () => {
    render();
    fixture.componentInstance.unpublish(buildStory());

    expect(storyService.unpublishStory).toHaveBeenCalledWith('story-1');
  });

  // A refused publish explains exactly what the Story is still missing, which
  // is far more use than a generic failure.
  it('shows the reason the server gave for a refused action', () => {
    storyService.publishStory.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'at least one published Chapter is required' },
          }),
      ),
    );

    render();
    fixture.componentInstance.publish(buildStory());

    expect(fixture.componentInstance.errorMessage).toContain(
      'published Chapter',
    );
  });

  it('falls back to a generic message when the server gives none', () => {
    storyService.publishStory.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();
    fixture.componentInstance.publish(buildStory());

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be completed',
    );
  });

  it('reports a failure to load', () => {
    storyService.getMyStories.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be loaded',
    );
  });

  // The creator has to be told their Story was removed, and why.
  it('shows the moderation notice on a removed Story', () => {
    storyService.getMyStories.mockReturnValue(
      of([
        buildStory({
          moderationStatus: 'REMOVED' as never,
          moderationMessage: 'Breached the content policy',
        }),
      ]),
    );

    const element = render();

    expect(element.textContent).toContain('removed by an administrator');
    expect(element.textContent).toContain('Breached the content policy');
  });

  describe('the publishing terms', () => {
    // Publishing is the moment a creator says their work meets the rules
    // everybody else's is held to, and the server refuses until they have.
    it('asks for confirmation before a Story can be published', () => {
      storyService.getMyStories.mockReturnValue(
        of([
          buildStory({
            contentPolicyAcceptedAt: null,
            contentPolicyVersion: null,
            contentPolicyCurrent: false,
          }),
        ]),
      );

      const element = render();

      expect(element.textContent).toContain(
        STORYTIME_COPY.POLICY_ACCEPTANCE_PROMPT,
      );
    });

    // The promises are made here, so they have to be readable here rather
    // than only on the document being agreed to.
    it.each(PUBLISHING_REPRESENTATIONS)('sets out that %s', representation => {
      storyService.getMyStories.mockReturnValue(
        of([
          buildStory({
            contentPolicyAcceptedAt: null,
            contentPolicyVersion: null,
            contentPolicyCurrent: false,
          }),
        ]),
      );

      expect(render().textContent).toContain(representation);
    });

    it('says nothing once it has been confirmed', () => {
      storyService.getMyStories.mockReturnValue(
        of([buildStory({ contentPolicyAcceptedAt: '2026-06-01T00:00:00Z' })]),
      );

      const element = render();

      expect(element.textContent).not.toContain(
        STORYTIME_COPY.POLICY_ACCEPTANCE_PROMPT,
      );
    });

    // Being told to do something a second time is confusing unless you are
    // told why, so the wording changes rather than simply reappearing.
    it('explains itself when the terms have been superseded', () => {
      storyService.getMyStories.mockReturnValue(
        of([
          buildStory({
            contentPolicyAcceptedAt: '2026-06-01T00:00:00Z',
            contentPolicyVersion: '0',
            contentPolicyCurrent: false,
          }),
        ]),
      );

      const text = render().textContent ?? '';

      expect(text).toContain(STORYTIME_COPY.POLICY_REACCEPTANCE_PROMPT);
      expect(text).not.toContain(STORYTIME_COPY.POLICY_ACCEPTANCE_PROMPT);
    });

    it('records the confirmation and reloads', () => {
      render();
      fixture.componentInstance.acceptContentPolicy(buildStory());

      expect(storyService.acceptContentPolicy).toHaveBeenCalledWith('story-1');
      expect(storyService.getMyStories).toHaveBeenCalledTimes(2);
    });
  });

  describe('appealing a removal', () => {
    /**
     * Builds a removed Story.
     *
     * @returns The Story, as an administrator left it.
     */
    const buildRemoved = (): ManagedStory =>
      buildStory({
        moderationStatus: StorytimeModerationStatus.REMOVED,
        moderationMessage: 'This breaches the harassment policy.',
      });

    beforeEach(() => {
      storyService.getMyStories.mockReturnValue(of([buildRemoved()]));
    });

    // Somebody who cannot see what was said cannot answer it.
    it('shows the administrator’s words to the creator', () => {
      const element = render();

      expect(element.textContent).toContain('harassment policy');
      expect(element.textContent).toContain('Appeal this removal');
    });

    it('opens the appeal box', () => {
      const element = render();

      element
        .querySelector<HTMLButtonElement>('.storytime-dashboard__appeal-open')
        ?.click();
      fixture.detectChanges();

      expect(
        element.querySelector('.storytime-dashboard__appeal'),
      ).not.toBeNull();
    });

    it('sends the appeal', () => {
      render();
      fixture.componentInstance.startAppeal(buildRemoved());
      fixture.componentInstance.appealForm.patchValue({
        body: '  The passage quoted is my own writing.  ',
      });
      fixture.componentInstance.sendAppeal();

      expect(moderationService.appeal).toHaveBeenCalledWith({
        targetType: StorytimeTargetType.STORY,
        targetId: 'story-1',
        body: 'The passage quoted is my own writing.',
      });
      expect(fixture.componentInstance.appealingStoryId).toBeNull();
    });

    it('refuses to send an empty appeal', () => {
      render();
      fixture.componentInstance.startAppeal(buildRemoved());
      fixture.componentInstance.sendAppeal();

      expect(moderationService.appeal).not.toHaveBeenCalled();
      expect(fixture.componentInstance.appealMessage).toContain('Say why');
    });

    it('sends nothing when no Story is being appealed', () => {
      render();
      fixture.componentInstance.appealForm.patchValue({ body: 'Something.' });
      fixture.componentInstance.sendAppeal();

      expect(moderationService.appeal).not.toHaveBeenCalled();
    });

    it('explains an appeal the server refused', () => {
      moderationService.appeal.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'This has already been appealed.' },
            }),
        ),
      );

      render();
      fixture.componentInstance.startAppeal(buildRemoved());
      fixture.componentInstance.appealForm.patchValue({ body: 'Please.' });
      fixture.componentInstance.sendAppeal();

      expect(fixture.componentInstance.appealMessage).toContain(
        'already been appealed',
      );
    });

    it('falls back to a generic message when the server gives none', () => {
      moderationService.appeal.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      render();
      fixture.componentInstance.startAppeal(buildRemoved());
      fixture.componentInstance.appealForm.patchValue({ body: 'Please.' });
      fixture.componentInstance.sendAppeal();

      expect(fixture.componentInstance.appealMessage).toContain(
        'could not be sent',
      );
    });

    it('knows a Story that has not been removed', () => {
      render();

      expect(fixture.componentInstance.isRemoved(buildStory())).toBe(false);
    });
  });
});
