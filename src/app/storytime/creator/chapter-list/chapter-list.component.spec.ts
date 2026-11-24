import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChapterStatus, ManagedChapter } from 'src/app/models/storytime.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';
import { ChapterService } from '../../chapter.service';
import { ChapterListComponent } from './chapter-list.component';

describe('ChapterListComponent', () => {
  let fixture: ComponentFixture<ChapterListComponent>;
  let chapterService: {
    getMyChapters: jest.Mock;
    publishChapter: jest.Mock;
    unpublishChapter: jest.Mock;
    deleteChapter: jest.Mock;
    reorderChapters: jest.Mock;
  };
  let confirm: ConfirmPromptDouble;

  /**
   * Builds a managed Chapter.
   *
   * @param overrides - Fields to change.
   * @returns The Chapter.
   */
  const buildChapter = (
    overrides: Partial<ManagedChapter> = {},
  ): ManagedChapter =>
    ({
      id: 'chapter-1',
      title: 'Chapter One',
      status: ChapterStatus.DRAFT,
      moderationStatus: 'ACTIVE',
      moderationMessage: null,
      wordCount: 120,
      scheduledPublishAt: null,
      ...overrides,
    }) as ManagedChapter;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ChapterListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    chapterService = {
      getMyChapters: jest.fn().mockReturnValue(of([buildChapter()])),
      publishChapter: jest.fn().mockReturnValue(of(buildChapter())),
      unpublishChapter: jest.fn().mockReturnValue(of(buildChapter())),
      deleteChapter: jest.fn().mockReturnValue(of(undefined)),
      reorderChapters: jest.fn().mockReturnValue(of([])),
    };

    confirm = stubConfirmPrompt();

    TestBed.configureTestingModule({
      imports: [ChapterListComponent],
      providers: [
        provideRouter([]),
        confirm.provider,
        { provide: ChapterService, useValue: chapterService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map([['storyId', 'story-1']]) },
          },
        },
      ],
    });
  });

  it('lists the Chapters of the Story in the route', () => {
    const element = render();

    expect(element.textContent).toContain('Chapter One');
    expect(chapterService.getMyChapters).toHaveBeenCalledWith('story-1');
  });

  it('asks for an empty Story when the route carries none', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { paramMap: new Map() } },
    });

    render();

    expect(chapterService.getMyChapters).toHaveBeenCalledWith('');
  });

  it('describes the status in words', () => {
    expect(render().textContent).toContain('Draft');
  });

  // A Story cannot be published without one, so the empty state says so.
  it('explains why a Story needs a Chapter', () => {
    chapterService.getMyChapters.mockReturnValue(of([]));

    expect(render().textContent).toContain('at least one published Chapter');
  });

  it('offers publishing for a draft', () => {
    render();

    expect(fixture.componentInstance.canPublish(buildChapter())).toBe(true);
  });

  it('offers unpublishing for a published Chapter', () => {
    render();

    expect(
      fixture.componentInstance.canPublish(
        buildChapter({ status: ChapterStatus.PUBLISHED }),
      ),
    ).toBe(false);
  });

  it('publishes a Chapter and reloads', () => {
    render();
    fixture.componentInstance.publish(buildChapter());

    expect(chapterService.publishChapter).toHaveBeenCalledWith('chapter-1');
    expect(chapterService.getMyChapters).toHaveBeenCalledTimes(2);
  });

  it('unpublishes a Chapter', () => {
    render();
    fixture.componentInstance.unpublish(buildChapter());

    expect(chapterService.unpublishChapter).toHaveBeenCalledWith('chapter-1');
  });

  describe('deleting a Chapter', () => {
    it('deletes it and reloads', () => {
      render();
      fixture.componentInstance.remove(buildChapter());

      expect(chapterService.deleteChapter).toHaveBeenCalledWith('chapter-1');
      expect(chapterService.getMyChapters).toHaveBeenCalledTimes(2);
    });

    it('asks first, naming the Chapter', () => {
      render();
      fixture.componentInstance.remove(buildChapter());

      expect(confirm.lastAsked()?.title).toBe('Delete Chapter');
      expect(confirm.lastAsked()?.message).toContain('Chapter One');
    });

    it('leaves the Chapter alone when the creator says no', () => {
      confirm.answer(false);
      render();
      fixture.componentInstance.remove(buildChapter());

      expect(chapterService.deleteChapter).not.toHaveBeenCalled();
    });

    // A published Chapter is part of what readers are already following, so
    // the reversible step — unpublishing — comes first.
    it('is offered for a draft', () => {
      render();

      expect(fixture.componentInstance.canDelete(buildChapter())).toBe(true);
    });

    it('is not offered for a published Chapter', () => {
      render();

      expect(
        fixture.componentInstance.canDelete(
          buildChapter({ status: ChapterStatus.PUBLISHED }),
        ),
      ).toBe(false);
    });

    it('shows no delete control while the Chapter is published', () => {
      chapterService.getMyChapters.mockReturnValue(
        of([buildChapter({ status: ChapterStatus.PUBLISHED })]),
      );

      const element = render();

      expect(
        element.querySelector('[aria-label="Delete this Chapter"]'),
      ).toBeNull();
    });

    it('shows a delete control for a draft', () => {
      const element = render();

      expect(
        element.querySelector('[aria-label="Delete this Chapter"]'),
      ).not.toBeNull();
    });
  });

  describe('reordering', () => {
    const first = buildChapter({ id: 'chapter-1', title: 'Chapter One' });
    const second = buildChapter({ id: 'chapter-2', title: 'Chapter Two' });
    const third = buildChapter({ id: 'chapter-3', title: 'Chapter Three' });

    /**
     * Finds the named control on each card, in card order.
     *
     * @param element - The rendered page.
     * @param label - The control's accessible name.
     * @returns Whether each card has one.
     */
    const controlsOnEachCard = (
      element: HTMLElement,
      label: string,
    ): boolean[] =>
      Array.from(
        element.querySelectorAll('.storytime-chapter-list > li'),
        card => card.querySelector(`button[aria-label="${label}"]`) !== null,
      );

    /**
     * Clicks the named control on one card.
     *
     * @param element - The rendered page.
     * @param position - The card's position.
     * @param label - The control's accessible name.
     */
    const click = (
      element: HTMLElement,
      position: number,
      label: string,
    ): void => {
      const cards = element.querySelectorAll('.storytime-chapter-list > li');

      cards
        .item(position)
        .querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
        ?.click();
    };

    beforeEach(() => {
      chapterService.getMyChapters.mockReturnValue(of([first, second, third]));
    });

    it('offers Move up on every Chapter but the first', () => {
      expect(controlsOnEachCard(render(), 'Move up')).toEqual([
        false,
        true,
        true,
      ]);
    });

    it('offers Move down on every Chapter but the last', () => {
      expect(controlsOnEachCard(render(), 'Move down')).toEqual([
        true,
        true,
        false,
      ]);
    });

    it('names the controls for screen readers and pointers alike', () => {
      const button = render().querySelector<HTMLButtonElement>(
        'button[aria-label="Move up"]',
      );

      expect(button?.type).toBe('button');
      expect(button?.title).toBe('Move up');
    });

    it('moves a Chapter up, sending the whole new order', () => {
      const element = render();

      click(element, 1, 'Move up');

      expect(chapterService.reorderChapters).toHaveBeenCalledWith('story-1', [
        'chapter-2',
        'chapter-1',
        'chapter-3',
      ]);
    });

    it('moves a Chapter down, sending the whole new order', () => {
      const element = render();

      click(element, 1, 'Move down');

      expect(chapterService.reorderChapters).toHaveBeenCalledWith('story-1', [
        'chapter-1',
        'chapter-3',
        'chapter-2',
      ]);
    });

    // The server settles the order, so the list shows what it saved rather
    // than what the page guessed.
    it('reloads the list once the new order is saved', () => {
      const element = render();
      chapterService.getMyChapters.mockReturnValue(of([second, first, third]));

      click(element, 1, 'Move up');
      fixture.detectChanges();

      const titles = Array.from(
        element.querySelectorAll('.storytime-record__name'),
        title => title.textContent?.trim(),
      );
      expect(titles).toEqual(['Chapter Two', 'Chapter One', 'Chapter Three']);
    });

    it('sends nothing when asked to move past either end', () => {
      render();

      fixture.componentInstance.moveUp(0);
      fixture.componentInstance.moveDown(2);

      expect(chapterService.reorderChapters).not.toHaveBeenCalled();
    });

    it('shows the reason the server gave for a refused reorder', () => {
      chapterService.reorderChapters.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: { message: 'You may not manage these Chapters' },
            }),
        ),
      );
      const element = render();

      click(element, 1, 'Move up');

      expect(fixture.componentInstance.errorMessage).toContain(
        'may not manage these Chapters',
      );
    });
  });

  it('shows a pending schedule', () => {
    chapterService.getMyChapters.mockReturnValue(
      of([buildChapter({ scheduledPublishAt: '2030-01-01T09:00:00.000Z' })]),
    );

    expect(render().textContent).toContain('Scheduled for');
  });

  // A refused publish names exactly what the Chapter is missing.
  it('shows the reason the server gave for a refused action', () => {
    chapterService.publishChapter.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'it has no content' },
          }),
      ),
    );

    render();
    fixture.componentInstance.publish(buildChapter());

    expect(fixture.componentInstance.errorMessage).toContain('no content');
  });

  it('falls back to a generic message when the server gives none', () => {
    chapterService.publishChapter.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();
    fixture.componentInstance.publish(buildChapter());

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be completed',
    );
  });

  it('reports a failure to load', () => {
    chapterService.getMyChapters.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be loaded',
    );
  });

  it('shows the moderation notice on a removed Chapter', () => {
    chapterService.getMyChapters.mockReturnValue(
      of([
        buildChapter({
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
