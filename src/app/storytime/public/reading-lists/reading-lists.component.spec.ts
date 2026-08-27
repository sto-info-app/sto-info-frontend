import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ReadingList } from 'src/app/models/storytime.models';
import { ReadingListService } from '../../reading-list.service';
import { ReadingListsComponent } from './reading-lists.component';

/**
 * Builds a list.
 *
 * @param overrides - What differs from an empty private list.
 * @returns The list.
 */
const buildList = (overrides: Partial<ReadingList> = {}): ReadingList => ({
  id: 'list-1',
  ownerUserId: 'reader-1',
  name: 'Klingon favourites',
  slug: 'klingon-favourites',
  description: null,
  isPublic: false,
  itemCount: 0,
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('ReadingListsComponent', () => {
  let component: ReadingListsComponent;
  let fixture: ComponentFixture<ReadingListsComponent>;
  let readingListService: {
    getMyLists: jest.Mock;
    createList: jest.Mock;
    deleteList: jest.Mock;
  };

  /**
   * Creates the component and runs its first change detection.
   */
  const create = () => {
    fixture = TestBed.createComponent(ReadingListsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    readingListService = {
      getMyLists: jest.fn().mockReturnValue(of([buildList()])),
      createList: jest.fn().mockReturnValue(of(buildList())),
      deleteList: jest.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [ReadingListsComponent, RouterTestingModule],
      providers: [
        { provide: ReadingListService, useValue: readingListService },
      ],
    }).compileComponents();
  });

  it('is created', () => {
    create();

    expect(component).toBeTruthy();
  });

  it('shows the reader’s lists', () => {
    create();

    expect(readingListService.getMyLists).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Klingon favourites');
    expect(fixture.nativeElement.textContent).toContain('Private');
  });

  it('says which lists anybody may read', () => {
    readingListService.getMyLists.mockReturnValue(
      of([buildList({ isPublic: true })]),
    );

    create();

    expect(fixture.nativeElement.textContent).toContain('Public');
  });

  it.each([
    [0, '0 things'],
    [1, '1 thing'],
    [4, '4 things'],
  ])('counts %i things on a list', (itemCount, wording) => {
    readingListService.getMyLists.mockReturnValue(
      of([buildList({ itemCount })]),
    );

    create();

    expect(
      (fixture.nativeElement.textContent as string).replace(/\s+/g, ' '),
    ).toContain(wording);
  });

  it('says so when there are no lists', () => {
    readingListService.getMyLists.mockReturnValue(of([]));

    create();

    expect(fixture.nativeElement.textContent).toContain(
      'You have no reading lists yet',
    );
  });

  it('reports what the server said when the lists fail to load', () => {
    readingListService.getMyLists.mockReturnValue(
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

  it('falls back to its own wording when loading fails silently', () => {
    readingListService.getMyLists.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();

    expect(component.errorMessage).toBe(
      'Your reading lists could not be loaded.',
    );
  });

  describe('making a list', () => {
    it('makes one from what the reader typed', () => {
      create();
      component.newName = '  Later  ';
      component.newIsPublic = true;

      component.create();

      expect(readingListService.createList).toHaveBeenCalledWith({
        name: 'Later',
        isPublic: true,
      });
      expect(component.newName).toBe('');
      expect(component.newIsPublic).toBe(false);
    });

    it('reads the lists back afterwards', () => {
      create();
      readingListService.getMyLists.mockClear();
      component.newName = 'Later';

      component.create();

      expect(readingListService.getMyLists).toHaveBeenCalled();
    });

    it.each([
      ['nothing', ''],
      ['only spaces', '   '],
    ])('makes nothing when the reader typed %s', (_name, newName) => {
      create();
      component.newName = newName;

      component.create();

      expect(readingListService.createList).not.toHaveBeenCalled();
    });

    it('ignores a second attempt while one is in flight', () => {
      create();
      component.newName = 'Later';
      component.isSaving = true;

      component.create();

      expect(readingListService.createList).not.toHaveBeenCalled();
    });

    it('reports what the server said', () => {
      readingListService.createList.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'You already have too many lists.' },
            }),
        ),
      );

      create();
      component.newName = 'Later';
      component.create();

      expect(component.errorMessage).toBe('You already have too many lists.');
      expect(component.isSaving).toBe(false);
    });

    it('falls back to its own wording when the server gives none', () => {
      readingListService.createList.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      create();
      component.newName = 'Later';
      component.create();

      expect(component.errorMessage).toBe('That list could not be made.');
    });

    it('makes a list when the form is submitted', () => {
      create();
      component.newName = 'Later';
      fixture.detectChanges();

      fixture.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit'));

      expect(readingListService.createList).toHaveBeenCalled();
    });
  });

  describe('deleting a list', () => {
    it('deletes it and reads the rest back', () => {
      create();
      readingListService.getMyLists.mockClear();

      component.remove(buildList());

      expect(readingListService.deleteList).toHaveBeenCalledWith('list-1');
      expect(readingListService.getMyLists).toHaveBeenCalled();
    });

    it('ignores a second attempt while one is in flight', () => {
      create();
      component.isSaving = true;

      component.remove(buildList());

      expect(readingListService.deleteList).not.toHaveBeenCalled();
    });

    it('reports what the server said', () => {
      readingListService.deleteList.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: { message: 'That list is not yours.' },
            }),
        ),
      );

      create();
      component.remove(buildList());

      expect(component.errorMessage).toBe('That list is not yours.');
      expect(component.isSaving).toBe(false);
    });

    it('falls back to its own wording when the server gives none', () => {
      readingListService.deleteList.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      create();
      component.remove(buildList());

      expect(component.errorMessage).toBe('That list could not be deleted.');
    });
  });
});
