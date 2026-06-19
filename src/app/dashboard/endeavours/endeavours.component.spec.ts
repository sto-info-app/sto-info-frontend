import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import {
  EndeavourProgress,
  EndeavourSummary,
} from 'src/app/dashboard/models/endeavour.model';
import { EndeavourService } from 'src/app/dashboard/services/endeavour.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { EndeavoursComponent } from './endeavours.component';

describe('EndeavoursComponent', () => {
  let component: EndeavoursComponent;
  let fixture: ComponentFixture<EndeavoursComponent>;
  let routeParams$: Subject<Params>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let endeavourServiceSpy: jest.Mocked<EndeavourService>;

  const mockAccount = {
    id: 'acc1',
    handle: 'Test#1234',
  } as StoAccount;

  const mockProgress: EndeavourProgress[] = [
    {
      id: 'p1',
      accountId: 'acc1',
      endeavourPerkId: 'perk1',
      endeavourPerk: {
        id: 'perk1',
        name: 'Space Mastery',
        category: 'Space',
        description: 'Space bonus',
        boostPerRank: 1,
        boostMax: 10,
        boostUnit: 'percent',
        maxNodes: 3,
        sortOrder: 1,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      currentNodes: 2,
      status: 'in_progress',
      completionPercentage: 66.67,
      totalBoostEarned: 2,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 'p2',
      accountId: 'acc1',
      endeavourPerkId: 'perk2',
      endeavourPerk: {
        id: 'perk2',
        name: 'Ground Mastery',
        category: 'Ground',
        description: null,
        boostPerRank: 2,
        boostMax: 20,
        boostUnit: 'flat',
        maxNodes: 2,
        sortOrder: 2,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      currentNodes: 2,
      status: 'complete',
      completionPercentage: 100,
      totalBoostEarned: 4,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
  ];

  const mockSummary: EndeavourSummary = {
    totalNodes: 4,
    maxPossibleNodes: 5,
    overallCompletionPercentage: 80,
    maxedPerks: 1,
    totalPerks: 2,
    spaceNodes: 2,
    spaceMaxNodes: 3,
    spaceCompletionPercentage: 66.67,
    groundNodes: 2,
    groundMaxNodes: 2,
    groundCompletionPercentage: 100,
  };

  beforeEach(async () => {
    routeParams$ = new Subject<Params>();

    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
    } as unknown as jest.Mocked<StoAccountService>;

    endeavourServiceSpy = {
      getProgress: jest.fn().mockReturnValue(of(mockProgress)),
      getSummary: jest.fn().mockReturnValue(of(mockSummary)),
      updateProgress: jest
        .fn()
        .mockImplementation((_, perkId, currentNodes) => {
          const existing = mockProgress.find(
            p => p.endeavourPerkId === perkId,
          )!;
          return of({ ...existing, currentNodes } as EndeavourProgress);
        }),
    } as unknown as jest.Mocked<EndeavourService>;

    await TestBed.configureTestingModule({
      imports: [EndeavoursComponent],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: EndeavourService, useValue: endeavourServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EndeavoursComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load account and endeavour data on init', () => {
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234' });

    expect(component.accountHandle).toBe('Test#1234');
    expect(component.accountId).toBe('acc1');
    expect(endeavourServiceSpy.getProgress).toHaveBeenCalledWith('acc1', {
      sortBy: 'nodes',
      sortOrder: 'DESC',
    });
    expect(component.progress().length).toBe(2);
    expect(component.summary()).toEqual(mockSummary);
    expect(component.isLoading).toBe(false);
  });

  it('should handle account-not-found', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(of([]));
    fixture.detectChanges();
    routeParams$.next({ handle: 'Missing~1234' });

    expect(component.errorMessage).toBe('Account not found');
    expect(component.isLoading).toBe(false);
  });

  it('should handle account load failure', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(
      throwError(() => new Error('accounts fail')),
    );
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234' });

    expect(component.errorMessage).toBe('Failed to load account details');
    expect(component.isLoading).toBe(false);
  });

  it('should handle initial load failure', () => {
    endeavourServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );

    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234' });

    expect(component.errorMessage).toBe('Failed to load endeavour data');
    expect(component.isLoading).toBe(false);
  });

  it('should load progress independently and handle error', () => {
    component.accountId = 'acc1';
    component.sortBy.set('name');
    component.sortOrder.set('ASC');

    component.loadProgress();

    expect(endeavourServiceSpy.getProgress).toHaveBeenCalledWith('acc1', {
      sortBy: 'name',
      sortOrder: 'ASC',
    });
    expect(component.progress().length).toBe(2);

    endeavourServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );
    component.loadProgress();
    expect(component.errorMessage).toBe('Failed to load endeavour progress');
  });

  it('should filter by category, hide-complete, and search text', () => {
    component.progress.set(mockProgress);

    component.setCategory('Space');
    expect(component.filteredProgress().length).toBe(1);

    component.setCategory('All');
    component.hideComplete.set(true);
    expect(component.filteredProgress().length).toBe(1);

    component.hideComplete.set(false);
    component.searchText.set('ground');
    expect(component.filteredProgress().length).toBe(1);
  });

  it('should keep default rank display when summary is null', () => {
    component.summary.set(null);
    expect(component.rankDisplay()).toBe('0000');
  });

  it('should stop loading and show an error when handle route param is empty', () => {
    fixture.detectChanges();
    routeParams$.next({});
    expect(stoAccountServiceSpy.getAccounts).not.toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Invalid account link');
  });

  it('should compute complete count and active filter count', () => {
    component.progress.set(mockProgress);
    expect(component.completeCount()).toBe(1);
    expect(component.activeFilterCount()).toBe(0);

    component.setCategory('Space');
    component.hideComplete.set(true);
    component.searchText.set('abc');
    expect(component.activeFilterCount()).toBe(3);
  });

  it('should clear filters', () => {
    component.setCategory('Ground');
    component.hideComplete.set(true);
    component.searchText.set('x');

    component.clearFilters();

    expect(component.categoryFilter()).toBe('All');
    expect(component.hideComplete()).toBe(false);
    expect(component.searchText()).toBe('');
  });

  it('should toggle description expansion set', () => {
    component.toggleDescription('perk1');
    expect(component.expandedDescriptions().has('perk1')).toBe(true);

    component.toggleDescription('perk1');
    expect(component.expandedDescriptions().has('perk1')).toBe(false);
  });

  it('should set sort by and order, and reload progress', () => {
    component.accountId = 'acc1';

    component.setSortBy('name');
    expect(component.sortBy()).toBe('name');
    expect(component.sortOrder()).toBe('ASC');

    component.setSortBy('nodes');
    expect(component.sortOrder()).toBe('DESC');

    component.setSortOrder('ASC');
    expect(component.sortOrder()).toBe('ASC');

    component.toggleSortOrder();
    expect(component.sortOrder()).toBe('DESC');

    component.toggleSortOrder();
    expect(component.sortOrder()).toBe('ASC');
  });

  it('should update nodes and refresh summary on success', () => {
    component.accountId = 'acc1';
    component.progress.set(mockProgress);

    component.updateNodes(mockProgress[0], 3);

    expect(endeavourServiceSpy.updateProgress).toHaveBeenCalledWith(
      'acc1',
      'perk1',
      3,
    );
    expect(component.savingPerkId()).toBeNull();
  });

  it('should tolerate summary refresh errors', () => {
    component.accountId = 'acc1';
    endeavourServiceSpy.getSummary.mockReturnValue(
      throwError(() => new Error('summary fail')),
    );

    const internal = component as unknown as { loadSummary: () => void };
    expect(() => internal.loadSummary()).not.toThrow();
  });

  it('should clear saving state on update error', () => {
    component.accountId = 'acc1';
    endeavourServiceSpy.updateProgress.mockReturnValue(
      throwError(() => new Error('save fail')),
    );

    component.updateNodes(mockProgress[0], 3);

    expect(component.savingPerkId()).toBeNull();
  });

  it('should support rangeArray/selectNode helper logic', () => {
    expect(component.rangeArray(3)).toEqual([0, 1, 2]);

    const updateSpy = jest.spyOn(component, 'updateNodes');
    const item = { ...mockProgress[0], currentNodes: 2 };

    component.selectNode(item, 1);
    expect(updateSpy).toHaveBeenCalledWith(item, 1);

    component.selectNode(item, 2);
    expect(updateSpy).toHaveBeenCalledWith(item, 3);
  });

  it('should format earned values for percent/flat including decimals and zero', () => {
    expect(
      component.formatEarned({ ...mockProgress[0], totalBoostEarned: 0 }),
    ).toBe('+0%');
    expect(
      component.formatEarned({ ...mockProgress[0], totalBoostEarned: 2 }),
    ).toBe('+2%');
    expect(
      component.formatEarned({
        ...mockProgress[1],
        totalBoostEarned: 2.5,
        endeavourPerk: { ...mockProgress[1].endeavourPerk, boostUnit: 'flat' },
      }),
    ).toBe('+2.5');
  });

  it('should expose trackBy and computed links/rank display', () => {
    component.accountHandle = 'Test#1234';
    component.summary.set(mockSummary);

    expect(component.trackByPerkId(0, mockProgress[0])).toBe('perk1');
    expect(component.accountLink()).toBe('/dashboard/accounts/Test~1234');
    expect(component.accountsLink).toBe('/dashboard/accounts');
    expect(component.rankDisplay()).toBe('0004');
  });

  it('should complete destroy stream on destroy', () => {
    const nextSpy = jest.spyOn(component['_destroy$'], 'next');
    const completeSpy = jest.spyOn(component['_destroy$'], 'complete');
    component.ngOnDestroy();
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
