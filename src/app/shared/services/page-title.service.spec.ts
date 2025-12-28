import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PageTitleService } from './page-title.service';

jest.mock('src/environments/environment', () => ({
  environment: {
    appTitle: 'Test App',
    env_name: 'prod',
  },
}));

describe('PageTitleService', () => {
  let service: PageTitleService;
  let titleSpy: jest.Mocked<Title>;
  let router: Router;
  // We need to control router events
  // RouterTestingModule provides a real router, but triggering events manually is hard without navigation.
  // Alternatively we can mock Router.
  // But PageTitleService injects Router and subscribes to events.
  // Using RouterTestingModule is easier if we can navigate. But we might need real routes.
  // Or we Mock Router completely.

  let routerEvents$: Subject<any>;

  beforeEach(() => {
    routerEvents$ = new Subject<any>();

    // Mock Router with events subject
    const routerMock = {
      events: routerEvents$.asObservable(),
      url: '/',
    };

    // Mock ActivatedRoute
    const activatedRouteMock = {
      firstChild: null,
      data: of({ title: 'Page Title' }),
    };

    titleSpy = {
      setTitle: jest.fn(),
    } as unknown as jest.Mocked<Title>;

    TestBed.configureTestingModule({
      providers: [
        PageTitleService,
        { provide: Title, useValue: titleSpy },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    });
    service = TestBed.inject(PageTitleService);

    // Reset env
    (environment as any).env_name = 'prod';
    (environment as any).appTitle = 'Test App';
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('init', () => {
    it('should set title from route data on NavigationEnd', () => {
      service.init();

      routerEvents$.next(new NavigationEnd(1, '/test', '/test'));

      expect(titleSpy.setTitle).toHaveBeenCalledWith('Page Title - Test App');
    });

    it('should set default title if no page title', () => {
      // Mock data returning no title
      const activatedRouteMock = TestBed.inject(ActivatedRoute);
      (activatedRouteMock.data as any) = of({});

      service.init();
      routerEvents$.next(new NavigationEnd(1, '/test', '/test'));

      expect(titleSpy.setTitle).toHaveBeenCalledWith('Test App');
    });

    it('should set title for nested routes', () => {
      const childRoute = {
        firstChild: null,
        data: of({ title: 'Child Title' }),
      };
      const activatedRouteMock = TestBed.inject(ActivatedRoute);
      (activatedRouteMock as any).firstChild = childRoute;

      service.init();
      routerEvents$.next(new NavigationEnd(1, '/test', '/test'));

      expect(titleSpy.setTitle).toHaveBeenCalledWith('Child Title - Test App');
    });

    it('should set default site title if no page title and no suffix', () => {
      (environment as any).appTitle = '';
      const activatedRouteMock = TestBed.inject(ActivatedRoute);
      (activatedRouteMock.data as any) = of({});

      service.init();
      routerEvents$.next(new NavigationEnd(1, '/test', '/test'));

      expect(titleSpy.setTitle).toHaveBeenCalledWith(
        'Star Trek Online Info Portal',
      );
    });
  });

  describe('getTitleSuffix', () => {
    it('should return app title for prod', () => {
      expect(service.getTitleSuffix()).toBe('Test App');
    });

    it('should append [Local Dev] for local env', () => {
      (environment as any).env_name = 'local';
      expect(service.getTitleSuffix()).toBe('Test App [Local Dev]');
    });

    it('should append [Dev] for dev env', () => {
      (environment as any).env_name = 'dev';
      expect(service.getTitleSuffix()).toBe('Test App [Dev]');
    });

    it('should use default title if appTitle undefined', () => {
      (environment as any).appTitle = undefined;
      (environment as any).env_name = 'prod';
      expect(service.getTitleSuffix()).toBe('Star Trek Online Info Portal');
    });
  });

  it('should hit default branch if pageTitle and getTitleSuffix are both empty', () => {
    // Mock data returning no title
    const activatedRouteMock = TestBed.inject(ActivatedRoute);
    (activatedRouteMock.data as any) = of({});

    jest.spyOn(service, 'getTitleSuffix').mockReturnValue('');
    service.init();
    routerEvents$.next(new NavigationEnd(1, '/test', '/test'));
    expect(titleSpy.setTitle).toHaveBeenCalledWith(
      'Star Trek Online Info Portal',
    );
  });
});
