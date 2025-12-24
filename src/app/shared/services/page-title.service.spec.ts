import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { environment } from '../../../../src/environments/environment';
import { PageTitleService } from './page-title.service';

describe('PageTitleService', () => {
  let service: PageTitleService;
  let mockTitle: { setTitle: jest.Mock };
  let mockRouter: { events: Subject<unknown> };
  let mockActivatedRoute: ActivatedRoute;

  const configurePageTitleTestBed = (options?: {
    route?: ActivatedRoute;
    routeData?: Record<string, unknown>;
    envName?: string;
    appTitle?: string;
  }): void => {
    if (options?.envName !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (environment as any).env_name = options.envName;
    }

    if (options?.appTitle !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (environment as any).appTitle = options.appTitle;
    }

    mockRouter = {
      events: new Subject<unknown>(),
    } as unknown as { events: Subject<unknown> };

    mockActivatedRoute = (options?.route ?? {
      firstChild: null,
      data: of(options?.routeData ?? { title: 'Test Page' }),
    }) as unknown as ActivatedRoute;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PageTitleService,
        { provide: Title, useValue: mockTitle },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    service = TestBed.inject(PageTitleService);
  };

  beforeEach(() => {
    mockTitle = {
      setTitle: jest.fn(),
    } as unknown as { setTitle: jest.Mock };

    configurePageTitleTestBed();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return site title without tag when env is neither local nor dev', () => {
    environment.env_name = 'test';
    environment.appTitle = 'Plain App';

    const suffix = service.getTitleSuffix();

    expect(suffix).toBe('Plain App');
  });

  it('should fall back to default site title in suffix when appTitle is empty', () => {
    environment.env_name = 'test';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    environment.appTitle = '' as any;

    const suffix = service.getTitleSuffix();

    expect(suffix).toBe('Star Trek Online Info Portal');
  });

  it('should append [Local Dev] tag when env is local', () => {
    environment.env_name = 'local';
    environment.appTitle = 'Local App';

    const suffix = service.getTitleSuffix();

    expect(suffix).toBe('Local App [Local Dev]');
  });

  it('should append [Dev] tag when env is dev', () => {
    environment.env_name = 'dev';
    environment.appTitle = 'Dev App';

    const suffix = service.getTitleSuffix();

    expect(suffix).toBe('Dev App [Dev]');
  });

  it('should set full title when pageTitle and suffix exist', () => {
    configurePageTitleTestBed({ envName: 'local', appTitle: 'My App' });

    service.init();

    // Non-navigation event should be ignored by the filter
    mockRouter.events.next({});

    mockRouter.events.next(new NavigationEnd(1, '/old', '/test'));

    expect(mockTitle.setTitle).toHaveBeenCalledWith(
      'Test Page - My App [Local Dev]',
    );
  });

  it('should use deepest child route title when nested routes exist', () => {
    const deepestRoute = {
      firstChild: null,
      data: of({ title: 'Deep Page' }),
    } as unknown as ActivatedRoute;

    const childRoute = {
      firstChild: deepestRoute,
      data: of({}),
    } as unknown as ActivatedRoute;

    const rootRoute = {
      firstChild: childRoute,
      data: of({}),
    } as unknown as ActivatedRoute;

    configurePageTitleTestBed({
      route: rootRoute,
      envName: 'local',
      appTitle: 'Nested App',
    });

    service.init();

    mockRouter.events.next(new NavigationEnd(1, '/old', '/nested'));

    expect(mockTitle.setTitle).toHaveBeenCalledWith(
      'Deep Page - Nested App [Local Dev]',
    );
  });

  it('should set only suffix when no pageTitle but suffix exists', () => {
    configurePageTitleTestBed({
      envName: 'dev',
      appTitle: 'My Dev App',
      routeData: {},
    });

    service.init();

    mockRouter.events.next(new NavigationEnd(1, '/old', '/test'));

    expect(mockTitle.setTitle).toHaveBeenCalledWith('My Dev App [Dev]');
  });

  it('should fall back to default site title when no pageTitle or suffix', () => {
    configurePageTitleTestBed({ routeData: {} });

    jest.spyOn(service, 'getTitleSuffix').mockReturnValue('');

    service.init();

    mockRouter.events.next(new NavigationEnd(1, '/old', '/test'));

    expect(mockTitle.setTitle).toHaveBeenCalledWith(
      'Star Trek Online Info Portal',
    );
  });
});
