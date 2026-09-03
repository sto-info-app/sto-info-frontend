import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import {
  CharacterCommendationProgress,
  CharacterCommendationSummary,
  COMMENDATION_UNLOCK_LEVEL,
} from 'src/app/dashboard/models/character-commendation.model';
import { Character } from 'src/app/dashboard/models/character.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterCommendationService } from 'src/app/dashboard/services/character-commendation.service';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { CharacterCommendationsComponent } from './character-commendations.component';

describe('CharacterCommendationsComponent', () => {
  let component: CharacterCommendationsComponent;
  let fixture: ComponentFixture<CharacterCommendationsComponent>;
  let routeParams$: Subject<Params>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let characterServiceSpy: jest.Mocked<CharacterService>;
  let commendationServiceSpy: jest.Mocked<CharacterCommendationService>;

  const mockAccount = {
    id: 'acc1',
    handle: 'Test#1234',
  } as StoAccount;

  const mockCharacter = {
    id: 'char1',
    handle: 'Seven',
    generalFaction: { id: 'gf1', name: 'Federation' },
  } as Character;

  const mockProgress: CharacterCommendationProgress[] = [
    {
      id: 'p1',
      characterId: 'char1',
      commendationId: 'diplomacy',
      commendation: {
        id: 'diplomacy',
        name: 'Diplomacy',
        description: 'Negotiation and first contact assignments.',
        iconUrl: '/assets/commendations/diplomacy.png',
        iconUrlKlingon: null,
        accentColor: '#4b84c4',
        factionRestriction: 'Federation',
        sortOrder: 10,
      },
      currentRank: 2,
      status: 'in_progress',
      completionPercentage: 50,
    },
    {
      id: 'p2',
      characterId: 'char1',
      commendationId: 'science',
      commendation: {
        id: 'science',
        name: 'Science',
        description: null,
        iconUrl: null,
        iconUrlKlingon: '/assets/commendations/science-klingon.png',
        accentColor: null,
        factionRestriction: null,
        sortOrder: 30,
      },
      currentRank: 4,
      status: 'complete',
      completionPercentage: 100,
    },
  ];

  const mockSummary: CharacterCommendationSummary = {
    totalRanks: 6,
    maxPossibleRanks: 8,
    overallCompletionPercentage: 75,
    completedCommendations: 1,
    totalCommendations: 2,
  };

  beforeEach(async () => {
    routeParams$ = new Subject<Params>();

    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
    } as unknown as jest.Mocked<StoAccountService>;

    characterServiceSpy = {
      getCharactersByAccount: jest.fn().mockReturnValue(of([mockCharacter])),
    } as unknown as jest.Mocked<CharacterService>;

    commendationServiceSpy = {
      getProgress: jest.fn().mockReturnValue(of(mockProgress)),
      getSummary: jest.fn().mockReturnValue(of(mockSummary)),
      updateProgress: jest
        .fn()
        .mockImplementation((_, commendationId, currentRank) => {
          const existing = mockProgress.find(
            p => p.commendationId === commendationId,
          )!;
          return of({
            ...existing,
            currentRank,
          } as CharacterCommendationProgress);
        }),
    } as unknown as jest.Mocked<CharacterCommendationService>;

    await TestBed.configureTestingModule({
      imports: [CharacterCommendationsComponent],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: CharacterService, useValue: characterServiceSpy },
        {
          provide: CharacterCommendationService,
          useValue: commendationServiceSpy,
        },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCommendationsComponent);
    component = fixture.componentInstance;
  });

  const resolveCharacter = (character: Character) => {
    characterServiceSpy.getCharactersByAccount.mockReturnValue(of([character]));
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should lock the tracker and skip loading below the unlock level', () => {
    resolveCharacter({
      ...mockCharacter,
      level: COMMENDATION_UNLOCK_LEVEL - 1,
    } as Character);

    expect(component.characterLevel()).toBe(COMMENDATION_UNLOCK_LEVEL - 1);
    expect(component.isLevelLocked()).toBe(true);
    expect(component.isGated()).toBe(true);
    expect(commendationServiceSpy.getProgress).not.toHaveBeenCalled();
    expect(commendationServiceSpy.getSummary).not.toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should lock the tracker for an undecided allegiance', () => {
    resolveCharacter({
      ...mockCharacter,
      level: COMMENDATION_UNLOCK_LEVEL,
      generalFaction: { id: 'gf3', name: 'Undecided' },
    } as Character);

    expect(component.characterGeneralFaction()).toBe('Undecided');
    expect(component.isAllegianceLocked()).toBe(true);
    expect(component.isLevelLocked()).toBe(false);
    expect(component.isGated()).toBe(true);
    expect(commendationServiceSpy.getProgress).not.toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should lock the tracker when no allegiance is recorded', () => {
    resolveCharacter({
      id: 'char1',
      handle: 'Seven',
      level: COMMENDATION_UNLOCK_LEVEL,
    } as Character);

    expect(component.characterGeneralFaction()).toBeNull();
    expect(component.isAllegianceLocked()).toBe(true);
    expect(commendationServiceSpy.getProgress).not.toHaveBeenCalled();
  });

  it('should load normally for a Federation captain at the unlock level', () => {
    resolveCharacter({
      ...mockCharacter,
      level: COMMENDATION_UNLOCK_LEVEL,
    } as Character);

    expect(component.isGated()).toBe(false);
    expect(component.isKlingonAligned()).toBe(false);
    expect(commendationServiceSpy.getProgress).toHaveBeenCalledWith('char1');
    expect(component.progress()).toHaveLength(2);
    expect(component.summary()).toEqual(mockSummary);
    expect(component.isLoading).toBe(false);
  });

  it('should load normally for a Klingon captain', () => {
    resolveCharacter({
      ...mockCharacter,
      generalFaction: { id: 'gf2', name: 'Klingon' },
    } as Character);

    expect(component.isAllegianceLocked()).toBe(false);
    expect(component.isKlingonAligned()).toBe(true);
    expect(commendationServiceSpy.getProgress).toHaveBeenCalledWith('char1');
  });

  it('should handle initial load failure', () => {
    commendationServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );

    resolveCharacter(mockCharacter);

    expect(component.errorMessage).toBe('Failed to load commendation data');
    expect(component.isLoading).toBe(false);
  });

  it('should load progress independently and handle error', () => {
    component.characterId = 'char1';

    component.loadProgress();

    expect(commendationServiceSpy.getProgress).toHaveBeenCalledWith('char1');
    expect(component.progress()).toHaveLength(2);

    commendationServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );
    component.loadProgress();
    expect(component.errorMessage).toBe('Failed to load commendation progress');
  });

  it('should show the Klingon icon variant only to Klingon captains', () => {
    // Federation captain: the shared artwork, even where a KDF variant exists.
    expect(component.iconUrl(mockProgress[1])).toBeNull();
    expect(component.iconUrl(mockProgress[0])).toBe(
      '/assets/commendations/diplomacy.png',
    );

    component.characterGeneralFaction.set('Klingon');

    expect(component.iconUrl(mockProgress[1])).toBe(
      '/assets/commendations/science-klingon.png',
    );
    // No Klingon variant on this row, so the shared artwork still shows.
    expect(component.iconUrl(mockProgress[0])).toBe(
      '/assets/commendations/diplomacy.png',
    );
  });

  it('should filter by hide-complete and search text', () => {
    component.progress.set(mockProgress);

    component.hideComplete.set(true);
    expect(component.filteredProgress()).toHaveLength(1);

    component.hideComplete.set(false);
    component.searchText.set('science');
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
    component.toggleDescription('diplomacy');
    expect(component.expandedDescriptions().has('diplomacy')).toBe(true);

    component.toggleDescription('diplomacy');
    expect(component.expandedDescriptions().has('diplomacy')).toBe(false);
  });

  it('should update rank and refresh summary on success', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    component.updateRank(mockProgress[0], 3);

    expect(commendationServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'diplomacy',
      3,
    );
    expect(component.savingItemId()).toBeNull();
  });

  it('should clear saving state on update error', () => {
    component.characterId = 'char1';
    commendationServiceSpy.updateProgress.mockReturnValue(
      throwError(() => new Error('save fail')),
    );

    component.updateRank(mockProgress[0], 3);

    expect(component.savingItemId()).toBeNull();
  });

  it('should support rangeArray/selectRank helper logic', () => {
    expect(component.rangeArray(3)).toEqual([0, 1, 2]);

    const updateSpy = jest.spyOn(component, 'updateRank');
    const item = { ...mockProgress[0], currentRank: 2 };

    // Clicking the rank already reached steps back down to the one below.
    component.selectRank(item, 1);
    expect(updateSpy).toHaveBeenCalledWith(item, 1);

    component.selectRank(item, 2);
    expect(updateSpy).toHaveBeenCalledWith(item, 3);
  });

  it('should format rank labels and titles', () => {
    expect(component.formatRank(mockProgress[0])).toBe('Rank 2');
    expect(component.rankTitle(0)).toBe('Rank 1 / 4 (2,500 CXP)');
    expect(component.rankTitle(3)).toBe('Rank 4 / 4 (100,000 CXP)');
  });

  it('should resolve accent colour and fall back when absent', () => {
    expect(component.accent(mockProgress[0])).toBe('#4b84c4');
    expect(component.accent(mockProgress[1])).toBe('#fa0');
  });

  it('should track icon load failures and gate icon display', () => {
    expect(component.showIcon(mockProgress[0])).toBe(true);
    // The science row has no Federation artwork.
    expect(component.showIcon(mockProgress[1])).toBe(false);

    component.onIconError('diplomacy');
    expect(component.failedIcons().has('diplomacy')).toBe(true);
    expect(component.showIcon(mockProgress[0])).toBe(false);
  });

  it('should expose computed links', () => {
    component.accountHandle = 'Test#1234';
    component.characterHandle = 'Seven';

    expect(component.accountLink()).toBe('/dashboard/accounts/Test~1234');
    expect(component.characterEditLink()).toEqual([
      '/dashboard/accounts',
      'Test~1234',
      'Seven',
      'edit',
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
