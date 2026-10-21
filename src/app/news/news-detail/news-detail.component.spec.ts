import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';
import {
  NewsCategory,
  NewsStatus,
  PublishedNewsPost,
} from 'src/app/models/news.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { RoutingService } from 'src/app/shared/services/routing.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { NewsService } from '../news.service';
import { NewsDetailComponent } from './news-detail.component';

const seoStub = { setPageMeta: jest.fn() };
const pageTitleStub = { setTitle: jest.fn() };

describe('NewsDetailComponent', () => {
  let component: NewsDetailComponent;
  let fixture: ComponentFixture<NewsDetailComponent>;
  let serviceSpy: jest.Mocked<Pick<NewsService, 'getNewsBySlug'>>;
  let routingServiceSpy: jest.Mocked<Pick<RoutingService, 'getLink'>>;
  let slug: string | null;
  let paramMap$: BehaviorSubject<ParamMap>;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const buildPost = (
    overrides: Partial<PublishedNewsPost> = {},
  ): PublishedNewsPost => ({
    id: '1',
    slug: 'my-slug',
    title: 'Title',
    summary: null,
    body: '# Body',
    category: NewsCategory.GENERAL,
    status: NewsStatus.PUBLISHED,
    publishedAt: '2026-01-01T00:00:00Z',
    authorId: null,
    createdAt: '',
    updatedAt: '',
    previous: null,
    next: null,
    ...overrides,
  });

  const routeStub = () => {
    paramMap$ = new BehaviorSubject(convertToParamMap(slug ? { slug } : {}));

    return { paramMap: paramMap$.asObservable() };
  };

  const configure = async () => {
    serviceSpy = {
      getNewsBySlug: jest.fn<
        ReturnType<NewsService['getNewsBySlug']>,
        Parameters<NewsService['getNewsBySlug']>
      >(() => of(buildPost())),
    };
    routingServiceSpy = {
      getLink: jest.fn((route: string) => `/${route}`),
    };
    await TestBed.configureTestingModule({
      imports: [NewsDetailComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: SeoService, useValue: seoStub },
        { provide: PageTitleService, useValue: pageTitleStub },
        { provide: ActivatedRoute, useValue: routeStub() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NewsDetailComponent);
    component = fixture.componentInstance;
  };

  it('loads a post by slug and applies its metadata', async () => {
    slug = 'my-slug';
    await configure();
    fixture.detectChanges();
    expect(serviceSpy.getNewsBySlug).toHaveBeenCalledWith('my-slug');
    expect(component.post?.title).toBe('Title');
    expect(pageTitleStub.setTitle).toHaveBeenCalledWith('Title');
    expect(seoStub.setPageMeta).toHaveBeenCalledWith(
      'Title',
      undefined,
      expect.stringContaining('/og/news/my-slug.png'),
    );
  });

  it('renders YouTube embeds while escaping raw HTML', async () => {
    slug = 'my-slug';
    await configure();
    serviceSpy.getNewsBySlug.mockReturnValueOnce(
      of(
        buildPost({
          body: 'Watch https://youtu.be/UG0aHIOLbV4\n\n<script>alert(1)</script>',
        }),
      ),
    );

    fixture.detectChanges();

    const body = fixture.nativeElement.querySelector('.news-body');
    const iframe = body.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/UG0aHIOLbV4',
    );
    expect(body.querySelector('script')).toBeNull();
    expect(body.textContent).toContain('<script>alert(1)</script>');
  });

  // Previous is the older post, on the left, and Next the newer, on the
  // right, each named beneath its pill, with Back to News between them.
  it('leads to the posts either side, older first, with their titles', async () => {
    slug = 'my-slug';
    await configure();
    serviceSpy.getNewsBySlug.mockReturnValueOnce(
      of(
        buildPost({
          previous: { slug: 'older', title: 'The older post' },
          next: { slug: 'newer', title: 'The newer post' },
        }),
      ),
    );

    fixture.detectChanges();

    const nav: HTMLElement = fixture.nativeElement.querySelector('.news-nav');
    const links = Array.from(nav.querySelectorAll('a')).map(link => ({
      href: link.getAttribute('href'),
      text: link.textContent?.trim(),
      label: link.getAttribute('aria-label'),
    }));

    expect(links).toEqual([
      {
        href: '/news/older',
        text: 'Previous',
        label: 'Previous post: The older post',
      },
      { href: '/news', text: 'Back to News', label: null },
      { href: '/news/newer', text: 'Next', label: 'Next post: The newer post' },
    ]);
    expect(
      Array.from(nav.querySelectorAll('.news-nav__title')).map(title =>
        title.textContent?.trim(),
      ),
    ).toEqual(['The older post', 'The newer post']);
  });

  it('leaves a side empty when there is no post that way', async () => {
    slug = 'my-slug';
    await configure();
    serviceSpy.getNewsBySlug.mockReturnValueOnce(
      of(buildPost({ next: { slug: 'newer', title: 'The newer post' } })),
    );

    fixture.detectChanges();

    const nav: HTMLElement = fixture.nativeElement.querySelector('.news-nav');

    expect(
      nav.querySelector('.news-nav__side--previous')?.children,
    ).toHaveLength(0);
    expect(nav.querySelector('.news-nav__side--next a')).not.toBeNull();
    expect(
      Array.from(nav.querySelectorAll('a')).map(link =>
        link.textContent?.trim(),
      ),
    ).toEqual(['Back to News', 'Next']);
  });

  // Following Previous or Next changes the slug on the same route, which
  // keeps this component, so it has to notice and load the other post.
  it('loads the other post when the slug changes', async () => {
    slug = 'my-slug';
    await configure();
    fixture.detectChanges();
    serviceSpy.getNewsBySlug.mockReturnValueOnce(
      of(buildPost({ slug: 'older', title: 'The older post' })),
    );

    paramMap$.next(convertToParamMap({ slug: 'older' }));
    fixture.detectChanges();

    expect(serviceSpy.getNewsBySlug).toHaveBeenLastCalledWith('older');
    expect(component.post?.title).toBe('The older post');
    expect(pageTitleStub.setTitle).toHaveBeenLastCalledWith('The older post');
  });

  it('flags not found when there is no slug', async () => {
    slug = null;
    await configure();
    fixture.detectChanges();
    expect(component.notFound).toBe(true);
    expect(serviceSpy.getNewsBySlug).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('.news-nav a')?.textContent?.trim(),
    ).toBe('Back to News');
  });

  it('flags not found on a 404 response', async () => {
    slug = 'missing';
    serviceSpy = {
      getNewsBySlug: jest.fn<
        ReturnType<NewsService['getNewsBySlug']>,
        Parameters<NewsService['getNewsBySlug']>
      >(() => throwError(() => ({ status: 404 }))),
    };
    await TestBed.configureTestingModule({
      imports: [NewsDetailComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
        { provide: SeoService, useValue: seoStub },
        { provide: PageTitleService, useValue: pageTitleStub },
        { provide: ActivatedRoute, useValue: routeStub() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NewsDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.notFound).toBe(true);
  });

  it('clears loading and surfaces an error when the request hangs', async () => {
    slug = 'slow';
    await configure();
    serviceSpy.getNewsBySlug.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading this post is taking longer than expected. Please try again.',
    );
  });

  it('surfaces an error message for non-404 errors', async () => {
    slug = 'error';
    serviceSpy = {
      getNewsBySlug: jest.fn<
        ReturnType<NewsService['getNewsBySlug']>,
        Parameters<NewsService['getNewsBySlug']>
      >(() => throwError(() => ({ status: 500 }))),
    };
    await TestBed.configureTestingModule({
      imports: [NewsDetailComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
        { provide: RoutingService, useValue: routingServiceSpy },
        { provide: SeoService, useValue: seoStub },
        { provide: PageTitleService, useValue: pageTitleStub },
        { provide: ActivatedRoute, useValue: routeStub() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NewsDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.errorMessage).toBe(
      'Something went wrong loading this post.',
    );
  });

  it('returns early from timeout callback when loading already stopped', async () => {
    slug = 'slow';
    await configure();
    serviceSpy.getNewsBySlug.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    component.isLoading = false;
    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
  });

  it('returns the news list link from routing service', async () => {
    slug = 'my-slug';
    await configure();

    const link = component.newsListLink;

    expect(routingServiceSpy.getLink).toHaveBeenCalledWith(APP_ROUTES.NEWS);
    expect(link).toBe(`/${APP_ROUTES.NEWS}`);
  });
});
