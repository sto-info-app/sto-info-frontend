import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { StatsService } from '../../services/stats.service';
import { StatsData } from '../stats.component';
import { StatDetailComponent } from './stat-detail.component';

describe('StatDetailComponent', () => {
  let component: StatDetailComponent;
  let fixture: ComponentFixture<StatDetailComponent>;
  let statsServiceSpy: jest.Mocked<StatsService>;
  let routingServiceSpy: jest.Mocked<RoutingService>;

  const mockStats: StatsData = {
    accountCount: 2,
    lifetimeSubCount: 1,
    characterCount: 5,
    avgLevel: 60,
    minLevel: 10,
    maxLevel: 65,
    bySpecies: [
      { name: 'Human', count: 3 },
      { name: 'Vulcan', count: 2 },
    ],
    byGeneralFaction: [{ name: 'Federation', count: 5 }],
    byFaction: [{ name: 'Starfleet', count: 5 }],
    byClass: [
      { name: 'Tactical', count: 3 },
      { name: 'Science', count: 2 },
    ],
    bySex: [
      { name: 'Male', count: 3 },
      { name: 'Female', count: 2 },
    ],
    byRecruitType: [{ name: 'Normal', count: 5 }],
    byLevelRange: [
      { name: 'Admiral (60–65)', count: 3 },
      { name: 'Vice Admiral (50–59)', count: 2 },
    ],
    byPlatform: [{ name: 'Steam', count: 2 }],
    byLauncher: [{ name: 'Steam', count: 2 }],
  };

  const createComponent = async (breakdownId: string) => {
    await TestBed.configureTestingModule({
      imports: [StatDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ breakdownId }) },
          },
        },
        { provide: StatsService, useValue: statsServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StatDetailComponent);
    component = fixture.componentInstance;
  };

  beforeEach(() => {
    statsServiceSpy = {
      getStats: jest.fn().mockReturnValue(of(mockStats)),
    } as unknown as jest.Mocked<StatsService>;

    routingServiceSpy = {
      getLink: jest.fn().mockReturnValue('/mock-route'),
    } as unknown as jest.Mocked<RoutingService>;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    await createComponent('species');
    expect(component).toBeTruthy();
  });

  it('should load species breakdown correctly', async () => {
    await createComponent('species');
    component.ngOnInit();

    expect(component.config?.title).toBe('Species');
    expect(component.items).toEqual(mockStats.bySpecies);
    expect(component.isLoading).toBe(false);
  });

  it('should load level breakdown and set showLevelCards', async () => {
    await createComponent('level');
    component.ngOnInit();

    expect(component.config?.title).toBe('Level');
    expect(component.config?.showLevelCards).toBe(true);
    expect(component.items).toEqual(mockStats.byLevelRange);
  });

  it('should set config to null for unknown breakdownId', async () => {
    await createComponent('unknown-stat');
    component.ngOnInit();

    expect(component.config).toBeNull();
    expect(component.isLoading).toBe(false);
    expect(statsServiceSpy.getStats).not.toHaveBeenCalled();
  });

  it('should set isLoading false and stats null on error', async () => {
    statsServiceSpy.getStats.mockReturnValue(
      throwError(() => new Error('fail')),
    );
    await createComponent('career');
    component.ngOnInit();

    expect(component.isLoading).toBe(false);
    expect(component.stats).toBeNull();
  });

  describe('hideZeros functionality', () => {
    it('should default hideZeros to true', async () => {
      await createComponent('species');
      expect(component.hideZeros).toBe(true);
    });

    it('should return only non-zero items by default', async () => {
      await createComponent('species');
      component.ngOnInit();
      const nonZeros = mockStats.bySpecies.filter(i => i.count > 0).length;
      expect(component.displayedItems.length).toBe(nonZeros);
    });

    it('should filter items with 0 count when hideZeros is true', async () => {
      await createComponent('species');
      // Inject some 0-count items
      component.items = [
        { name: 'Human', count: 5 },
        { name: 'Gorn', count: 0 },
        { name: 'Klingon', count: 3 },
      ];

      component.hideZeros = true;
      expect(component.displayedItems.length).toBe(2);
      expect(component.displayedItems).not.toContainEqual(
        expect.objectContaining({ name: 'Gorn' }),
      );
    });

    it('should toggle hideZeros value', async () => {
      await createComponent('species');
      expect(component.hideZeros).toBe(true);
      component.toggleHideZeros();
      expect(component.hideZeros).toBe(false);
      component.toggleHideZeros();
      expect(component.hideZeros).toBe(true);
    });
  });

  it('should complete destroy$ on ngOnDestroy', async () => {
    await createComponent('species');
    const nextSpy = jest.spyOn(component['destroy$'], 'next');
    const completeSpy = jest.spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
