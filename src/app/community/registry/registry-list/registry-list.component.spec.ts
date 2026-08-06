import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, NEVER, of, throwError } from 'rxjs';
import { RoutingService } from 'src/app/shared/services/routing.service';
import {
  PaginatedRegistryProfiles,
  RegistryListMode,
} from '../../models/registry.models';
import {
  buildProfilePage,
  buildProfileSummary,
} from '../registry-test-fixtures';
import { RegistryService } from '../registry.service';
import { RegistryListComponent } from './registry-list.component';

describe('RegistryListComponent', () => {
  let fixture: ComponentFixture<RegistryListComponent>;
  let component: RegistryListComponent;
  let registryServiceSpy: { getProfiles: jest.Mock };
  let routerNavigateSpy: jest.SpyInstance;

  /**
   * Configures the testing module and creates the component.
   *
   * @param mode - The list mode supplied via route data, or null to omit it.
   * @param queryParam - The optional `q` query parameter.
   */
  async function setup(
    mode: RegistryListMode | null = 'all',
    queryParam: string | null = null,
  ): Promise<void> {
    registryServiceSpy = {
      getProfiles: jest.fn(() => of(buildProfilePage())),
    };

    await TestBed.configureTestingModule({
      imports: [RegistryListComponent],
      providers: [
        provideRouter([]),
        { provide: RegistryService, useValue: registryServiceSpy },
        {
          provide: RoutingService,
          useValue: { getLink: jest.fn((route: string) => `/${route}`) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: mode === null ? {} : { mode },
              queryParamMap: { get: () => queryParam },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistryListComponent);
    component = fixture.componentInstance;

    const router = TestBed.inject(Router);
    routerNavigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('mode configuration', () => {
    it('should default to the browse-all mode when route data omits it', async () => {
      await setup(null);
      fixture.detectChanges();

      expect(component.mode).toBe('all');
      expect(component.heading).toBe('Profiles');
    });

    it('should use the search mode copy and sort', async () => {
      await setup('search');
      fixture.detectChanges();

      expect(component.heading).toBe('Search the Registry');
      expect(component.intro).toContain('Search for an officer');
      expect(component.emptyMessage).toBe('No officers match that search.');
      expect(registryServiceSpy.getProfiles).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'username' }),
      );
    });

    it('should request the recently-joined sort', async () => {
      await setup('recently-joined');
      fixture.detectChanges();

      expect(component.heading).toBe('Recently Joined');
      expect(registryServiceSpy.getProfiles).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'recently-joined' }),
      );
    });

    it('should request the recently-active sort', async () => {
      await setup('recently-active');
      fixture.detectChanges();

      expect(component.heading).toBe('Recently Active');
      expect(component.intro).toContain('most recently on station');
      expect(registryServiceSpy.getProfiles).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'recently-active' }),
      );
    });

    it('should seed the search box from the q query param in search mode', async () => {
      await setup('search', 'picard');
      fixture.detectChanges();

      expect(component.searchTerm).toBe('picard');
      expect(registryServiceSpy.getProfiles).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'picard' }),
      );
    });

    it('should ignore the q query param outside search mode', async () => {
      await setup('all', 'picard');
      fixture.detectChanges();

      expect(component.searchTerm).toBe('');
      expect(registryServiceSpy.getProfiles).toHaveBeenCalledWith(
        expect.objectContaining({ search: undefined }),
      );
    });
  });

  describe('loading', () => {
    it('should populate profiles and total on success', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        of(buildProfilePage({ items: [buildProfileSummary()], total: 37 })),
      );
      fixture.detectChanges();

      expect(component.profiles).toHaveLength(1);
      expect(component.total).toBe(37);
      expect(component.isLoading).toBe(false);
    });

    it('should default to empty state when the API returns nothing', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        of(null as unknown as PaginatedRegistryProfiles),
      );
      fixture.detectChanges();

      expect(component.profiles).toEqual([]);
      expect(component.total).toBe(0);
    });

    it('should report an unreachable server', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        throwError(() => ({ status: 0 })),
      );
      fixture.detectChanges();

      expect(component.errorMessage).toBe(
        'Unable to reach the server. Please try again later.',
      );
      expect(component.isLoading).toBe(false);
    });

    it('should report a generic failure for other errors', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );
      fixture.detectChanges();

      expect(component.errorMessage).toBe(
        'Something went wrong loading the registry.',
      );
    });

    it('should flag not-found on a 404', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        throwError(() => ({ status: 404 })),
      );
      fixture.detectChanges();

      expect(component.notFound).toBe(true);
      expect(component.errorMessage).toBe('');
    });

    it('should clear loading when the stream completes without emitting', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(EMPTY);
      fixture.detectChanges();

      expect(component.isLoading).toBe(false);
    });

    it('should show a timeout message when the request never settles', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(NEVER);
      fixture.detectChanges();

      expect(component.isLoading).toBe(true);
      jest.advanceTimersByTime(12000);

      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBe(
        'This is taking longer than expected. Please try again.',
      );
    });

    it('should not fire the timeout once the request has settled', async () => {
      await setup();
      fixture.detectChanges();

      jest.advanceTimersByTime(12000);

      expect(component.errorMessage).toBe('');
    });

    it('should cancel an in-flight request when a new load starts', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(NEVER);
      fixture.detectChanges();

      registryServiceSpy.getProfiles.mockReturnValue(of(buildProfilePage()));
      component.loadPage(2);

      // The first load's timeout must not fire now that it was cancelled.
      jest.advanceTimersByTime(12000);
      expect(component.errorMessage).toBe('');
      expect(component.page).toBe(2);
    });

    it('should cancel the in-flight request on destroy', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(NEVER);
      fixture.detectChanges();

      component.ngOnDestroy();
      jest.advanceTimersByTime(12000);

      expect(component.errorMessage).toBe('');
    });
  });

  describe('pagination', () => {
    it('should report a single page when the total fits on one', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        of(buildProfilePage({ total: 5 })),
      );
      fixture.detectChanges();

      expect(component.totalPages).toBe(1);
    });

    it('should report at least one page when there are no results', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        of(buildProfilePage({ items: [], total: 0 })),
      );
      fixture.detectChanges();

      expect(component.totalPages).toBe(1);
    });

    it('should round the page count up', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        of(buildProfilePage({ total: 25 })),
      );
      fixture.detectChanges();

      expect(component.totalPages).toBe(3);
    });

    it('should request the page it was asked for', async () => {
      await setup();
      fixture.detectChanges();

      component.loadPage(4);

      expect(registryServiceSpy.getProfiles).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 4, pageSize: 12 }),
      );
    });
  });

  describe('search', () => {
    it('should reflect the term in the URL and reload from page one', async () => {
      await setup('search');
      fixture.detectChanges();

      component.searchTerm = '  picard  ';
      component.page = 3;
      component.search();

      expect(routerNavigateSpy).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { q: 'picard' } }),
      );
      expect(component.page).toBe(1);
      expect(registryServiceSpy.getProfiles).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'picard', page: 1 }),
      );
    });

    it('should drop the query param when the term is empty', async () => {
      await setup('search');
      fixture.detectChanges();

      component.searchTerm = '   ';
      component.search();

      expect(routerNavigateSpy).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: {} }),
      );
      expect(registryServiceSpy.getProfiles).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: undefined }),
      );
    });

    it('should clear the term and reload', async () => {
      await setup('search', 'picard');
      fixture.detectChanges();

      component.clearSearch();

      expect(component.searchTerm).toBe('');
      expect(registryServiceSpy.getProfiles).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: undefined }),
      );
    });
  });

  describe('template', () => {
    it('should render a card per member', async () => {
      await setup();
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll(
        'app-registry-profile-card',
      );
      expect(cards).toHaveLength(1);
    });

    it('should render the empty state when there are no members', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        of(buildProfilePage({ items: [], total: 0 })),
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'No officers have opened their records yet.',
      );
    });

    it('should render the search form only in search mode', async () => {
      await setup('search');
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('#registry-search-input'),
      ).toBeTruthy();
    });

    it('should not render the search form outside search mode', async () => {
      await setup('all');
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('#registry-search-input'),
      ).toBeNull();
    });

    it('should render pagination controls when there is more than one page', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        of(buildProfilePage({ total: 25 })),
      );
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.lcars-pagination'),
      ).toBeTruthy();
    });

    it('should render the error banner when a load fails', async () => {
      await setup();
      registryServiceSpy.getProfiles.mockReturnValue(
        throwError(() => ({ status: 500 })),
      );
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('app-lcars-error-message'),
      ).toBeTruthy();
    });
  });

  describe('getRouteLink', () => {
    it('should delegate to the routing service', async () => {
      await setup();
      fixture.detectChanges();

      expect(component.getRouteLink('community/registry/search')).toBe(
        '/community/registry/search',
      );
    });
  });
});
