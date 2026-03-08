import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { StatsService } from '../services/stats.service';
import { StatsComponent, StatsData } from './stats.component';

describe('StatsComponent', () => {
  let component: StatsComponent;
  let fixture: ComponentFixture<StatsComponent>;
  let statsServiceSpy: jest.Mocked<StatsService>;
  let routingServiceSpy: jest.Mocked<RoutingService>;

  const mockStats: StatsData = {
    accountCount: 2,
    lifetimeSubCount: 1,
    characterCount: 5,
    avgLevel: 60,
    minLevel: 10,
    maxLevel: 65,
    bySpecies: [{ name: 'Human', count: 3 }],
    byGeneralFaction: [{ name: 'Federation', count: 5 }],
    byFaction: [{ name: 'Starfleet', count: 5 }],
    byClass: [{ name: 'Tactical', count: 3 }],
    bySex: [{ name: 'Male', count: 3 }],
    byRecruitType: [{ name: 'Normal', count: 5 }],
    byLevelRange: [{ name: 'Admiral (60–65)', count: 3 }],
    byPlatform: [{ name: 'Steam', count: 2 }],
    byLauncher: [{ name: 'Steam', count: 2 }],
  };

  beforeEach(async () => {
    statsServiceSpy = {
      getStats: jest.fn().mockReturnValue(of(mockStats)),
    } as unknown as jest.Mocked<StatsService>;

    routingServiceSpy = {
      getLink: jest.fn().mockReturnValue('/mock-route'),
    } as unknown as jest.Mocked<RoutingService>;

    await TestBed.configureTestingModule({
      imports: [StatsComponent],
      providers: [
        { provide: StatsService, useValue: statsServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        provideRouter([]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load stats on init', () => {
    component.ngOnInit();

    expect(statsServiceSpy.getStats).toHaveBeenCalled();
    expect(component.stats).toEqual(mockStats);
    expect(component.isLoading).toBe(false);
  });

  it('should expose 9 stat tiles', () => {
    expect(component.statTiles.length).toBe(9);
  });

  it('should set isLoading false and stats null on error', () => {
    statsServiceSpy.getStats.mockReturnValue(
      throwError(() => new Error('API error')),
    );
    component.ngOnInit();

    expect(component.isLoading).toBe(false);
    expect(component.stats).toBeNull();
  });

  it('should return route link from routing service', () => {
    const link = component.getRouteLink('some-route');
    expect(routingServiceSpy.getLink).toHaveBeenCalledWith('some-route');
    expect(link).toBe('/mock-route');
  });

  it('should build detail link with breakdownId substituted', () => {
    routingServiceSpy.getLink.mockReturnValue('/dashboard/stats/species');
    const link = component.getDetailLink('species');
    expect(link).toBe('/dashboard/stats/species');
  });

  describe('ngOnDestroy', () => {
    it('should complete the destroy$ subject', () => {
      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
