import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  LibraryEntry,
  ReaderStoryStatus,
  Story,
  StoryProgress,
} from 'src/app/models/storytime.models';
import { ProgressService } from '../../progress.service';
import { ReaderLibraryComponent } from './reader-library.component';

describe('ReaderLibraryComponent', () => {
  let fixture: ComponentFixture<ReaderLibraryComponent>;
  let progressService: { getLibrary: jest.Mock };

  /**
   * Builds a library entry.
   *
   * @param progress - Progress fields to change.
   * @param story - The Story, or null when it is no longer readable.
   * @returns The entry.
   */
  const buildEntry = (
    progress: Partial<StoryProgress> = {},
    story: Partial<Story> | null = { slug: 'a-story', title: 'A Story' },
  ): LibraryEntry =>
    ({
      progress: {
        storyId: 'story-1',
        status: ReaderStoryStatus.IN_PROGRESS,
        totalChapters: 4,
        readChapters: 2,
        percentComplete: 50,
        newChapterCount: 0,
        continueChapterId: 'chapter-3',
        ...progress,
      },
      story,
    }) as LibraryEntry;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ReaderLibraryComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    progressService = {
      getLibrary: jest.fn().mockReturnValue(of([buildEntry()])),
    };

    TestBed.configureTestingModule({
      imports: [ReaderLibraryComponent],
      providers: [
        provideRouter([]),
        { provide: ProgressService, useValue: progressService },
      ],
    });
  });

  it('lists the Stories the reader has started', () => {
    const element = render();

    expect(element.textContent).toContain('A Story');
    expect(element.textContent).toContain('2 of 4 Chapters read');
  });

  it('links each Story to its page', () => {
    const element = render();

    expect(
      element
        .querySelector('.storytime-panel-card__heading')
        ?.getAttribute('href'),
    ).toContain('a-story');
  });

  it('explains an empty library', () => {
    progressService.getLibrary.mockReturnValue(of([]));

    const element = render();

    expect(element.textContent).toContain('have not started any Stories');
  });

  // A Story made private or removed since the reader started it still belongs
  // in their own history, so the row stays rather than quietly disappearing.
  it('keeps a Story that is no longer available', () => {
    progressService.getLibrary.mockReturnValue(of([buildEntry({}, null)]));

    const element = render();

    expect(element.textContent).toContain('no longer available');
    expect(element.querySelector('a.storytime-panel-card__heading')).toBeNull();
  });

  it('says when there is new content since the reader last read', () => {
    progressService.getLibrary.mockReturnValue(
      of([buildEntry({ newChapterCount: 2 })]),
    );

    const element = render();

    expect(element.textContent).toContain('2 new Chapters since');
  });

  it('counts a single new Chapter', () => {
    progressService.getLibrary.mockReturnValue(
      of([buildEntry({ newChapterCount: 1 })]),
    );

    const element = render();

    expect(element.textContent).toContain('1 new Chapter since');
  });

  describe('filtering', () => {
    it('shows everything by default', () => {
      render();

      expect(progressService.getLibrary).toHaveBeenCalledWith(undefined);
    });

    it('narrows to a chosen status', () => {
      render();

      fixture.componentInstance.filterBy(ReaderStoryStatus.ON_HOLD);

      expect(progressService.getLibrary).toHaveBeenLastCalledWith(
        ReaderStoryStatus.ON_HOLD,
      );
    });

    it('goes back to everything', () => {
      render();

      fixture.componentInstance.filterBy(ReaderStoryStatus.ON_HOLD);
      fixture.componentInstance.filterBy(null);

      expect(progressService.getLibrary).toHaveBeenLastCalledWith(undefined);
      expect(fixture.componentInstance.activeStatus).toBeNull();
    });

    it('offers every status as a filter', () => {
      const element = render();
      const buttons = Array.from(
        element.querySelectorAll('.storytime-library__filters button'),
      ).map(button => button.textContent?.trim());

      expect(buttons).toContain('Everything');
      expect(buttons).toContain('On hold');
      expect(buttons).toContain('Completed');
    });
  });

  it('explains a library that could not be loaded', () => {
    progressService.getLibrary.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    const element = render();

    expect(element.textContent).toContain('could not be loaded');
  });

  // A failed reload must not leave the page spinning for ever.
  it('stops loading after a failure', () => {
    progressService.getLibrary.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.isLoading).toBe(false);
  });
});
