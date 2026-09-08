import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import {
  ReadingListDetail,
  ReadingListItem,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { ReadingListService } from '../../reading-list.service';
import { ReadingListDetailComponent } from './reading-list-detail.component';

const LIST_ID = 'list-1';

/**
 * Builds an item.
 *
 * @param overrides - What differs from a listed Story.
 * @returns The item.
 */
const buildItem = (
  overrides: Partial<ReadingListItem> = {},
): ReadingListItem => ({
  id: 'item-1',
  targetType: StorytimeTargetType.STORY,
  targetId: 'story-1',
  title: 'The Long Patrol',
  slug: 'the-long-patrol',
  shortDescription: null,
  note: null,
  orderIndex: 0,
  ...overrides,
});

/**
 * Builds a list.
 *
 * @param overrides - What differs from a private list of one Story.
 * @returns The list.
 */
const buildList = (
  overrides: Partial<ReadingListDetail> = {},
): ReadingListDetail => ({
  id: LIST_ID,
  ownerUserId: 'reader-1',
  name: 'Klingon favourites',
  slug: 'klingon-favourites',
  description: null,
  isPublic: false,
  itemCount: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
  items: [buildItem()],
  ...overrides,
});

describe('ReadingListDetailComponent', () => {
  let component: ReadingListDetailComponent;
  let fixture: ComponentFixture<ReadingListDetailComponent>;
  let readingListService: {
    getList: jest.Mock;
    getPublicList: jest.Mock;
    updateList: jest.Mock;
    removeItem: jest.Mock;
    reorder: jest.Mock;
  };
  let params: Record<string, string>;

  /**
   * Creates the component and runs its first change detection.
   */
  const create = () => {
    fixture = TestBed.createComponent(ReadingListDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    params = { listId: LIST_ID };
    readingListService = {
      getList: jest.fn().mockReturnValue(of(buildList())),
      getPublicList: jest.fn().mockReturnValue(of(buildList())),
      updateList: jest
        .fn()
        .mockReturnValue(of({ ...buildList(), isPublic: true })),
      removeItem: jest.fn().mockReturnValue(of(buildList({ items: [] }))),
      reorder: jest.fn().mockReturnValue(of(buildList())),
    };

    await TestBed.configureTestingModule({
      imports: [ReadingListDetailComponent, RouterTestingModule],
      providers: [
        { provide: ReadingListService, useValue: readingListService },
        {
          provide: ActivatedRoute,
          // A getter rather than a value, so a test may name a different route
          // before the component is created.
          useValue: {
            snapshot: {
              get paramMap() {
                return convertToParamMap(params);
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('is created', () => {
    create();

    expect(component).toBeTruthy();
  });

  it('reads the reader’s own list from its identifier', () => {
    create();

    expect(readingListService.getList).toHaveBeenCalledWith(LIST_ID);
    expect(component.isMine).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Klingon favourites');
  });

  it('shows a description when the list has one', () => {
    readingListService.getList.mockReturnValue(
      of(buildList({ description: 'Things worth a second read.' })),
    );

    create();

    expect(fixture.nativeElement.textContent).toContain(
      'Things worth a second read.',
    );
  });

  it('shows an item’s summary and note', () => {
    readingListService.getList.mockReturnValue(
      of(
        buildList({
          items: [
            buildItem({
              shortDescription: 'A patrol that went long.',
              note: 'Read this one first.',
            }),
          ],
        }),
      ),
    );

    create();

    expect(fixture.nativeElement.textContent).toContain(
      'A patrol that went long.',
    );
    expect(fixture.nativeElement.textContent).toContain('Read this one first.');
  });

  it('says so when a list holds nothing', () => {
    readingListService.getList.mockReturnValue(of(buildList({ items: [] })));

    create();

    expect(fixture.nativeElement.textContent).toContain(
      'Nothing on this list yet',
    );
  });

  it('reports what the server said when a list cannot be loaded', () => {
    readingListService.getList.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { message: 'That reading list does not exist.' },
          }),
      ),
    );

    create();

    expect(component.errorMessage).toBe('That reading list does not exist.');
    expect(component.isLoading).toBe(false);
  });

  it('falls back to its own wording when the server gives none', () => {
    readingListService.getList.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();

    expect(component.errorMessage).toBe(
      'That reading list could not be loaded.',
    );
  });

  describe('somebody else’s public list', () => {
    beforeEach(() => {
      params = { userId: 'reader-1', slug: 'klingon-favourites' };
    });

    it('reads it by owner and address', () => {
      create();

      expect(readingListService.getPublicList).toHaveBeenCalledWith(
        'reader-1',
        'klingon-favourites',
      );
      expect(component.isMine).toBe(false);
    });

    // The controls only appear on your own list, whatever the server would
    // have said about somebody pressing them.
    it('offers no controls', () => {
      create();

      expect(fixture.nativeElement.querySelector('button')).toBeNull();
    });
  });

  it.each([
    ['a Story', buildItem(), ['/storytime', 'stories', 'the-long-patrol']],
    [
      'an Arc',
      buildItem({
        targetType: StorytimeTargetType.ARC,
        slug: 'the-dominion-war',
      }),
      ['/storytime', 'arcs', 'the-dominion-war'],
    ],
  ])('leads to %s', (_name, item, link) => {
    create();

    expect(component.linkFor(item)).toEqual(link);
  });

  describe('changing a list', () => {
    it('publishes it', () => {
      create();

      component.toggleVisibility();

      expect(readingListService.updateList).toHaveBeenCalledWith(LIST_ID, {
        isPublic: true,
      });
      expect(component.list?.isPublic).toBe(true);
    });

    it('takes it private again', () => {
      readingListService.getList.mockReturnValue(
        of(buildList({ isPublic: true })),
      );

      create();
      component.toggleVisibility();

      expect(readingListService.updateList).toHaveBeenCalledWith(LIST_ID, {
        isPublic: false,
      });
    });

    // The response carries the list but not its items, so they are kept rather
    // than emptied by a response that never had them.
    it('keeps what is on the list', () => {
      create();

      component.toggleVisibility();

      expect(component.list?.items).toHaveLength(1);
    });

    it('does nothing before the list is known', () => {
      readingListService.getList.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      create();
      component.toggleVisibility();

      expect(readingListService.updateList).not.toHaveBeenCalled();
    });

    it('ignores a second change while one is in flight', () => {
      create();
      component.isSaving = true;

      component.toggleVisibility();

      expect(readingListService.updateList).not.toHaveBeenCalled();
    });

    it('reports what the server said', () => {
      readingListService.updateList.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: { message: 'That list is not yours.' },
            }),
        ),
      );

      create();
      component.toggleVisibility();

      expect(component.errorMessage).toBe('That list is not yours.');
      expect(component.isSaving).toBe(false);
    });

    it('falls back to its own wording when the server gives none', () => {
      readingListService.updateList.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      create();
      component.toggleVisibility();

      expect(component.errorMessage).toBe('That change could not be saved.');
    });
  });

  describe('taking something off', () => {
    it('removes it and keeps what comes back', () => {
      create();

      component.removeItem(buildItem());

      expect(readingListService.removeItem).toHaveBeenCalledWith(
        LIST_ID,
        'item-1',
      );
      expect(component.list?.items).toEqual([]);
    });

    it('does nothing before the list is known', () => {
      readingListService.getList.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      create();
      component.removeItem(buildItem());

      expect(readingListService.removeItem).not.toHaveBeenCalled();
    });

    it('ignores a second removal while one is in flight', () => {
      create();
      component.isSaving = true;

      component.removeItem(buildItem());

      expect(readingListService.removeItem).not.toHaveBeenCalled();
    });

    it('reports a failure', () => {
      readingListService.removeItem.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      create();
      component.removeItem(buildItem());

      expect(component.errorMessage).toBe('That change could not be saved.');
    });

    it('reports what the server said', () => {
      readingListService.removeItem.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              error: { message: 'That is not on this list.' },
            }),
        ),
      );

      create();
      component.removeItem(buildItem());

      expect(component.errorMessage).toBe('That is not on this list.');
    });
  });

  describe('ordering a list', () => {
    /**
     * Builds a list of three things.
     *
     * @returns The list.
     */
    const threeItems = () =>
      buildList({
        items: [
          buildItem({ id: 'a' }),
          buildItem({ id: 'b' }),
          buildItem({ id: 'c' }),
        ],
      });

    // The whole order is sent rather than the one move, because that is what
    // the API takes and a half-applied order would be worse than none.
    it('moves something later', () => {
      readingListService.getList.mockReturnValue(of(threeItems()));

      create();
      component.move(buildItem({ id: 'a' }), 1);

      expect(readingListService.reorder).toHaveBeenCalledWith(LIST_ID, [
        'b',
        'a',
        'c',
      ]);
    });

    it('moves something earlier', () => {
      readingListService.getList.mockReturnValue(of(threeItems()));

      create();
      component.move(buildItem({ id: 'c' }), -1);

      expect(readingListService.reorder).toHaveBeenCalledWith(LIST_ID, [
        'a',
        'c',
        'b',
      ]);
    });

    it.each([
      ['past the start', buildItem({ id: 'a' }), -1],
      ['past the end', buildItem({ id: 'c' }), 1],
    ])('will not move something %s', (_name, item, offset) => {
      readingListService.getList.mockReturnValue(of(threeItems()));

      create();
      component.move(item, offset);

      expect(readingListService.reorder).not.toHaveBeenCalled();
    });

    it('does nothing before the list is known', () => {
      readingListService.getList.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      create();
      component.move(buildItem(), 1);

      expect(readingListService.reorder).not.toHaveBeenCalled();
    });

    it('ignores a second move while one is in flight', () => {
      create();
      component.isSaving = true;

      component.move(buildItem(), 1);

      expect(readingListService.reorder).not.toHaveBeenCalled();
    });
  });
});
