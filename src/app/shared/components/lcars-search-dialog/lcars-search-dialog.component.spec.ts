import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { PrivacyModeService } from 'src/app/dashboard/services/privacy-mode.service';
import {
  LcarsSearchDialogComponent,
  LcarsSearchDialogData,
  SearchPage,
} from './lcars-search-dialog.component';

interface Item {
  id: string;
  name: string;
  sub: string;
}

describe('LcarsSearchDialogComponent', () => {
  let fixture: ComponentFixture<LcarsSearchDialogComponent<Item>>;
  let component: LcarsSearchDialogComponent<Item>;
  let dialogRef: jest.Mocked<MatDialogRef<LcarsSearchDialogComponent<Item>>>;
  let searchFn: jest.Mock;

  const makeResults = (
    items: Item[],
    total = items.length,
  ): SearchPage<Item> => ({
    items,
    total,
    page: 1,
    pageSize: 5,
  });

  const item1: Item = { id: '1', name: 'Kirk', sub: 'Captain' };
  const item2: Item = { id: '2', name: 'Spock', sub: 'Commander' };

  const buildData = (): LcarsSearchDialogData<Item> => ({
    title: 'Select a user',
    searchFn,
    resultLabel: (i: Item) => i.name,
    resultSublabel: (i: Item) => i.sub,
    pageSize: 5,
  });

  /**
   * Rebuilds the dialog with its own configuration and privacy setting, with
   * one page of results already in it.
   *
   * @param data - What the caller configured beyond the defaults.
   * @param isEnabled - Whether Privacy Mode is on.
   */
  const renderWith = async (
    data: Partial<LcarsSearchDialogData<Item>>,
    isEnabled = false,
  ): Promise<void> => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [LcarsSearchDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { ...buildData(), ...data } },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: PrivacyModeService,
          useValue: { isEnabled: (): boolean => isEnabled },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsSearchDialogComponent<Item>);
    component = fixture.componentInstance;
    component.results = makeResults([item1]);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    searchFn = jest.fn().mockReturnValue(of(makeResults([item1, item2])));
    dialogRef = { close: jest.fn() } as unknown as jest.Mocked<
      MatDialogRef<LcarsSearchDialogComponent<Item>>
    >;

    await TestBed.configureTestingModule({
      imports: [LcarsSearchDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: buildData() },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LcarsSearchDialogComponent<Item>);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('starts with no results and no search in flight', () => {
    expect(component.results).toBeNull();
    expect(component.isSearching).toBe(false);
  });

  it('does not search when fewer than two characters are entered', fakeAsync(() => {
    component.searchControl.setValue('a');
    tick(300);
    expect(searchFn).not.toHaveBeenCalled();
    expect(component.results).toBeNull();
  }));

  it('searches when two or more characters are entered', fakeAsync(() => {
    component.searchControl.setValue('ki');
    tick(300);
    expect(searchFn).toHaveBeenCalledWith('ki', 1);
    expect(component.results).not.toBeNull();
    expect(component.results!.items).toHaveLength(2);
  }));

  it('resets to page 1 when the search term changes', fakeAsync(() => {
    component.currentPage = 3;
    component.searchControl.setValue('sp');
    tick(300);
    expect(component.currentPage).toBe(1);
  }));

  it('clears results when term is shorter than two characters', fakeAsync(() => {
    component.searchControl.setValue('ki');
    tick(300);
    component.searchControl.setValue('k');
    tick(300);
    expect(component.results).toBeNull();
  }));

  it('clears results on search error', fakeAsync(() => {
    searchFn.mockReturnValueOnce(throwError(() => new Error('fail')));
    component.searchControl.setValue('ki');
    tick(300);
    expect(component.results).toBeNull();
    expect(component.isSearching).toBe(false);
  }));

  it('returns the primary label for an item', () => {
    expect(component.labelFor(item1)).toBe('Kirk');
  });

  it('returns the sublabel for an item when the fn is provided', () => {
    expect(component.sublabelFor(item1)).toBe('Captain');
  });

  it('returns null sublabel when no fn is provided', async () => {
    await TestBed.resetTestingModule();
    const dataWithoutSublabel: LcarsSearchDialogData<Item> = {
      title: 'Select',
      searchFn,
      resultLabel: (i: Item) => i.name,
      pageSize: 5,
    };
    await TestBed.configureTestingModule({
      imports: [LcarsSearchDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dataWithoutSublabel },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(LcarsSearchDialogComponent<Item>);
    f.detectChanges();
    expect(f.componentInstance.sublabelFor(item1)).toBeNull();
  });

  it('closes the dialog with the selected item', () => {
    component.select(item1);
    expect(dialogRef.close).toHaveBeenCalledWith(item1);
  });

  it('closes the dialog with undefined on cancel', () => {
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });

  describe('pagination', () => {
    it('hasPreviousPage is false on page 1', () => {
      component.currentPage = 1;
      expect(component.hasPreviousPage).toBe(false);
    });

    it('hasPreviousPage is true on page 2', () => {
      component.currentPage = 2;
      expect(component.hasPreviousPage).toBe(true);
    });

    it('hasNextPage is false when results is null', () => {
      component.results = null;
      expect(component.hasNextPage).toBe(false);
    });

    it('hasNextPage is false when all results fit on one page', fakeAsync(() => {
      component.searchControl.setValue('ki');
      tick(300);
      expect(component.hasNextPage).toBe(false);
    }));

    it('hasNextPage is true when results overflow the page', fakeAsync(() => {
      searchFn.mockReturnValueOnce(of(makeResults([item1, item2], 10)));
      component.searchControl.setValue('ki');
      tick(300);
      expect(component.hasNextPage).toBe(true);
    }));

    it('previousPage does nothing on page 1', () => {
      component.currentPage = 1;
      component.previousPage();
      expect(searchFn).not.toHaveBeenCalled();
    });

    it('previousPage decrements page and re-searches', fakeAsync(() => {
      component.searchControl.setValue('ki');
      tick(300);
      searchFn.mockClear();
      searchFn.mockReturnValueOnce(of(makeResults([item1, item2], 10)));
      component.currentPage = 2;
      component['_lastTerm'] = 'ki';
      component.previousPage();
      expect(component.currentPage).toBe(1);
      expect(searchFn).toHaveBeenCalledWith('ki', 1);
    }));

    it('nextPage does nothing when there is no next page', fakeAsync(() => {
      component.searchControl.setValue('ki');
      tick(300);
      searchFn.mockClear();
      component.nextPage();
      expect(searchFn).not.toHaveBeenCalled();
    }));

    it('nextPage increments page and re-searches', fakeAsync(() => {
      searchFn.mockReturnValueOnce(of(makeResults([item1, item2], 10)));
      component.searchControl.setValue('ki');
      tick(300);
      searchFn.mockClear();
      searchFn.mockReturnValueOnce(of(makeResults([item1], 10)));
      component.nextPage();
      expect(component.currentPage).toBe(2);
      expect(searchFn).toHaveBeenCalledWith('ki', 2);
    }));
  });

  // Two accounts that read alike by name are told apart by what the caller
  // puts on the facts row.
  describe('result facts', () => {
    it('shows each fact the caller supplies', async () => {
      await renderWith({
        resultFacts: (i: Item) => [
          { label: 'Role', value: 'ADMIN' },
          { label: 'Last signed in', value: i.sub },
        ],
      });

      const element = fixture.nativeElement as HTMLElement;
      const textOf = (selector: string): (string | undefined)[] =>
        Array.from(element.querySelectorAll(selector)).map(node =>
          node.textContent?.trim(),
        );

      expect(component.factsFor(item1)).toHaveLength(2);
      expect(textOf('.lcars-search-dialog__fact-label')).toEqual([
        'Role',
        'Last signed in',
      ]);
      expect(textOf('.lcars-search-dialog__fact-value')).toEqual([
        'ADMIN',
        'Captain',
      ]);
    });

    it('leaves the row off a search that supplies none', async () => {
      await renderWith({});

      expect(component.factsFor(item1)).toEqual([]);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.lcars-search-dialog__result-facts',
        ),
      ).toBeNull();
    });
  });

  // The dialog searches Stories on one screen and members on another. Only the
  // caller knows which of the two it is asking for, so only the caller can say
  // what on the result is personal data.
  describe('privacy mode', () => {
    /**
     * A caller searching for members, where the term and the second line — a
     * real name — are personal, and the username on the panel is not.
     */
    const memberSearch: Partial<LcarsSearchDialogData<Item>> = {
      privateTerm: true,
      privateSublabel: true,
    };

    it('hides what a member search types and shows', async () => {
      await renderWith(memberSearch, true);

      expect(component.isTermBlurred).toBe(true);
      expect(component.isSublabelBlurred).toBe(true);
    });

    it('blurs the real name on a result panel', async () => {
      await renderWith(memberSearch, true);

      const element = fixture.nativeElement as HTMLElement;

      expect(
        element.querySelector('.lcars-search-dialog__result-detail')?.className,
      ).toContain('privacy-blur');
      expect(
        element.querySelector('#lcars-search-dialog-input')?.className,
      ).toContain('privacy-blur');
      // The name a member is known by is not personal data, and stays legible.
      expect(
        element.querySelector('.lcars-search-dialog__result-name')?.className,
      ).not.toContain('privacy-blur');
    });

    it('shows a member search in full once privacy mode is off', async () => {
      await renderWith(memberSearch, false);

      expect(component.isTermBlurred).toBe(false);
      expect(component.isSublabelBlurred).toBe(false);
    });

    // A Story title and its summary are published work, not personal data.
    it('leaves a search that holds nothing personal alone', async () => {
      await renderWith({}, true);

      expect(component.isTermBlurred).toBe(false);
      expect(component.isSublabelBlurred).toBe(false);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.lcars-search-dialog__result-detail',
        )?.className,
      ).not.toContain('privacy-blur');
    });
  });
});
