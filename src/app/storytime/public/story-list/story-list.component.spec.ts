import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Story } from 'src/app/models/storytime.models';
import { StoryService } from '../../story.service';
import { StoryListComponent } from './story-list.component';

describe('StoryListComponent', () => {
  let fixture: ComponentFixture<StoryListComponent>;
  let storyService: { getStories: jest.Mock };

  const story = {
    id: 'story-1',
    slug: 'a-story',
    title: 'A Story',
    shortDescription: null,
    contentRating: 'GENERAL',
    completionState: 'ONGOING',
    publishedChapterCount: 1,
    profileImageThumbnailUrl: null,
    tags: [],
  } as unknown as Story;

  /**
   * Builds the component with the current service stub.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(StoryListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    storyService = {
      getStories: jest
        .fn()
        .mockReturnValue(
          of({ items: [story], total: 1, page: 1, pageSize: 12 }),
        ),
    };

    TestBed.configureTestingModule({
      imports: [StoryListComponent],
      providers: [
        provideRouter([]),
        { provide: StoryService, useValue: storyService },
      ],
    });
  });

  it('is created', () => {
    render();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('lists the Stories it loaded', () => {
    const element = render();

    expect(element.textContent).toContain('A Story');
    expect(fixture.componentInstance.isLoading).toBe(false);
  });

  it('shows an empty message when there are no Stories', () => {
    storyService.getStories.mockReturnValue(
      of({ items: [], total: 0, page: 1, pageSize: 12 }),
    );

    const element = render();

    expect(element.textContent).toContain('no published Stories yet');
  });

  it('reports a failure without leaving the page loading', () => {
    storyService.getStories.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be read',
    );
    expect(fixture.componentInstance.isLoading).toBe(false);
  });

  // A connection failure is worth distinguishing, because the reader can act
  // on it.
  it('distinguishes an unreachable server', () => {
    storyService.getStories.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'Could not reach the archive',
    );
  });
});
