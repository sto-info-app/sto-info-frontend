import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Character } from 'src/app/dashboard/models/character.model';
import {
  ADMIRALTY_MAX_TIER,
  ADMIRALTY_MAX_TOUR_STEP,
  ADMIRALTY_UNLOCK_LEVEL,
  CharacterAdmiraltyProgress,
  CharacterAdmiraltySummary,
} from 'src/app/dashboard/models/character-admiralty.model';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { CharacterService } from 'src/app/dashboard/services/character.service';
import { CharacterAdmiraltyService } from 'src/app/dashboard/services/character-admiralty.service';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { CharacterAdmiraltyComponent } from './character-admiralty.component';

describe('CharacterAdmiraltyComponent', () => {
  let component: CharacterAdmiraltyComponent;
  let fixture: ComponentFixture<CharacterAdmiraltyComponent>;
  let routeParams$: Subject<Params>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let characterServiceSpy: jest.Mocked<CharacterService>;
  let admiraltyServiceSpy: jest.Mocked<CharacterAdmiraltyService>;

  const mockAccount = {
    id: 'acc1',
    handle: 'Test#1234',
  } as StoAccount;

  const mockCharacter = {
    id: 'char1',
    handle: 'Seven',
  } as Character;

  const mockProgress: CharacterAdmiraltyProgress[] = [
    {
      id: 'p1',
      characterId: 'char1',
      campaignId: 'camp1',
      campaign: {
        id: 'camp1',
        name: 'United Federation of Planets',
        description: 'Tour reward: 2 Specialization Points.',
        iconUrl: '/assets/admiralty/federation.png',
        // Light enough to carry black on a panel heading.
        accentColor: '#4b84c4',
        sortOrder: 10,
      },
      currentTier: 4,
      tourOfDutyStep: 2,
      status: 'in_progress',
      completionPercentage: 40,
    },
    {
      id: 'p2',
      characterId: 'char1',
      campaignId: 'camp2',
      campaign: {
        id: 'camp2',
        name: 'Klingon Empire',
        description: null,
        iconUrl: null,
        accentColor: null,
        sortOrder: 20,
      },
      currentTier: 10,
      tourOfDutyStep: 10,
      status: 'complete',
      completionPercentage: 100,
    },
  ];

  const mockSummary: CharacterAdmiraltySummary = {
    totalTiers: 14,
    maxPossibleTiers: 20,
    completedCampaigns: 1,
    totalCampaigns: 2,
    totalTourSteps: 12,
    maxPossibleTourSteps: 20,
    overallCompletionPercentage: 70,
  };

  /** Drives the route far enough for the component to resolve its captain. */
  const loadCharacter = (): void => {
    fixture.detectChanges();
    routeParams$.next({ handle: 'Test~1234', characterHandle: 'Seven' });
  };

  beforeEach(async () => {
    routeParams$ = new Subject<Params>();

    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
    } as unknown as jest.Mocked<StoAccountService>;

    characterServiceSpy = {
      getCharactersByAccount: jest.fn().mockReturnValue(of([mockCharacter])),
    } as unknown as jest.Mocked<CharacterService>;

    admiraltyServiceSpy = {
      getProgress: jest.fn().mockReturnValue(of(mockProgress)),
      getSummary: jest.fn().mockReturnValue(of(mockSummary)),
      updateProgress: jest
        .fn()
        .mockImplementation(
          (_characterId, campaignId, currentTier, tourOfDutyStep) => {
            const existing = mockProgress.find(
              p => p.campaignId === campaignId,
            )!;
            return of({
              ...existing,
              currentTier,
              tourOfDutyStep,
            } as CharacterAdmiraltyProgress);
          },
        ),
    } as unknown as jest.Mocked<CharacterAdmiraltyService>;

    await TestBed.configureTestingModule({
      imports: [CharacterAdmiraltyComponent],
      providers: [
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: CharacterService, useValue: characterServiceSpy },
        { provide: CharacterAdmiraltyService, useValue: admiraltyServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { params: routeParams$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterAdmiraltyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.featureName).toBe('Admiralty');
    expect(component.maxTier).toBe(ADMIRALTY_MAX_TIER);
    expect(component.maxTourStep).toBe(ADMIRALTY_MAX_TOUR_STEP);
    expect(component.unlockLevel).toBe(ADMIRALTY_UNLOCK_LEVEL);
    expect(component.steps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('should load campaign progress and summary on init', () => {
    loadCharacter();

    expect(component.characterId).toBe('char1');
    expect(admiraltyServiceSpy.getProgress).toHaveBeenCalledWith('char1');
    expect(admiraltyServiceSpy.getSummary).toHaveBeenCalledWith('char1');
    expect(component.progress()).toHaveLength(2);
    expect(component.summary()).toEqual(mockSummary);
    expect(component.isLoading).toBe(false);
  });

  it('should skip loading below the unlock level', () => {
    characterServiceSpy.getCharactersByAccount.mockReturnValue(
      of([
        { ...mockCharacter, level: ADMIRALTY_UNLOCK_LEVEL - 1 } as Character,
      ]),
    );

    loadCharacter();

    expect(component.isLevelLocked()).toBe(true);
    expect(admiraltyServiceSpy.getProgress).not.toHaveBeenCalled();
  });

  it('should report an Admiralty-specific initial load failure', () => {
    admiraltyServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );

    loadCharacter();

    expect(component.errorMessage).toBe('Failed to load Admiralty data');
    expect(component.isLoading).toBe(false);
  });

  it('should report an Admiralty-specific refresh failure', () => {
    component.characterId = 'char1';
    admiraltyServiceSpy.getProgress.mockReturnValue(
      throwError(() => new Error('progress fail')),
    );

    component.loadProgress();

    expect(component.errorMessage).toBe('Failed to load Admiralty progress');
    expect(component.isLoading).toBe(false);
  });

  it('should describe a campaign from its catalogue entry', () => {
    const internal = component as unknown as {
      itemName: (item: CharacterAdmiraltyProgress) => string;
      itemIconUrl: (item: CharacterAdmiraltyProgress) => string | null;
      itemAccent: (item: CharacterAdmiraltyProgress) => string | null;
    };

    expect(component.itemId(mockProgress[0])).toBe('camp1');
    expect(internal.itemName(mockProgress[0])).toBe(
      'United Federation of Planets',
    );
    expect(internal.itemIconUrl(mockProgress[0])).toBe(
      '/assets/admiralty/federation.png',
    );
    expect(internal.itemIconUrl(mockProgress[1])).toBeNull();
    expect(internal.itemAccent(mockProgress[0])).toBe('#4b84c4');
    expect(internal.itemAccent(mockProgress[1])).toBeNull();
  });

  it('should split a reward description into its label and value', () => {
    expect(component.rewardParts(mockProgress[0])).toEqual({
      label: 'Tour reward',
      value: '2 Specialization Points.',
    });
  });

  it('should treat a description with no colon as all value', () => {
    const item = {
      ...mockProgress[0],
      campaign: { ...mockProgress[0].campaign, description: '2 Tech Upgrades' },
    };

    expect(component.rewardParts(item)).toEqual({
      label: null,
      value: '2 Tech Upgrades',
    });
  });

  it('should return an empty reward when a campaign has no description', () => {
    expect(component.rewardParts(mockProgress[1])).toEqual({
      label: null,
      value: '',
    });
  });

  it('should save the tier that was pressed', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    component.selectTier(mockProgress[0], 7);

    expect(admiraltyServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'camp1',
      7,
      2,
    );
    expect(component.savingItemId()).toBeNull();
  });

  it('should step the tier back when the current one is pressed again', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    component.selectTier(mockProgress[0], 4);

    expect(admiraltyServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'camp1',
      3,
      2,
    );
  });

  it('should save the tour step that was pressed and merge the response', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    component.selectTourStep(mockProgress[0], 6);

    expect(admiraltyServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'camp1',
      4,
      6,
    );
    expect(component.progress()[0].tourOfDutyStep).toBe(6);
    expect(admiraltyServiceSpy.getSummary).toHaveBeenCalledWith('char1');
    expect(component.savingItemId()).toBeNull();
  });

  it('should leave the other campaigns alone when one is saved', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    component.selectTourStep(mockProgress[0], 6);

    expect(component.progress()[1]).toEqual(mockProgress[1]);
  });

  it('should step the tour back when the current step is pressed again', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);

    component.selectTourStep(mockProgress[0], 2);

    expect(admiraltyServiceSpy.updateProgress).toHaveBeenCalledWith(
      'char1',
      'camp1',
      4,
      1,
    );
  });

  it('should clear the saving state when a tour step fails to save', () => {
    component.characterId = 'char1';
    component.progress.set(mockProgress);
    admiraltyServiceSpy.updateProgress.mockReturnValue(
      throwError(() => new Error('save fail')),
    );

    component.selectTourStep(mockProgress[0], 6);

    expect(component.savingItemId()).toBeNull();
    expect(component.progress()[0].tourOfDutyStep).toBe(2);
  });

  it('should resolve a campaign accent and fall back when absent', () => {
    expect(component.accent(mockProgress[0])).toBe('#4b84c4');
    expect(component.accent(mockProgress[1])).toBe('#fa0');
  });

  it('should set black on a light accent and white on a dark one', () => {
    // The seeded Federation blue and Klingon red sit either side of the
    // crossover, and are the pair the panel headings actually have to carry.
    expect(component.accentTextColor(mockProgress[0])).toBe('#0d0d0d');

    const klingon = {
      ...mockProgress[0],
      campaign: { ...mockProgress[0].campaign, accentColor: '#b33a3a' },
    };

    expect(component.accentTextColor(klingon)).toBe('#fff');
  });

  it('should set white on an accent dark enough to take the linear ramp', () => {
    const nearBlack = {
      ...mockProgress[0],
      campaign: { ...mockProgress[0].campaign, accentColor: '#0a0a0a' },
    };

    expect(component.accentTextColor(nearBlack)).toBe('#fff');
  });

  it('should fall back to white when an accent cannot be read', () => {
    const broken = {
      ...mockProgress[0],
      campaign: { ...mockProgress[0].campaign, accentColor: '#12' },
    };

    expect(component.accentTextColor(broken)).toBe('#fff');
  });

  it('should render a panel for every campaign', () => {
    loadCharacter();
    fixture.detectChanges();

    const panels: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.admiralty-panel'),
    );

    expect(panels).toHaveLength(2);
    expect(
      panels[0].querySelector('.admiralty-panel__name')!.textContent,
    ).toContain('United Federation of Planets');
    // Only the completed campaign is badged on its heading bar.
    expect(
      fixture.nativeElement.querySelectorAll('.admiralty-panel__badge'),
    ).toHaveLength(1);
    // The campaign with no description gets no reward strip.
    expect(
      fixture.nativeElement.querySelectorAll('.admiralty-panel__reward'),
    ).toHaveLength(1);
  });
});
