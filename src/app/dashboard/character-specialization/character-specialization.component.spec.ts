import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import {
  SPECIALIZATION_UNLOCK_LEVEL,
  CharacterSpecializationProgress,
  CharacterSpecializationSummary,
} from 'src/app/dashboard/models/character-specialization.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { CharacterSpecializationService } from 'src/app/dashboard/services/character-specialization.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { CharacterSpecializationComponent } from './character-specialization.component';

describe('CharacterSpecializationComponent', () => {
  let component: CharacterSpecializationComponent;
  let fixture: ComponentFixture<CharacterSpecializationComponent>;
  let routeParams$: Subject<Params>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let characterServiceSpy: jest.Mocked<CharacterService>;
  let specServiceSpy: jest.Mocked<CharacterSpecializationService>;

  const mockAccount = {
    id: 'acc1',
    handle: 'Test#1234',
  } as StoAccount;

  const mockCharacter = {
    id: 'char1',
    handle: 'Seven',
  } as Character;

  const mockProgress: CharacterSpecializationProgress[] = [
    {
      id: 'p1',
      characterId: 'char1',
      specializationId: 'spec1',
      specialization: {
        id: 'spec1',
        name: 'Intelligence Officer',
        description: 'Exposing enemy weaknesses.',
        iconUrl: '/assets/specializations/intelligence.png',
        accentColor: '#16a085',
        type: 'primary',
        maxPoints: 30,
        sortOrder: 20,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      pointsSpent: 12,
      slot: 'primary',
      status: 'in_progress',
      completionPercentage: 40,
      qualificationUnlocked: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
    {
      id: 'p2',
      characterId: 'char1',
      specializationId: 'spec2',
      specialization: {
        id: 'spec2',
        name: 'Strategist',
        description: null,
        iconUrl: null,
        accentColor: null,
        type: 'secondary',
        maxPoints: 15,
        sortOrder: 80,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
      pointsSpent: 15,
      slot: 'secondary',
      status: 'complete',
      completionPercentage: 100,
      qualificationUnlocked: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    },
  ];

  const mockSummary: CharacterSpecializationSummary = {
    totalPoints: 27,
    maxPossiblePoints: 45,
    overallCompletionPercentage: 60,
    completedSpecializations: 1,
    totalSpecializations: 2,
    primarySpecializationName: 'Intelligence Officer',
    secondarySpecializationName: 'Strategist',
  };

  beforeEach(async () => {
    routeParams$ = new Subject<Params>();

    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
    } as unknown as jest.Mocked<StoAccountService>;

    characterServiceSpy = {
      getCharactersByAccount: jest.fn().mockReturnValue(of([mockCharacter])),
    } as unknown as jest.Mocked<CharacterService>;

    specServiceSpy = {
      getProgress: jest.fn().mockReturnValue(of(mockProgress)),
      getSummary: jest.fn().mockReturnValue(of(mockSummary)),
      updateProgress: jest
        .fn()
        .mockImplementation((_, specializationId, pointsSpent) => {
          const existing = mockProgress.find(
            p => p.specializationId === specializationId,
          )!;
          return of({
            ...existing,
            pointsSpent,
          } as CharacterSpecializationProgress);
        }),
      updateSlot: jest.fn().mockImplementation((_, specializationId, slot) => {
        const existing = mockProgress.find(
          p => p.specializationId === specializationId,
        )!;
        return of({ ...existing, slot } as CharacterSpecializationProgress);
      }),
    } as unknown as jest.Mocked<CharacterSpecializationService>;

    await TestBed.configureTestingModule({
      imports: [CharacterSpecializationComponent],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: CharacterService, useValue: characterServiceSpy },
        {
          provide: CharacterSpecializationService,
          useValue: specServiceSpy,
        },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterSpecializationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should lock the tracker and skip loading below the unlock level', () => {
    characterServiceSpy.getCharactersByAccount.mockReturnValue(
      of([
        {
          ...mockCharacter,
          level: SPECIALIZATION_UNLOCK_LEVEL - 1,
        } as Character,
      ]),
    );

    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.characterLevel()).toBe(SPECIALIZATION_UNLOCK_LEVEL - 1);
    expect(component.isLevelLocked()).toBe(true);
    expect(specServiceSpy.getProgress).not.toHaveBeenCalled();
    expect(specServiceSpy.getSummary).not.toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should load normally once the unlock level is reached', () => {
    characterServiceSpy.getCharactersByAccount.mockReturnValue(
      of([
        { ...mockCharacter, level: SPECIALIZATION_UNLOCK_LEVEL } as Character,
      ]),
    );

    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.isLevelLocked()).toBe(false);
    expect(specServiceSpy.getProgress).toHaveBeenCalledWith('char1');
  });

  it('should load character and specialization data on init', () => {
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.accountHandle).toBe('Test#1234');
    expect(component.characterHandle).toBe('Seven');
    expect(component.characterId).toBe('char1');
    expect(specServiceSpy.getProgress).toHaveBeenCalledWith('char1');
    expect(component.progress()).toHaveLength(2);
    expect(component.summary()).toEqual(mockSummary);
    expect(component.isLoading).toBe(false);
  });

  it('should handle initial load failure', () => {
    specServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );

    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });

    expect(component.errorMessage).toBe('Failed to load specialization data');
    expect(component.isLoading).toBe(false);
  });

  it('should load progress independently and handle error', () => {
    component.characterId = 'char1';

    component.loadProgress();
    expect(component.progress()).toHaveLength(2);

    specServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );
    component.loadProgress();
    expect(component.errorMessage).toBe(
      'Failed to load specialization progress',
    );
  });

  it('should group filtered rows by specialization type', () => {
    component.progress.set(mockProgress);

    const groups = component.groupedProgress();

    expect(groups).toHaveLength(2);
    expect(groups[0].type).toBe('primary');
    expect(groups[0].items.map(i => i.specializationId)).toEqual(['spec1']);
    expect(groups[1].type).toBe('secondary');
    expect(groups[1].items.map(i => i.specializationId)).toEqual(['spec2']);
  });

  it('should toggle the briefing open and closed', () => {
    expect(component.briefingCollapsed()).toBe(false);

    component.toggleBriefing();
    expect(component.briefingCollapsed()).toBe(true);

    component.toggleBriefing();
    expect(component.briefingCollapsed()).toBe(false);
  });

  it('should collapse and expand each specialization group independently', () => {
    expect(component.isGroupCollapsed('primary')).toBe(false);
    expect(component.isGroupCollapsed('secondary')).toBe(false);

    component.toggleGroup('primary');
    expect(component.isGroupCollapsed('primary')).toBe(true);
    expect(component.isGroupCollapsed('secondary')).toBe(false);

    component.toggleGroup('secondary');
    expect(component.isGroupCollapsed('primary')).toBe(true);
    expect(component.isGroupCollapsed('secondary')).toBe(true);

    component.toggleGroup('primary');
    expect(component.isGroupCollapsed('primary')).toBe(false);
    expect(component.isGroupCollapsed('secondary')).toBe(true);
  });

  it('should hide a collapsed group list but keep its heading bar', async () => {
    component.isLoading = false;
    component.progress.set([...mockProgress]);
    component.summary.set(mockSummary);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.spec-list')).toHaveLength(
      2,
    );

    component.toggleGroup('primary');
    fixture.detectChanges();

    // The heading bars both remain so the group can be expanded again
    expect(fixture.nativeElement.querySelectorAll('.spec-list')).toHaveLength(
      1,
    );
    expect(
      fixture.nativeElement.textContent.includes('Primary Specializations'),
    ).toBe(true);
  });

  it('should drop empty groups when a filter excludes every member', () => {
    component.progress.set(mockProgress);
    component.searchText.set('strategist');

    const groups = component.groupedProgress();

    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe('secondary');
  });

  it('should expose the per-specialization point maximum', () => {
    expect(component.maxPoints(mockProgress[0])).toBe(30);
    expect(component.maxPoints(mockProgress[1])).toBe(15);
  });

  it('should expose the qualification milestone for primary types only', () => {
    expect(component.qualificationMilestone(mockProgress[0])).toBe(10);
    expect(component.qualificationMilestone(mockProgress[1])).toBeNull();
  });

  it('should exclude the qualification milestone from the point ticks', () => {
    const primaryTicks = component.pointTicks(mockProgress[0]);
    expect(primaryTicks).not.toContain(10);
    expect(primaryTicks).toHaveLength(28);

    // Secondary-only specializations have no milestone, so no tick is skipped
    expect(component.pointTicks(mockProgress[1])).toHaveLength(14);
  });

  it('should set points and clear the saving flag on success', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    component.setPoints(mockProgress[0], 20);

    expect(specServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'spec1',
      20,
    );
    expect(component.savingItemId()).toBeNull();
  });

  it('should clamp points to the specialization maximum and skip no-ops', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    // Above the secondary-only maximum clamps to 15, not 30
    component.setPoints({ ...mockProgress[1], pointsSpent: 7 }, 99);
    expect(specServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'spec2',
      15,
    );

    specServiceSpy.updateProgress.mockClear();
    // Same value is a no-op
    component.setPoints(mockProgress[0], 12);
    expect(specServiceSpy.updateProgress).not.toHaveBeenCalled();

    // Below zero clamps to 0
    component.setPoints(mockProgress[0], -5);
    expect(specServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'spec1',
      0,
    );
  });

  it('should set the points from the native range input', () => {
    component.characterId = 'char1';
    const setSpy = jest.spyOn(component, 'setPoints');

    const input = { value: '20' } as HTMLInputElement;
    component.onRangeChange(mockProgress[0], {
      target: input,
    } as unknown as Event);

    expect(setSpy).toHaveBeenCalledWith(mockProgress[0], 20);
  });

  it('should clear saving state on points update error', () => {
    component.characterId = 'char1';
    specServiceSpy.updateProgress.mockReturnValue(
      throwError(() => new Error('save fail')),
    );

    component.setPoints(mockProgress[0], 5);

    expect(component.savingItemId()).toBeNull();
  });

  it('should offer only primary-capable specializations in the primary slot', () => {
    component.progress.set([
      { ...mockProgress[0], slot: null },
      { ...mockProgress[1], slot: null },
    ]);

    expect(component.primaryOptions().map(o => o.specializationId)).toEqual([
      'spec1',
    ]);
  });

  it('should offer every specialization in the secondary slot', () => {
    component.progress.set([
      { ...mockProgress[0], slot: null },
      { ...mockProgress[1], slot: null },
    ]);

    expect(component.secondaryOptions().map(o => o.specializationId)).toEqual([
      'spec1',
      'spec2',
    ]);
  });

  it('should exclude the specialization held by the other slot from the options', () => {
    // Intelligence Officer holds primary, Strategist holds secondary
    component.progress.set([...mockProgress]);

    expect(component.primaryOptions().map(o => o.specializationId)).toEqual([
      'spec1',
    ]);
    expect(component.secondaryOptions().map(o => o.specializationId)).toEqual([
      'spec2',
    ]);
  });

  it('should expose the current selection for each slot', () => {
    component.progress.set([...mockProgress]);

    expect(component.primarySelectionId()).toBe('spec1');
    expect(component.secondarySelectionId()).toBe('spec2');
  });

  it('should expose an empty selection when a slot is unfilled', () => {
    component.progress.set(mockProgress.map(p => ({ ...p, slot: null })));

    expect(component.primarySelectionId()).toBe('');
    expect(component.secondarySelectionId()).toBe('');
  });

  it('should assign a slot and release it from the specialization that held it', () => {
    component.characterId = 'char1';
    component.progress.set([...mockProgress]);

    // Move the secondary slot from Strategist onto Intelligence Officer
    component.setSlot('secondary', 'spec1');

    expect(specServiceSpy.updateSlot).toHaveBeenCalledWith(
      'char1',
      'spec1',
      'secondary',
    );
    expect(component.progress()[0].slot).toBe('secondary');
    expect(component.progress()[1].slot).toBeNull();
    expect(component.savingSlot()).toBeNull();
  });

  it('should clear the slot when the empty option is chosen', () => {
    component.characterId = 'char1';
    component.progress.set([...mockProgress]);

    component.setSlot('primary', '');

    expect(specServiceSpy.updateSlot).toHaveBeenCalledWith(
      'char1',
      'spec1',
      null,
    );
    expect(component.progress()[0].slot).toBeNull();
  });

  it('should ignore clearing a slot that is already empty', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress.map(p => ({ ...p, slot: null })));

    component.setSlot('primary', '');

    expect(specServiceSpy.updateSlot).not.toHaveBeenCalled();
  });

  it('should ignore an unknown specialization id', () => {
    component.characterId = 'char1';
    component.progress.set([...mockProgress]);

    component.setSlot('secondary', 'missing-spec');

    expect(specServiceSpy.updateSlot).not.toHaveBeenCalled();
  });

  it('should refuse to slot a secondary-only specialization as primary', () => {
    component.characterId = 'char1';
    component.progress.set([...mockProgress]);

    component.setSlot('primary', 'spec2');

    expect(specServiceSpy.updateSlot).not.toHaveBeenCalled();
  });

  it('should preselect the slotted specialization in each dropdown', async () => {
    component.isLoading = false;
    component.progress.set([...mockProgress]);
    component.summary.set(mockSummary);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const primary: HTMLSelectElement =
      fixture.nativeElement.querySelector('#spec-slot-primary');
    const secondary: HTMLSelectElement = fixture.nativeElement.querySelector(
      '#spec-slot-secondary',
    );

    expect(primary.options[primary.selectedIndex].textContent?.trim()).toBe(
      'Intelligence Officer',
    );
    expect(secondary.options[secondary.selectedIndex].textContent?.trim()).toBe(
      'Strategist',
    );
  });

  it('should clear saving state on slot update error', () => {
    component.characterId = 'char1';
    component.progress.set([...mockProgress]);
    specServiceSpy.updateSlot.mockReturnValue(
      throwError(() => new Error('slot fail')),
    );

    component.setSlot('secondary', 'spec1');

    expect(component.savingSlot()).toBeNull();
  });

  it('should label the slot a specialization currently holds', () => {
    expect(component.slotLabel(mockProgress[0])).toBe('Primary');
    expect(component.slotLabel(mockProgress[1])).toBe('Secondary');
    expect(component.slotLabel({ ...mockProgress[0], slot: null })).toBeNull();
  });

  it('should map specializations to Font Awesome icons with a fallback', () => {
    expect(component.specializationIcon(mockProgress[0])).toBe(
      'fa-user-secret',
    );
    expect(
      component.specializationIcon({
        ...mockProgress[0],
        specialization: {
          ...mockProgress[0].specialization,
          name: 'Unknown Specialization',
        },
      }),
    ).toBe('fa-certificate');
  });

  it('should filter by hide-complete and search text', () => {
    component.progress.set(mockProgress);

    component.hideComplete.set(true);
    expect(component.filteredProgress()).toHaveLength(1);

    component.hideComplete.set(false);
    component.searchText.set('intelligence');
    expect(component.filteredProgress()).toHaveLength(1);
  });

  it('should resolve accent colour and fall back when absent', () => {
    expect(component.accent(mockProgress[0])).toBe('#16a085');
    expect(component.accent(mockProgress[1])).toBe('#fa0');
  });

  it('should track icon load failures and gate icon display', () => {
    expect(component.showIcon(mockProgress[0])).toBe(true);
    // Strategist has no iconUrl
    expect(component.showIcon(mockProgress[1])).toBe(false);

    component.onIconError('spec1');
    expect(component.showIcon(mockProgress[0])).toBe(false);
  });

  it('should complete destroy stream on destroy', () => {
    const nextSpy = jest.spyOn(component['_destroy$'], 'next');
    const completeSpy = jest.spyOn(component['_destroy$'], 'complete');
    component.ngOnDestroy();
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
