import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { SEO_SITE_URL } from '../constants/seo.constants';
import { PageTitleService } from './page-title.service';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let routerEvents$: Subject<unknown>;
  let mockRouter: Partial<Router>;
  let mockMeta: { updateTag: jest.Mock };
  let mockDocument: Document;
  let mockPageTitleService: { getTitleSuffix: jest.Mock };

  const configureSeoServiceTestBed = (options?: {
    routerUrl?: string;
    routeData?: Record<string, unknown>;
    documentFactory?: () => Document;
    titleSuffix?: string;
  }) => {
    routerEvents$ = new Subject<unknown>();

    mockRouter = {
      events: routerEvents$ as unknown as Router['events'],
      url: options?.routerUrl ?? '/test-path',
    };

    mockMeta = {
      updateTag: jest.fn(),
    } as unknown as { updateTag: jest.Mock };

    mockDocument = options?.documentFactory
      ? options.documentFactory()
      : document.implementation.createHTMLDocument('Test');

    mockPageTitleService = {
      getTitleSuffix: jest.fn(() => options?.titleSuffix ?? 'Mock Suffix'),
    } as unknown as { getTitleSuffix: jest.Mock };

    const route = {
      firstChild: null,
      data: of(options?.routeData ?? { title: 'Test Page' }),
    };

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Router, useValue: mockRouter },
        { provide: Meta, useValue: mockMeta },
        { provide: ActivatedRoute, useValue: route },
        { provide: DOCUMENT, useValue: mockDocument },
        { provide: PageTitleService, useValue: mockPageTitleService },
      ],
    });

    service = TestBed.inject(SeoService);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    configureSeoServiceTestBed();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialise and update meta tags on navigation', () => {
    service.init();

    // Non-navigation event should be ignored by the filter
    routerEvents$.next({});

    const event = new NavigationEnd(1, '/old', '/test-path');
    routerEvents$.next(event);

    expect(mockMeta.updateTag).toHaveBeenCalled();

    const canonicalLink = mockDocument.head.querySelector(
      "link[rel='canonical']",
    );
    expect(canonicalLink).not.toBeNull();
    expect(canonicalLink?.getAttribute('href')).toContain('/test-path');
  });

  it('should fall back to default title when suffix is empty', () => {
    TestBed.resetTestingModule();
    configureSeoServiceTestBed({ titleSuffix: '' });

    service.init();

    expect(mockMeta.updateTag).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'twitter:title',
        content: 'Star Trek Online Info Portal',
      }),
    );
  });

  it('should use deepest child route title', () => {
    TestBed.resetTestingModule();

    const childRoute = {
      firstChild: null,
      data: of({ title: 'Child Page' }),
    };

    const rootRoute = {
      firstChild: childRoute,
      data: of({}),
    };

    routerEvents$ = new Subject<unknown>();

    mockRouter = {
      events: routerEvents$ as unknown as Router['events'],
      url: '/nested',
    };

    mockMeta = {
      updateTag: jest.fn(),
    } as unknown as { updateTag: jest.Mock };

    mockDocument = document.implementation.createHTMLDocument('Nested');

    mockPageTitleService = {
      getTitleSuffix: jest.fn(() => 'Mock Suffix'),
    } as unknown as { getTitleSuffix: jest.Mock };

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Router, useValue: mockRouter },
        { provide: Meta, useValue: mockMeta },
        { provide: ActivatedRoute, useValue: rootRoute },
        { provide: DOCUMENT, useValue: mockDocument },
        { provide: PageTitleService, useValue: mockPageTitleService },
      ],
    });

    const nestedService = TestBed.inject(SeoService);
    nestedService.init();

    const event = new NavigationEnd(1, '/old', '/nested');
    routerEvents$.next(event);

    expect(mockMeta.updateTag).toHaveBeenCalledWith({
      property: 'og:title',
      content: 'Child Page - Mock Suffix',
    });
  });

  it('should fall back to root path when router url is empty', () => {
    TestBed.resetTestingModule();

    configureSeoServiceTestBed({
      routerUrl: '',
      routeData: { title: 'Root Path' },
      documentFactory: () => document.implementation.createHTMLDocument('Root'),
    });

    service.init();

    const canonicalLink = mockDocument.head.querySelector(
      "link[rel='canonical']",
    );

    const expectedHref = new URL('/', globalThis.location.origin).toString();

    expect(canonicalLink).not.toBeNull();
    expect(canonicalLink?.getAttribute('href')).toBe(expectedHref);
  });

  it('should fall back to SEO_SITE_URL when URL construction fails', () => {
    const originalURL = globalThis.URL;

    (globalThis as unknown as { URL: typeof URL }).URL = jest
      .fn()
      .mockImplementation(() => {
        throw new TypeError('URL error');
      }) as unknown as typeof URL;

    try {
      service.init();

      const canonicalLink = mockDocument.head.querySelector(
        "link[rel='canonical']",
      );

      expect(canonicalLink).not.toBeNull();
      expect(canonicalLink?.getAttribute('href')).toBe(SEO_SITE_URL);
    } finally {
      (globalThis as unknown as { URL: typeof URL }).URL = originalURL;
    }
  });

  it('should handle missing document head without error', () => {
    TestBed.resetTestingModule();

    configureSeoServiceTestBed({
      routerUrl: '/no-head',
      routeData: { title: 'No Head' },
      documentFactory: () => ({ head: null }) as unknown as Document,
    });

    expect(() => service.init()).not.toThrow();
  });

  it('setPageMeta applies a custom title and description', () => {
    TestBed.resetTestingModule();
    configureSeoServiceTestBed({ titleSuffix: 'Suffix' });

    service.setPageMeta('My Post', 'A custom description');

    expect(mockMeta.updateTag).toHaveBeenCalledWith({
      name: 'description',
      content: 'A custom description',
    });
    expect(mockMeta.updateTag).toHaveBeenCalledWith({
      property: 'og:title',
      content: 'My Post - Suffix',
    });
  });

  it('setPageMeta falls back to the default description when blank', () => {
    TestBed.resetTestingModule();
    configureSeoServiceTestBed({ titleSuffix: 'Suffix' });

    service.setPageMeta('My Post', '   ');

    const descriptionCall = mockMeta.updateTag.mock.calls.find(
      ([tag]: [{ name?: string }]) => tag.name === 'description',
    );
    expect(descriptionCall?.[0].content).not.toBe('   ');
  });
});
