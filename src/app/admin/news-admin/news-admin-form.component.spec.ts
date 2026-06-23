import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { NewsCategory, NewsPost, NewsStatus } from 'src/app/models/news.models';
import { NewsService } from 'src/app/news/news.service';
import { NewsAdminFormComponent } from './news-admin-form.component';

describe('NewsAdminFormComponent', () => {
  let component: NewsAdminFormComponent;
  let fixture: ComponentFixture<NewsAdminFormComponent>;
  let serviceSpy: jest.Mocked<
    Pick<NewsService, 'getNewsByIdForAdmin' | 'createNews' | 'updateNews'>
  >;
  let routeId: string | null;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const configure = async () => {
    const post: NewsPost = {
      id: '1',
      slug: 's',
      title: 'T',
      summary: null,
      body: 'b',
      category: NewsCategory.GENERAL,
      status: NewsStatus.DRAFT,
      publishedAt: null,
      authorId: null,
      createdAt: '',
      updatedAt: '',
    };

    serviceSpy = {
      getNewsByIdForAdmin: jest.fn<
        ReturnType<NewsService['getNewsByIdForAdmin']>,
        Parameters<NewsService['getNewsByIdForAdmin']>
      >(() => of(post)),
      createNews: jest.fn<
        ReturnType<NewsService['createNews']>,
        Parameters<NewsService['createNews']>
      >(() => of(post)),
      updateNews: jest.fn<
        ReturnType<NewsService['updateNews']>,
        Parameters<NewsService['updateNews']>
      >(() => of(post)),
    };

    await TestBed.configureTestingModule({
      imports: [NewsAdminFormComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => routeId } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsAdminFormComponent);
    component = fixture.componentInstance;
  };

  it('creates a post in add mode', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();
    component.form.patchValue({ title: 'New', body: 'Body' });
    component.save();
    expect(serviceSpy.createNews).toHaveBeenCalled();
  });

  it('loads and updates a post in edit mode', async () => {
    routeId = '1';
    await configure();
    const navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigate');
    fixture.detectChanges();
    expect(component.isEdit).toBe(true);
    expect(serviceSpy.getNewsByIdForAdmin).toHaveBeenCalledWith('1');
    component.save();
    expect(serviceSpy.updateNews).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('does not submit an invalid form', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();
    component.form.patchValue({ title: '', body: '' });
    component.save();
    expect(serviceSpy.createNews).not.toHaveBeenCalled();
  });

  it('handles malformed edit payloads without hanging loading', async () => {
    routeId = '1';
    await configure();
    serviceSpy.getNewsByIdForAdmin.mockReturnValueOnce(
      of(null as unknown as NewsPost),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Failed to load the post.');
  });

  it('clears loading when edit post request hangs', async () => {
    routeId = '1';
    await configure();
    serviceSpy.getNewsByIdForAdmin.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading post is taking longer than expected. Please try again.',
    );
  });

  it('returns bodyValue when body control is nullish', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();

    component.form.patchValue({ body: null as unknown as string });

    expect(component.bodyValue).toBe('');
  });

  it('toggles preview mode', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();

    expect(component.showPreview).toBe(false);
    component.togglePreview();
    expect(component.showPreview).toBe(true);
  });

  it('handles load failure for edit mode', async () => {
    routeId = '1';
    await configure();
    serviceSpy.getNewsByIdForAdmin.mockReturnValueOnce(
      throwError(() => new Error('load failed')),
    );

    fixture.detectChanges();

    expect(component.errorMessage).toBe('Failed to load the post.');
    expect(component.isLoading).toBe(false);
  });

  it('returns early from timeout callback when loading already stopped', async () => {
    routeId = '1';
    await configure();
    serviceSpy.getNewsByIdForAdmin.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    component.isLoading = false;
    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
  });

  it('handles save failure and clears saving flag', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();

    serviceSpy.createNews.mockReturnValueOnce(
      throwError(() => new Error('save failed')),
    );

    component.form.patchValue({ title: 'New', body: 'Body' });
    component.save();

    expect(component.isSaving).toBe(false);
    expect(component.errorMessage).toBe(
      'Failed to save the post. Check the slug is unique and try again.',
    );
  });

  it('normalizes optional payload fields to undefined when empty', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();

    component.form.patchValue({
      title: 'New',
      body: 'Body',
      category: null as unknown as NewsCategory,
      status: null as unknown as NewsStatus,
      slug: '   ',
      summary: '   ',
    });

    component.save();

    expect(serviceSpy.createNews).toHaveBeenCalledWith(
      expect.objectContaining({
        category: undefined,
        status: undefined,
        slug: undefined,
        summary: undefined,
      }),
    );
  });

  it('trims and forwards optional slug and summary when provided', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();

    component.form.patchValue({
      title: 'New',
      body: 'Body',
      slug: '  my-slug  ',
      summary: '  my summary  ',
      category: NewsCategory.ANNOUNCEMENT,
      status: NewsStatus.PUBLISHED,
    });

    component.save();

    expect(serviceSpy.createNews).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'my-slug',
        summary: 'my summary',
        category: NewsCategory.ANNOUNCEMENT,
        status: NewsStatus.PUBLISHED,
      }),
    );
  });
});
