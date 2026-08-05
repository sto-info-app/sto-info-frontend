import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { NewsService } from '../news/news.service';
import { RoutingService } from '../shared/services/routing.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let authServiceMock: Partial<jest.Mocked<AuthService>>;
  let routingServiceMock: jest.Mocked<RoutingService>;
  let newsServiceMock: Partial<jest.Mocked<NewsService>>;

  const createComponent = (): void => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    authServiceMock = {
      isAuthenticated$: of(true),
    };
    routingServiceMock = {
      getLink: jest.fn(),
    } as unknown as jest.Mocked<RoutingService>;
    newsServiceMock = {
      getPublishedNews: jest
        .fn()
        .mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 5 })),
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: RoutingService, useValue: routingServiceMock },
        { provide: NewsService, useValue: newsServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should initialize with the correct app title', () => {
    createComponent();
    expect(component.appTitle).toEqual(environment.appTitle);
  });

  it('should update isLoggedIn when auth state changes', () => {
    createComponent();
    // isAuthenticated$ is already true from the spy's property
    expect(component.isLoggedIn).toBe(true);
  });

  it('should render dashboard-style cards for logged-in users', () => {
    createComponent();
    const cards = fixture.nativeElement.querySelectorAll('a.dashboard-tile');

    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain('Accounts');
    expect(cards[0].classList.contains('sunflower')).toBe(true);
  });

  it('should delegate route link generation to routing service', () => {
    createComponent();
    const getLinkSpy = jest
      .spyOn(component['_routingService'], 'getLink')
      .mockReturnValue('/test-route');
    const link = component.getRouteLink('test');

    expect(getLinkSpy).toHaveBeenCalledWith('test');
    expect(link).toBe('/test-route');
  });

  it('should stop loading and set newsError when latest news request fails', () => {
    (newsServiceMock.getPublishedNews as jest.Mock).mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    createComponent();

    expect(component.newsError).toBe(true);
    expect(component.newsLoading).toBe(false);
  });

  describe('ngOnDestroy', () => {
    it('should complete the destroy$ subject', () => {
      createComponent();
      const nextSpy = jest.spyOn(component['_destroy$'], 'next');
      const completeSpy = jest.spyOn(component['_destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should unsubscribe from authentication state on destroy', () => {
      createComponent();
      const completeSpy = jest.spyOn(component['_destroy$'], 'complete');

      component.ngOnDestroy();

      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
