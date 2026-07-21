import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import {
  CharacterRdProgress,
  CharacterRdSummary,
} from 'src/app/dashboard/models/character-rd.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { CharacterRdService } from 'src/app/dashboard/services/character-rd.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { CharacterRdComponent } from './character-rd.component';

describe('CharacterRdComponent', () => {
  let component: CharacterRdComponent;
  let fixture: ComponentFixture<CharacterRdComponent>;
  let routeParams$: Subject<Params>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let characterServiceSpy: jest.Mocked<CharacterService>;
  let rdServiceSpy: jest.Mocked<CharacterRdService>;

  const mockAccount = {
    id: 'acc1',
    handle: 'Test#1234',
  } as StoAccount;

  const mockCharacter = {
    id: 'char1',
    handle: 'Seven',
  } as Character;

  const mockProgress: CharacterRdProgress[] = [
    {
      id: 'p1',
      characterId: 'char1',
      schoolId: 'school1',
      school: {
        id: 'school1',
        name: 'Beams',
        description: 'Beam weapons.',
        iconUrl: '/assets/rd/beams.png',
        accentColor: '#c0392b',
        sortOrder: 10,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      currentLevel: 12,
      status: 'in_progress',
      completionPercentage: 60,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 'p2',
      characterId: 'char1',
      schoolId: 'school2',
      school: {
        id: 'school2',
        name: 'Cannons',
        description: null,
        iconUrl: null,
        accentColor: null,
        sortOrder: 20,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      currentLevel: 20,
      status: 'complete',
      completionPercentage: 100,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
  ];

  const mockSummary: CharacterRdSummary = {
    totalLevels: 32,
    maxPossibleLevels: 40,
    overallCompletionPercentage: 80,
    completedSchools: 1,
    totalSchools: 2,
  };

  beforeEach(async () => {
    routeParams$ = new Subject<Params>();

    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
    } as unknown as jest.Mocked<StoAccountService>;

    characterServiceSpy = {
      getCharactersByAccount: jest.fn().mockReturnValue(of([mockCharacter])),
    } as unknown as jest.Mocked<CharacterService>;

    rdServiceSpy = {
      getProgress: jest.fn().mockReturnValue(of(mockProgress)),
      getSummary: jest.fn().mockReturnValue(of(mockSummary)),
      updateProgress: jest
        .fn()
        .mockImplementation((_, schoolId, currentLevel) => {
          const existing = mockProgress.find(p => p.schoolId === schoolId)!;
          return of({
            ...existing,
            currentLevel,
          } as CharacterRdProgress);
        }),
    } as unknown as jest.Mocked<CharacterRdService>;

    await TestBed.configureTestingModule({
      imports: [CharacterRdComponent],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: CharacterService, useValue: characterServiceSpy },
        { provide: CharacterRdService, useValue: rdServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterRdComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load character and R&D data on init', () => {
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.accountHandle).toBe('Test#1234');
    expect(component.characterHandle).toBe('Seven');
    expect(component.characterId).toBe('char1');
    expect(rdServiceSpy.getProgress).toHaveBeenCalledWith('char1');
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

  it('should handle character-not-found', () => {
    characterServiceSpy.getCharactersByAccount.mockReturnValue(of([]));
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Missing' });

    expect(component.errorMessage).toBe('Character not found');
    expect(component.isLoading).toBe(false);
  });

  it('should handle initial load failure', () => {
    rdServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );

    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.errorMessage).toBe('Failed to load R&D data');
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

    expect(rdServiceSpy.getProgress).toHaveBeenCalledWith('char1');
    expect(component.progress()).toHaveLength(2);

    rdServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );
    component.loadProgress();
    expect(component.errorMessage).toBe('Failed to load R&D progress');
  });

  it('should filter by hide-complete and search text', () => {
    component.progress.set(mockProgress);

    component.hideComplete.set(true);
    expect(component.filteredProgress()).toHaveLength(1);

    component.hideComplete.set(false);
    component.searchText.set('cannon');
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
    component.toggleDescription('school1');
    expect(component.expandedDescriptions().has('school1')).toBe(true);

    component.toggleDescription('school1');
    expect(component.expandedDescriptions().has('school1')).toBe(false);
  });

  it('should set level and refresh summary on success', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    component.setLevel(mockProgress[0], 15);

    expect(rdServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'school1',
      15,
    );
    expect(component.savingSchoolId()).toBeNull();
  });

  it('should clamp level to the valid range and skip no-op updates', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    // Above max clamps to 20
    component.setLevel(mockProgress[0], 99);
    expect(rdServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'school1',
      20,
    );

    rdServiceSpy.updateProgress.mockClear();
    // Same value is a no-op
    component.setLevel(mockProgress[0], 12);
    expect(rdServiceSpy.updateProgress).not.toHaveBeenCalled();

    // Below zero clamps to 0
    component.setLevel(mockProgress[0], -5);
    expect(rdServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'school1',
      0,
    );
  });

  it('should increment and decrement levels', () => {
    component.characterId = 'char1';
    const setSpy = jest.spyOn(component, 'setLevel');

    component.incrementLevel(mockProgress[0]);
    expect(setSpy).toHaveBeenCalledWith(mockProgress[0], 13);

    component.decrementLevel(mockProgress[0]);
    expect(setSpy).toHaveBeenCalledWith(mockProgress[0], 11);
  });

  it('should set the level from a click position on the bar', () => {
    component.characterId = 'char1';
    const setSpy = jest.spyOn(component, 'setLevel');

    const track = {
      getBoundingClientRect: () => ({ left: 100, width: 200 }),
    } as unknown as HTMLElement;

    // Click at 75% along the bar -> 0.75 * 20 = 15
    component.onTrackClick(mockProgress[0], {
      currentTarget: track,
      clientX: 250,
    } as unknown as MouseEvent);
    expect(setSpy).toHaveBeenCalledWith(mockProgress[0], 15);
  });

  it('should ignore clicks when the bar has no measurable width', () => {
    component.characterId = 'char1';
    const setSpy = jest.spyOn(component, 'setLevel');

    const track = {
      getBoundingClientRect: () => ({ left: 0, width: 0 }),
    } as unknown as HTMLElement;

    component.onTrackClick(mockProgress[0], {
      currentTarget: track,
      clientX: 50,
    } as unknown as MouseEvent);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('should control the level from the keyboard', () => {
    component.characterId = 'char1';
    const setSpy = jest.spyOn(component, 'setLevel');
    const makeEvent = (key: string) => {
      const preventDefault = jest.fn();
      return {
        event: { key, preventDefault } as unknown as KeyboardEvent,
        preventDefault,
      };
    };

    const right = makeEvent('ArrowRight');
    component.onTrackKeydown(mockProgress[0], right.event);
    expect(setSpy).toHaveBeenCalledWith(mockProgress[0], 13);
    expect(right.preventDefault).toHaveBeenCalled();

    const left = makeEvent('ArrowLeft');
    component.onTrackKeydown(mockProgress[0], left.event);
    expect(setSpy).toHaveBeenCalledWith(mockProgress[0], 11);

    const home = makeEvent('Home');
    component.onTrackKeydown(mockProgress[0], home.event);
    expect(setSpy).toHaveBeenCalledWith(mockProgress[0], 0);

    const end = makeEvent('End');
    component.onTrackKeydown(mockProgress[0], end.event);
    expect(setSpy).toHaveBeenCalledWith(mockProgress[0], 20);

    // An unrelated key is ignored and not prevented
    setSpy.mockClear();
    const other = makeEvent('Enter');
    component.onTrackKeydown(mockProgress[0], other.event);
    expect(setSpy).not.toHaveBeenCalled();
    expect(other.preventDefault).not.toHaveBeenCalled();
  });

  it('should expose intermediate level ticks excluding rarity milestones', () => {
    expect(component.levelTicks).toEqual([
      1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19,
    ]);
    // Milestone levels (5/10/15/20) are never ticks
    for (const milestone of component.qualityMilestones) {
      expect(component.levelTicks).not.toContain(milestone.level);
    }
  });

  it('should resolve current craftable quality from level', () => {
    expect(
      component.currentQuality({ ...mockProgress[0], currentLevel: 0 }),
    ).toBe('Common');
    expect(
      component.currentQuality({ ...mockProgress[0], currentLevel: 5 }),
    ).toBe('Uncommon');
    expect(
      component.currentQuality({ ...mockProgress[0], currentLevel: 12 }),
    ).toBe('Rare');
    expect(
      component.currentQuality({ ...mockProgress[0], currentLevel: 15 }),
    ).toBe('Very Rare');
    expect(
      component.currentQuality({ ...mockProgress[0], currentLevel: 20 }),
    ).toBe('Ultra Rare');
  });

  it('should map rarity slugs to core rarity utility classes', () => {
    expect(component.rarityClass('uncommon')).toBe('rarity-uncommon');
    expect(component.rarityClass('ultra-rare')).toBe('rarity-ultra-rare');
  });

  it('should resolve the rarity class for the current quality', () => {
    expect(
      component.currentRarityClass({ ...mockProgress[0], currentLevel: 0 }),
    ).toBe('rarity-common');
    expect(
      component.currentRarityClass({ ...mockProgress[0], currentLevel: 5 }),
    ).toBe('rarity-uncommon');
    expect(
      component.currentRarityClass({ ...mockProgress[0], currentLevel: 12 }),
    ).toBe('rarity-rare');
    expect(
      component.currentRarityClass({ ...mockProgress[0], currentLevel: 15 }),
    ).toBe('rarity-very-rare');
    expect(
      component.currentRarityClass({ ...mockProgress[0], currentLevel: 20 }),
    ).toBe('rarity-ultra-rare');
  });

  it('should tolerate summary refresh errors', () => {
    component.characterId = 'char1';
    rdServiceSpy.getSummary.mockReturnValue(
      throwError(() => new Error('summary fail')),
    );

    const internal = component as unknown as { loadSummary: () => void };
    expect(() => internal.loadSummary()).not.toThrow();
  });

  it('should clear saving state on update error', () => {
    component.characterId = 'char1';
    rdServiceSpy.updateProgress.mockReturnValue(
      throwError(() => new Error('save fail')),
    );

    component.setLevel(mockProgress[0], 5);

    expect(component.savingSchoolId()).toBeNull();
  });

  it('should resolve accent colour and fall back when absent', () => {
    expect(component.accent(mockProgress[0])).toBe('#c0392b');
    expect(component.accent(mockProgress[1])).toBe('#fa0');
  });

  it('should build a translucent accent tint from hex', () => {
    expect(component.accentTint(mockProgress[0])).toBe(
      'rgba(192, 57, 43, 0.1)',
    );
    expect(component.accentTint(mockProgress[1])).toBe(
      'rgba(255, 170, 0, 0.1)',
    );
  });

  it('should track icon load failures and gate icon display', () => {
    expect(component.showIcon(mockProgress[0])).toBe(true);
    // school2 has no iconUrl
    expect(component.showIcon(mockProgress[1])).toBe(false);

    component.onIconError('school1');
    expect(component.failedIcons().has('school1')).toBe(true);
    expect(component.showIcon(mockProgress[0])).toBe(false);
  });

  it('should map schools to Font Awesome icons with a fallback', () => {
    expect(component.schoolIcon(mockProgress[0])).toBe('fa-bolt');
    expect(
      component.schoolIcon({
        ...mockProgress[0],
        school: { ...mockProgress[0].school, name: 'Unknown School' },
      }),
    ).toBe('fa-flask');
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
