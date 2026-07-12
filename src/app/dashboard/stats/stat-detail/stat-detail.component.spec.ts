import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { StoAccount } from 'src/app/dashboard/models/sto-account.model';
import { StoAccountService } from 'src/app/dashboard/services/sto-account.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { StatsService } from '../../services/stats.service';
import { StatsData } from '../stats.models';
import { StatDetailComponent } from './stat-detail.component';

describe('StatDetailComponent', () => {
  let component: StatDetailComponent;
  let fixture: ComponentFixture<StatDetailComponent>;
  let statsServiceSpy: jest.Mocked<StatsService>;
  let routingServiceSpy: jest.Mocked<RoutingService>;
  let stoAccountServiceSpy: jest.Mocked<StoAccountService>;
  let routerSpy: jest.Mocked<Router>;

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
    endeavourTotalNodes: 120,
    endeavourMaxNodes: 720,
    byEndeavourPerk: [{ name: 'Hull Capacity', count: 18 }],
    byEndeavourPerkAvg: [{ name: 'Hull Capacity', count: 6 }],
    byEndeavourCategory: [{ name: 'Space', count: 80 }],
    byEndeavourCategoryPct: [{ name: 'Space', count: 67 }],
  };

  const mockAccount = {
    id: 'acc1',
    handle: 'Test#1234',
  } as unknown as StoAccount;

  const createComponent = async (breakdownId: string) => {
    await TestBed.configureTestingModule({
      imports: [StatDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ breakdownId })),
            snapshot: { paramMap: convertToParamMap({ breakdownId }) },
          },
        },
        { provide: StatsService, useValue: statsServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StatDetailComponent);
    component = fixture.componentInstance;
  };

  const createComponentNoParam = async () => {
    await TestBed.configureTestingModule({
      imports: [StatDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: { paramMap: convertToParamMap({}) },
          },
        },
        { provide: StatsService, useValue: statsServiceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: StoAccountService, useValue: stoAccountServiceSpy },
        { provide: Router, useValue: routerSpy },
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

    stoAccountServiceSpy = {
      getAccounts: jest.fn().mockReturnValue(of([mockAccount])),
    } as unknown as jest.Mocked<StoAccountService>;

    routerSpy = {
      navigateByUrl: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<Router>;
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

  it('should treat missing breakdownId param as empty string (config null)', async () => {
    await createComponentNoParam();
    component.ngOnInit();

    expect(component.config).toBeNull();
    expect(component.isLoading).toBe(false);
    expect(statsServiceSpy.getStats).not.toHaveBeenCalled();
  });

  it('should not update items when config is null during loadStats callback', async () => {
    await createComponent('species');
    // loadStats with config=null exercises the false branch of "if (this.config)"
    component.config = null;
    component.loadStats();

    // items should not be populated since config is null
    expect(component.items).toEqual([]);
    expect(component.isLoading).toBe(false);
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
    const nextSpy = jest.spyOn(component['_destroy$'], 'next');
    const completeSpy = jest.spyOn(component['_destroy$'], 'complete');

    component.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  describe('displayedItems when hideZeros is false', () => {
    it('should return all items including zeros', async () => {
      await createComponent('species');
      component.items = [
        { name: 'Human', count: 5 },
        { name: 'Gorn', count: 0 },
        { name: 'Klingon', count: 3 },
      ];
      component.hideZeros = false;
      expect(component.displayedItems.length).toBe(3);
      expect(component.displayedItems).toContainEqual(
        expect.objectContaining({ name: 'Gorn' }),
      );
    });
  });

  describe('hasZeros', () => {
    it('should return true when at least one item has count 0', async () => {
      await createComponent('species');
      component.items = [
        { name: 'Human', count: 5 },
        { name: 'Gorn', count: 0 },
      ];
      expect(component.hasZeros).toBe(true);
    });

    it('should return false when all items have count greater than 0', async () => {
      await createComponent('species');
      component.items = [
        { name: 'Human', count: 5 },
        { name: 'Klingon', count: 3 },
      ];
      expect(component.hasZeros).toBe(false);
    });

    it('should return false when items is empty', async () => {
      await createComponent('species');
      component.items = [];
      expect(component.hasZeros).toBe(false);
    });
  });

  describe('hasData', () => {
    it('should return true when any item has count > 0', async () => {
      await createComponent('species');
      component.items = [
        { name: 'Human', count: 0 },
        { name: 'Klingon', count: 3 },
      ];
      expect(component.hasData).toBe(true);
    });

    it('should return false when all items have count 0', async () => {
      await createComponent('species');
      component.items = [
        { name: 'Human', count: 0 },
        { name: 'Klingon', count: 0 },
      ];
      expect(component.hasData).toBe(false);
    });

    it('should return false when items is empty', async () => {
      await createComponent('species');
      component.items = [];
      expect(component.hasData).toBe(false);
    });
  });

  describe('loadAccounts', () => {
    it('should populate accounts from service', async () => {
      await createComponent('species');
      component.ngOnInit();
      expect(stoAccountServiceSpy.getAccounts).toHaveBeenCalled();
      expect(component.accounts).toEqual([mockAccount]);
    });
  });

  describe('onAccountChange', () => {
    it('should update selectedAccountId and reload stats', async () => {
      await createComponent('species');
      component.ngOnInit();
      statsServiceSpy.getStats.mockClear();

      component.onAccountChange('acc1');

      expect(component.selectedAccountId).toBe('acc1');
      expect(statsServiceSpy.getStats).toHaveBeenCalledWith('acc1');
    });

    it('should pass null to getStats when "all" is selected', async () => {
      await createComponent('species');
      component.ngOnInit();
      statsServiceSpy.getStats.mockClear();

      component.onAccountChange('all');

      expect(statsServiceSpy.getStats).toHaveBeenCalledWith(null);
    });
  });

  describe('ngOnInit branch coverage', () => {
    it('should pass selectedAccountId (non-all) to getStats in ngOnInit', async () => {
      await createComponent('species');
      component.selectedAccountId = 'acc1';
      statsServiceSpy.getStats.mockReturnValue(of(mockStats));

      component.ngOnInit();

      expect(statsServiceSpy.getStats).toHaveBeenCalledWith('acc1');
    });

    it('should not set items when config becomes null before stats load completes', async () => {
      const statsSubject = new Subject<StatsData>();
      statsServiceSpy.getStats.mockReturnValue(statsSubject.asObservable());

      await createComponent('species');
      component.ngOnInit();

      // Clear config after ngOnInit has started the request but before stats arrive
      component.config = null;

      statsSubject.next(mockStats);
      statsSubject.complete();

      expect(component.items).toEqual([]);
      expect(component.isLoading).toBe(false);
    });
  });

  describe('getRouteLink', () => {
    it('should delegate to routingService.getLink', async () => {
      await createComponent('species');
      routingServiceSpy.getLink.mockReturnValue('/dashboard/stats');
      const link = component.getRouteLink('some-route');
      expect(routingServiceSpy.getLink).toHaveBeenCalledWith('some-route');
      expect(link).toBe('/dashboard/stats');
    });
  });

  describe('section metadata and navigation', () => {
    it('should return section title and entries for configured section', async () => {
      await createComponent('species');
      component.ngOnInit();

      expect(component.sectionTitle).toBe('Character Breakdowns');
      expect(component.sectionEntries.length).toBeGreaterThan(0);
      expect(component.sectionEntries.some(e => e.id === 'species')).toBe(true);
    });

    it('should return empty section metadata when config is null', async () => {
      await createComponent('unknown-stat');
      component.ngOnInit();

      expect(component.sectionTitle).toBe('');
      expect(component.sectionEntries).toEqual([]);
    });

    it('should return empty section metadata for unknown section key', async () => {
      await createComponent('species');
      component.config = {
        title: 'x',
        label: 'x',
        section: 'unknown' as 'account',
        key: 'bySpecies',
        showLevelCards: false,
      };

      expect(component.sectionTitle).toBe('');
      expect(component.sectionEntries).toEqual([]);
    });

    it('should navigate to requested report id', async () => {
      await createComponent('species');
      component.navigateToReport('level');
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith(
        '/dashboard/stats/level',
      );
    });
  });
});
