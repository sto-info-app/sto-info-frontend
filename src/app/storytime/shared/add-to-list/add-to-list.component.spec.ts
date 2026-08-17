import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  ReadingList,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { ReadingListService } from '../../reading-list.service';
import { AddToListComponent } from './add-to-list.component';

const STORY_ID = 'story-1';

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

describe('AddToListComponent', () => {
  let component: AddToListComponent;
  let fixture: ComponentFixture<AddToListComponent>;
  let readingListService: {
    getMyLists: jest.Mock;
    getListsHolding: jest.Mock;
    addItem: jest.Mock;
  };
  let authService: { isLoggedIn: jest.Mock };

  /**
   * Creates the component and runs its first change detection.
   */
  const create = () => {
    fixture = TestBed.createComponent(AddToListComponent);
    component = fixture.componentInstance;
    component.targetType = StorytimeTargetType.STORY;
    component.targetId = STORY_ID;
    fixture.detectChanges();
  };

  /**
   * Opens the control the way a reader does.
   */
  const open = () => {
    fixture.nativeElement
      .querySelector('.storytime-add-to-list__toggle')
      .click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    readingListService = {
      getMyLists: jest.fn().mockReturnValue(of([buildList()])),
      getListsHolding: jest.fn().mockReturnValue(of([])),
      addItem: jest.fn().mockReturnValue(of({ ...buildList(), items: [] })),
    };
    authService = { isLoggedIn: jest.fn().mockReturnValue(true) };

    await TestBed.configureTestingModule({
      imports: [AddToListComponent],
      providers: [
        { provide: ReadingListService, useValue: readingListService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('is created', () => {
    create();

    expect(component).toBeTruthy();
  });

  it('reads the reader’s lists and what already holds this', () => {
    create();

    expect(readingListService.getMyLists).toHaveBeenCalled();
    expect(readingListService.getListsHolding).toHaveBeenCalledWith(
      StorytimeTargetType.STORY,
      STORY_ID,
    );
  });

  // A list only exists for somebody with an account.
  it('shows nothing to a signed-out reader', () => {
    authService.isLoggedIn.mockReturnValue(false);

    create();

    expect(readingListService.getMyLists).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('opens and closes', () => {
    create();

    open();

    expect(fixture.nativeElement.textContent).toContain('Klingon favourites');

    open();

    expect(fixture.nativeElement.textContent).not.toContain(
      'Klingon favourites',
    );
  });

  it('says so when the reader has no lists', () => {
    readingListService.getMyLists.mockReturnValue(of([]));

    create();
    open();

    expect(fixture.nativeElement.textContent).toContain(
      'You have no reading lists yet',
    );
  });

  it('shows no lists when they cannot be read', () => {
    readingListService.getMyLists.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();

    expect(component.lists).toEqual([]);
  });

  it('assumes nothing holds it when that cannot be read', () => {
    readingListService.getListsHolding.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();

    expect(component.isHolding(buildList())).toBe(false);
  });

  it('adds this to a list', () => {
    create();

    component.add(buildList());

    expect(readingListService.addItem).toHaveBeenCalledWith(
      'list-1',
      StorytimeTargetType.STORY,
      STORY_ID,
    );
    expect(component.statusMessage).toBe('Added to Klingon favourites.');
    expect(component.isHolding(buildList())).toBe(true);
  });

  // Nobody should discover a list already holds something by adding it again.
  it('marks a list that already holds this and will not add it twice', () => {
    readingListService.getListsHolding.mockReturnValue(of(['list-1']));

    create();
    open();

    expect(fixture.nativeElement.textContent).toContain('Already on it');

    component.add(buildList());

    expect(readingListService.addItem).not.toHaveBeenCalled();
  });

  it('ignores a second attempt while one is in flight', () => {
    create();
    component.isSaving = true;

    component.add(buildList());

    expect(readingListService.addItem).not.toHaveBeenCalled();
  });

  it('reports what the server said', () => {
    readingListService.addItem.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'That list is full.' },
          }),
      ),
    );

    create();
    component.add(buildList());

    expect(component.errorMessage).toBe('That list is full.');
    expect(component.isSaving).toBe(false);
  });

  it('falls back to its own wording when the server gives none', () => {
    readingListService.addItem.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    create();
    component.add(buildList());

    expect(component.errorMessage).toBe('That could not be added. Try again.');
  });

  it('clears what it last said when reopened', () => {
    create();
    component.add(buildList());

    open();

    expect(component.isOpen).toBe(true);
    expect(component.statusMessage).toBe('');
  });
});
