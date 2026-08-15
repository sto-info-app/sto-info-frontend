import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagedStory, StoryStatus } from 'src/app/models/storytime.models';
import { StoryService } from '../../story.service';
import { StoryDashboardComponent } from './story-dashboard.component';

describe('StoryDashboardComponent', () => {
  let fixture: ComponentFixture<StoryDashboardComponent>;
  let storyService: {
    getMyStories: jest.Mock;
    publishStory: jest.Mock;
    unpublishStory: jest.Mock;
  };

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
    };

    TestBed.configureTestingModule({
      imports: [StoryDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
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
});
