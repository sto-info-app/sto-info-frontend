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

  beforeEach(() => {
    routerEvents$ = new Subject<unknown>();

    mockRouter = {
      events: routerEvents$ as unknown as Router['events'],
      url: '/test-path',
    };

    mockMeta = {
      updateTag: jest.fn(),
    } as unknown as { updateTag: jest.Mock };

    mockDocument = document.implementation.createHTMLDocument('Test');

    mockPageTitleService = {
      getTitleSuffix: jest.fn(() => 'Mock Suffix'),
    } as unknown as { getTitleSuffix: jest.Mock };

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Router, useValue: mockRouter },
        { provide: Meta, useValue: mockMeta },
        {
          provide: ActivatedRoute,
          useValue: {
            firstChild: null,
            data: of({ title: 'Test Page' }),
          },
        },
        { provide: DOCUMENT, useValue: mockDocument },
        { provide: PageTitleService, useValue: mockPageTitleService },
      ],
    });

    service = TestBed.inject(SeoService);
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
    mockPageTitleService.getTitleSuffix.mockReturnValue('');

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

    const childRoute = {
      firstChild: null,
      data: of({ title: 'Child Page' }),
    };

    const rootRoute = {
      firstChild: childRoute,
      data: of({}),
    };

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

    routerEvents$ = new Subject<unknown>();

    mockRouter = {
      events: routerEvents$ as unknown as Router['events'],
      url: '',
    };

    mockMeta = {
      updateTag: jest.fn(),
    } as unknown as { updateTag: jest.Mock };

    mockDocument = document.implementation.createHTMLDocument('Root');

    mockPageTitleService = {
      getTitleSuffix: jest.fn(() => 'Mock Suffix'),
    } as unknown as { getTitleSuffix: jest.Mock };

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Router, useValue: mockRouter },
        { provide: Meta, useValue: mockMeta },
        {
          provide: ActivatedRoute,
          useValue: {
            firstChild: null,
            data: of({ title: 'Root Path' }),
          },
        },
        { provide: DOCUMENT, useValue: mockDocument },
        { provide: PageTitleService, useValue: mockPageTitleService },
      ],
    });

    const serviceWithEmptyUrl = TestBed.inject(SeoService);

    serviceWithEmptyUrl.init();

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

    routerEvents$ = new Subject<unknown>();

    mockRouter = {
      events: routerEvents$ as unknown as Router['events'],
      url: '/no-head',
    };

    mockMeta = {
      updateTag: jest.fn(),
    } as unknown as { updateTag: jest.Mock };

    const documentWithoutHead = { head: null } as unknown as Document;

    mockPageTitleService = {
      getTitleSuffix: jest.fn(() => 'Mock Suffix'),
    } as unknown as { getTitleSuffix: jest.Mock };

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Router, useValue: mockRouter },
        { provide: Meta, useValue: mockMeta },
        {
          provide: ActivatedRoute,
          useValue: {
            firstChild: null,
            data: of({ title: 'No Head' }),
          },
        },
        { provide: DOCUMENT, useValue: documentWithoutHead },
        { provide: PageTitleService, useValue: mockPageTitleService },
      ],
    });

    const serviceWithoutHead = TestBed.inject(SeoService);

    expect(() => serviceWithoutHead.init()).not.toThrow();
  });
});
