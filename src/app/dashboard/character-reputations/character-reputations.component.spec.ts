import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import {
  CharacterReputationProgress,
  CharacterReputationSummary,
} from 'src/app/dashboard/models/character-reputation.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { CharacterReputationService } from 'src/app/dashboard/services/character-reputation.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { CharacterReputationsComponent } from './character-reputations.component';

describe('CharacterReputationsComponent', () => {
  let component: CharacterReputationsComponent;
  let fixture: ComponentFixture<CharacterReputationsComponent>;
  let routeParams$: Subject<Params>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let characterServiceSpy: jest.Mocked<CharacterService>;
  let reputationServiceSpy: jest.Mocked<CharacterReputationService>;

  const mockAccount = {
    id: 'acc1',
    handle: 'Test#1234',
  } as StoAccount;

  const mockCharacter = {
    id: 'char1',
    handle: 'Seven',
  } as Character;

  const mockProgress: CharacterReputationProgress[] = [
    {
      id: 'p1',
      characterId: 'char1',
      reputationId: 'rep1',
      reputation: {
        id: 'rep1',
        name: 'Task Force Omega',
        description: 'Borg-focused reputation.',
        iconUrl: '/assets/reputations/omega.png',
        accentColor: '#1f6321',
        releasedWith: 'Season Seven: New Romulus',
        sortOrder: 10,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      currentTier: 4,
      status: 'in_progress',
      completionPercentage: 67,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 'p2',
      characterId: 'char1',
      reputationId: 'rep2',
      reputation: {
        id: 'rep2',
        name: 'New Romulus',
        description: null,
        iconUrl: null,
        accentColor: null,
        releasedWith: null,
        sortOrder: 20,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      currentTier: 6,
      status: 'complete',
      completionPercentage: 100,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
  ];

  const mockSummary: CharacterReputationSummary = {
    totalTiers: 10,
    maxPossibleTiers: 12,
    overallCompletionPercentage: 83,
    completedReputations: 1,
    totalReputations: 2,
  };

  beforeEach(async () => {
    routeParams$ = new Subject<Params>();

    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
    } as unknown as jest.Mocked<StoAccountService>;

    characterServiceSpy = {
      getCharactersByAccount: jest.fn().mockReturnValue(of([mockCharacter])),
    } as unknown as jest.Mocked<CharacterService>;

    reputationServiceSpy = {
      getProgress: jest.fn().mockReturnValue(of(mockProgress)),
      getSummary: jest.fn().mockReturnValue(of(mockSummary)),
      updateProgress: jest
        .fn()
        .mockImplementation((_, reputationId, currentTier) => {
          const existing = mockProgress.find(
            p => p.reputationId === reputationId,
          )!;
          return of({
            ...existing,
            currentTier,
          } as CharacterReputationProgress);
        }),
    } as unknown as jest.Mocked<CharacterReputationService>;

    await TestBed.configureTestingModule({
      imports: [CharacterReputationsComponent],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: CharacterService, useValue: characterServiceSpy },
        { provide: CharacterReputationService, useValue: reputationServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterReputationsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load character and reputation data on init', () => {
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.accountHandle).toBe('Test#1234');
    expect(component.characterHandle).toBe('Seven');
    expect(component.characterId).toBe('char1');
    expect(reputationServiceSpy.getProgress).toHaveBeenCalledWith('char1');
    expect(component.progress()).toHaveLength(2);
    expect(component.summary()).toEqual(mockSummary);
    expect(component.isLoading).toBe(false);
  });

  it('should handle account-not-found', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(of([]));
    fixture.detectChanges();
    routeParams$.next({ handle: 'Missing~1234', characterHandle: 'Seven' });

    expect(component.errorMessage).toBe('Account not found');
    expect(component.isLoading).toBe(false);
  });

  it('should handle account load failure', () => {
    stoAccountServiceSpy.getAccounts.mockReturnValue(
      throwError(() => new Error('accounts fail')),
    );
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.errorMessage).toBe('Failed to load account details');
    expect(component.isLoading).toBe(false);
  });

  it('should handle character-not-found', () => {
    characterServiceSpy.getCharactersByAccount.mockReturnValue(of([]));
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Missing' });

    expect(component.errorMessage).toBe('Character not found');
    expect(component.isLoading).toBe(false);
  });

  it('should handle character load failure', () => {
    characterServiceSpy.getCharactersByAccount.mockReturnValue(
      throwError(() => new Error('characters fail')),
    );
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.errorMessage).toBe('Failed to load account characters');
    expect(component.isLoading).toBe(false);
  });

  it('should handle initial load failure', () => {
    reputationServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );

    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.errorMessage).toBe('Failed to load reputation data');
    expect(component.isLoading).toBe(false);
  });

  it('should stop loading and show an error when route params are missing', () => {
    fixture.detectChanges();
    routeParams$.next({});
    expect(stoAccountServiceSpy.getAccounts).not.toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Invalid character link');
  });

  it('should load progress independently and handle error', () => {
    component.characterId = 'char1';

    component.loadProgress();

    expect(reputationServiceSpy.getProgress).toHaveBeenCalledWith('char1');
    expect(component.progress()).toHaveLength(2);

    reputationServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );
    component.loadProgress();
    expect(component.errorMessage).toBe('Failed to load reputation progress');
  });

  it('should filter by hide-complete and search text', () => {
    component.progress.set(mockProgress);

    component.hideComplete.set(true);
    expect(component.filteredProgress()).toHaveLength(1);

    component.hideComplete.set(false);
    component.searchText.set('romulus');
    expect(component.filteredProgress()).toHaveLength(1);
  });

  it('should compute complete count and active filter count', () => {
    component.progress.set(mockProgress);
    expect(component.completeCount()).toBe(1);
    expect(component.activeFilterCount()).toBe(0);

    component.hideComplete.set(true);
    component.searchText.set('abc');
    expect(component.activeFilterCount()).toBe(2);
  });

  it('should clear filters', () => {
    component.hideComplete.set(true);
    component.searchText.set('x');

    component.clearFilters();

    expect(component.hideComplete()).toBe(false);
    expect(component.searchText()).toBe('');
  });

  it('should toggle description expansion set', () => {
    component.toggleDescription('rep1');
    expect(component.expandedDescriptions().has('rep1')).toBe(true);

    component.toggleDescription('rep1');
    expect(component.expandedDescriptions().has('rep1')).toBe(false);
  });

  it('should update tier and refresh summary on success', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    component.updateTier(mockProgress[0], 5);

    expect(reputationServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'rep1',
      5,
    );
    expect(component.savingItemId()).toBeNull();
  });

  it('should tolerate summary refresh errors', () => {
    component.characterId = 'char1';
    reputationServiceSpy.getSummary.mockReturnValue(
      throwError(() => new Error('summary fail')),
    );

    const internal = component as unknown as { loadSummary: () => void };
    expect(() => internal.loadSummary()).not.toThrow();
  });

  it('should clear saving state on update error', () => {
    component.characterId = 'char1';
    reputationServiceSpy.updateProgress.mockReturnValue(
      throwError(() => new Error('save fail')),
    );

    component.updateTier(mockProgress[0], 5);

    expect(component.savingItemId()).toBeNull();
  });

  it('should support rangeArray/selectTier helper logic', () => {
    expect(component.rangeArray(3)).toEqual([0, 1, 2]);

    const updateSpy = jest.spyOn(component, 'updateTier');
    const item = { ...mockProgress[0], currentTier: 2 };

    component.selectTier(item, 1);
    expect(updateSpy).toHaveBeenCalledWith(item, 1);

    component.selectTier(item, 2);
    expect(updateSpy).toHaveBeenCalledWith(item, 3);
  });

  it('should format tier labels and titles', () => {
    expect(component.formatTier(mockProgress[0])).toBe('Tier 4');
    expect(component.tierTitle(0)).toBe('Tier 1 / 6 (2,500 XP)');
    expect(component.tierTitle(5)).toBe('Tier 6 / 6 (250,000 XP)');
  });

  it('should resolve accent colour and fall back when absent', () => {
    expect(component.accent(mockProgress[0])).toBe('#1f6321');
    expect(component.accent(mockProgress[1])).toBe('#fa0');
  });

  it('should build a translucent accent tint from hex', () => {
    expect(component.accentTint(mockProgress[0])).toBe('rgba(31, 99, 33, 0.1)');
    expect(component.accentTint(mockProgress[0], 0.2)).toBe(
      'rgba(31, 99, 33, 0.2)',
    );
    // 3-digit fallback hex expands correctly
    expect(component.accentTint(mockProgress[1])).toBe(
      'rgba(255, 170, 0, 0.1)',
    );
  });

  it('should return transparent for invalid accent colors', () => {
    expect(
      component.accentTint({
        ...mockProgress[0],
        reputation: {
          ...mockProgress[0].reputation,
          accentColor: '#12',
        },
      }),
    ).toBe('transparent');

    expect(
      component.accentTint({
        ...mockProgress[0],
        reputation: {
          ...mockProgress[0].reputation,
          accentColor: '#gggggg',
        },
      }),
    ).toBe('transparent');
  });

  it('should track icon load failures and gate icon display', () => {
    expect(component.showIcon(mockProgress[0])).toBe(true);
    // rep2 has no iconUrl
    expect(component.showIcon(mockProgress[1])).toBe(false);

    component.onIconError('rep1');
    expect(component.failedIcons().has('rep1')).toBe(true);
    expect(component.showIcon(mockProgress[0])).toBe(false);
  });

  it('should expose computed links', () => {
    component.accountHandle = 'Test#1234';
    component.characterHandle = 'Seven';

    expect(component.accountLink()).toBe('/dashboard/accounts/Test~1234');
    expect(component.accountsLink).toBe('/dashboard/accounts');
    expect(component.characterLink()).toEqual([
      '/dashboard/accounts',
      'Test~1234',
      'Seven',
    ]);
  });

  it('should complete destroy stream on destroy', () => {
    const nextSpy = jest.spyOn(component['_destroy$'], 'next');
    const completeSpy = jest.spyOn(component['_destroy$'], 'complete');
    component.ngOnDestroy();
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
