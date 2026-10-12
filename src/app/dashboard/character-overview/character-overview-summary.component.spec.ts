import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CharacterOverviewSummary } from '../models/character-overview.model';
import { CharacterOverviewService } from '../services/character-overview.service';
import { CharacterOverviewSummaryComponent } from './character-overview-summary.component';

describe('CharacterOverviewSummaryComponent', () => {
  let fixture: ComponentFixture<CharacterOverviewSummaryComponent>;
  let component: CharacterOverviewSummaryComponent;
  let serviceSpy: jest.Mocked<CharacterOverviewService>;

  const summary: CharacterOverviewSummary = {
    reputation: {
      totalTiers: 12,
      maxPossibleTiers: 60,
      overallCompletionPercentage: 20,
      completedReputations: 1,
      totalReputations: 10,
    },
    rd: {
      totalLevels: 30,
      maxPossibleLevels: 100,
      overallCompletionPercentage: 30,
      completedSchools: 0,
      totalSchools: 7,
    },
    specialization: {
      totalPoints: 40,
      maxPossiblePoints: 100,
      overallCompletionPercentage: 40,
      completedSpecializations: 1,
      totalSpecializations: 8,
      primarySpecializationName: null,
      secondarySpecializationName: null,
    },
    admiralty: {
      totalTiers: 20,
      maxPossibleTiers: 40,
      completedCampaigns: 1,
      totalCampaigns: 4,
      totalTourSteps: 3,
      maxPossibleTourSteps: 36,
      overallCompletionPercentage: 50,
    },
    commendation: {
      totalRanks: 6,
      maxPossibleRanks: 10,
      overallCompletionPercentage: 60,
      completedCommendations: 2,
      totalCommendations: 5,
    },
  };

  const cardLabels = (): string[] =>
    [...fixture.nativeElement.querySelectorAll('.overview-summary__name')].map(
      (el: HTMLElement) => el.textContent?.trim(),
    );

  const render = (
    inputs: { level?: number | null; faction?: string | null } = {},
  ): void => {
    // A null is a value under test, so only an omitted input takes the default.
    fixture.componentRef.setInput('characterId', 'char1');
    fixture.componentRef.setInput(
      'characterLevel',
      'level' in inputs ? inputs.level : 65,
    );
    fixture.componentRef.setInput(
      'generalFaction',
      'faction' in inputs ? inputs.faction : 'Federation',
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    serviceSpy = {
      getSummary: jest.fn().mockReturnValue(of(summary)),
    } as unknown as jest.Mocked<CharacterOverviewService>;

    await TestBed.configureTestingModule({
      imports: [CharacterOverviewSummaryComponent],
      providers: [{ provide: CharacterOverviewService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterOverviewSummaryComponent);
    component = fixture.componentInstance;
  });

  it('should fetch the summaries for the captain on init', () => {
    render();

    expect(serviceSpy.getSummary).toHaveBeenCalledWith('char1');
    expect(component.summary()).toEqual(summary);
    expect(component.isLoading()).toBe(false);
  });

  it('should show one card per tracker with its own percentage', () => {
    render();

    expect(cardLabels()).toEqual([
      'Reputations',
      'R&D',
      'Specializations',
      'Admiralty',
      'Commendations',
    ]);
    const values = [
      ...fixture.nativeElement.querySelectorAll('.overview-summary__value'),
    ].map((el: HTMLElement) => el.textContent?.trim());
    expect(values).toEqual(['20%', '30%', '40%', '50%', '60%']);
  });

  it('should mark each card with its tracker, for its colour', () => {
    render();

    const classes = [
      ...fixture.nativeElement.querySelectorAll('.overview-summary__card'),
    ].map((el: HTMLElement) => el.className);
    expect(classes).toEqual([
      'overview-summary__card overview-summary__card--reputations',
      'overview-summary__card overview-summary__card--rd',
      'overview-summary__card overview-summary__card--specializations',
      'overview-summary__card overview-summary__card--admiralty',
      'overview-summary__card overview-summary__card--commendations',
    ]);
  });

  it('should size each bar to its percentage', () => {
    render();

    const fills = [
      ...fixture.nativeElement.querySelectorAll('.overview-summary__fill'),
    ].map((el: HTMLElement) => el.style.width);
    expect(fills).toEqual(['20%', '30%', '40%', '50%', '60%']);
  });

  // The same gates the tabs apply: a known level below the unlock hides the
  // card rather than showing it at nought.
  it('should hide the trackers a low-level captain has not unlocked', () => {
    render({ level: 20 });

    expect(cardLabels()).toEqual(['R&D', 'Commendations']);
  });

  it('should hide every tracker for a brand new captain', () => {
    render({ level: 1 });

    expect(cardLabels()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.overview-summary')).toBeNull();
  });

  it('should never lock on an unknown level', () => {
    render({ level: null });

    expect(cardLabels()).toHaveLength(5);
  });

  it('should hide Commendations for an allegiance without a catalogue', () => {
    render({ faction: 'Romulan' });

    expect(cardLabels()).toEqual([
      'Reputations',
      'R&D',
      'Specializations',
      'Admiralty',
    ]);
  });

  it('should hide Commendations when no allegiance was recorded', () => {
    render({ faction: null });

    expect(cardLabels()).not.toContain('Commendations');
  });

  it('should re-gate the cards when the level changes without refetching', () => {
    render();
    serviceSpy.getSummary.mockClear();

    fixture.componentRef.setInput('characterLevel', 20);
    fixture.detectChanges();

    expect(cardLabels()).toEqual(['R&D', 'Commendations']);
    expect(serviceSpy.getSummary).not.toHaveBeenCalled();
  });

  it('should re-gate the cards when only the allegiance changes', () => {
    render();

    fixture.componentRef.setInput('generalFaction', 'Romulan');
    fixture.detectChanges();

    expect(cardLabels()).not.toContain('Commendations');
  });

  // The first change is what init loads from, not a refetch or a re-gate. A
  // captain id alone leaves the level unknown, which locks nothing, and the
  // allegiance unrecorded, which hides Commendations.
  it('should gate on the defaults when only the captain id is set', () => {
    fixture.componentRef.setInput('characterId', 'char1');
    fixture.detectChanges();

    expect(serviceSpy.getSummary).toHaveBeenCalledTimes(1);
    expect(cardLabels()).toEqual([
      'Reputations',
      'R&D',
      'Specializations',
      'Admiralty',
    ]);
  });

  it('should refetch when the captain changes', () => {
    render();

    fixture.componentRef.setInput('characterId', 'char2');
    fixture.detectChanges();

    expect(serviceSpy.getSummary).toHaveBeenLastCalledWith('char2');
  });

  it('should ask for the tab a card is pressed for', () => {
    render();
    const emitted: string[] = [];
    component.openTab.subscribe(tab => emitted.push(tab));

    const cards: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('.overview-summary__card'),
    ];
    cards[3].click();

    expect(emitted).toEqual(['admiralty']);
    expect(cards[3].getAttribute('aria-label')).toBe(
      'Open Admiralty, 50% complete',
    );
  });

  it('should refetch on reload', () => {
    render();

    component.reload();

    expect(serviceSpy.getSummary).toHaveBeenCalledTimes(2);
  });

  it('should drop a stale answer when a reload overtakes it', () => {
    const first$ = new Subject<CharacterOverviewSummary>();
    serviceSpy.getSummary.mockReturnValueOnce(first$.asObservable());
    render();
    expect(component.isLoading()).toBe(true);

    component.reload();
    first$.next({
      ...summary,
      admiralty: { ...summary.admiralty, overallCompletionPercentage: 1 },
    });
    fixture.detectChanges();

    expect(component.summary()?.admiralty.overallCompletionPercentage).toBe(50);
  });

  it('should say so when the summaries cannot be loaded', () => {
    serviceSpy.getSummary.mockReturnValue(throwError(() => new Error('nope')));

    render();

    expect(component.hasFailed()).toBe(true);
    expect(component.isLoading()).toBe(false);
    expect(cardLabels()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'Progress summaries could not be loaded.',
    );
  });

  it('should clear a failure once a reload succeeds', () => {
    serviceSpy.getSummary.mockReturnValueOnce(
      throwError(() => new Error('nope')),
    );
    render();

    component.reload();
    fixture.detectChanges();

    expect(component.hasFailed()).toBe(false);
    expect(cardLabels()).toHaveLength(5);
  });
});
