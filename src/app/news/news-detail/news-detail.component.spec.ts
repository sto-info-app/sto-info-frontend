import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NewsCategory, NewsStatus } from 'src/app/models/news.models';
import { PageTitleService } from 'src/app/shared/services/page-title.service';
import { SeoService } from 'src/app/shared/services/seo.service';
import { NewsService } from '../news.service';
import { NewsDetailComponent } from './news-detail.component';

const seoStub = { setPageMeta: jest.fn() };
const pageTitleStub = { setTitle: jest.fn() };

describe('NewsDetailComponent', () => {
  let component: NewsDetailComponent;
  let fixture: ComponentFixture<NewsDetailComponent>;
  let serviceSpy: jest.Mocked<Pick<NewsService, 'getNewsBySlug'>>;
  let slug: string | null;

  const buildPost = () => ({
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
  });

  const configure = async () => {
    serviceSpy = { getNewsBySlug: jest.fn(() => of(buildPost())) };
    await TestBed.configureTestingModule({
      imports: [NewsDetailComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
        { provide: SeoService, useValue: seoStub },
        { provide: PageTitleService, useValue: pageTitleStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => slug } } },
        },
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

  it('flags not found when there is no slug', async () => {
    slug = null;
    await configure();
    fixture.detectChanges();
    expect(component.notFound).toBe(true);
  });

  it('flags not found on a 404 response', async () => {
    slug = 'missing';
    serviceSpy = {
      getNewsBySlug: jest.fn(() => throwError(() => ({ status: 404 }))),
    };
    await TestBed.configureTestingModule({
      imports: [NewsDetailComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
        { provide: SeoService, useValue: seoStub },
        { provide: PageTitleService, useValue: pageTitleStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => slug } } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NewsDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.notFound).toBe(true);
  });
});
