import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { NewsCategory, NewsPost, NewsStatus } from 'src/app/models/news.models';
import { NewsService } from 'src/app/news/news.service';
import {
  NEWS_COVER_REMOVE_FAILED,
  NewsAdminFormComponent,
} from './news-admin-form.component';
import { NewsCoverDialogComponent } from './news-cover-dialog/news-cover-dialog.component';

/**
 * A saved draft with no cover.
 *
 * @returns The post.
 */
const basePost = (): NewsPost => ({
  id: '1',
  slug: 's',
  title: 'T',
  summary: null,
  body: 'b',
  category: NewsCategory.GENERAL,
  status: NewsStatus.DRAFT,
  publishedAt: null,
  authorId: null,
  coverImageId: null,
  coverImageAlt: null,
  coverImageUrls: null,
  createdAt: '',
  updatedAt: '',
});

/** A post's cover, as the API hands it out. */
const COVERED: Partial<NewsPost> = {
  coverImageId: 'cover',
  coverImageAlt: 'The new shipyard',
  coverImageUrls: {
    cover640x360: 'https://images.example/cover/cover640x360',
    cover1920x1080: 'https://images.example/cover/cover1920x1080',
  },
};

describe('NewsAdminFormComponent', () => {
  let component: NewsAdminFormComponent;
  let fixture: ComponentFixture<NewsAdminFormComponent>;
  let serviceSpy: jest.Mocked<
    Pick<
      NewsService,
      'getNewsByIdForAdmin' | 'createNews' | 'updateNews' | 'removeCover'
    >
  >;
  let routeId: string | null;
  let dialogAnswer: unknown;
  let dialogSpy: { open: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const configure = async () => {
    const post = basePost();

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
      removeCover: jest.fn<
        ReturnType<NewsService['removeCover']>,
        Parameters<NewsService['removeCover']>
      >(() => of(undefined)),
    };
    dialogAnswer = true;
    dialogSpy = {
      open: jest.fn(() => ({ afterClosed: () => of(dialogAnswer) })),
    };

    await TestBed.configureTestingModule({
      imports: [NewsAdminFormComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => routeId } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsAdminFormComponent);
    component = fixture.componentInstance;
  };

  it('creates a post in add mode, then opens it for its cover', async () => {
    routeId = null;
    await configure();
    const navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigate');
    fixture.detectChanges();
    component.form.patchValue({ title: 'New', body: 'Body' });
    component.save();
    expect(serviceSpy.createNews).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/news', '1', 'edit'], {
      replaceUrl: true,
    });
  });

  it('offers no cover until the post has been saved', async () => {
    routeId = null;
    await configure();
    fixture.detectChanges();

    const page: HTMLElement = fixture.nativeElement;
    expect(page.textContent).toContain(
      'Save the post first; its cover can be added then.',
    );
    expect(page.querySelector('.news-admin-cover')).toBeNull();
  });

  it('shows a saved post has no cover, and offers to set one', async () => {
    routeId = '1';
    await configure();
    fixture.detectChanges();

    const section: HTMLElement =
      fixture.nativeElement.querySelector('.news-admin-cover');
    expect(section.textContent).toContain('This post has no cover.');
    const buttons = Array.from(section.querySelectorAll('button')).map(button =>
      button.textContent?.trim(),
    );
    expect(buttons).toEqual(['Set the cover']);
  });

  it('shows the cover card-sized, with Replace and Remove', async () => {
    routeId = '1';
    await configure();
    serviceSpy.getNewsByIdForAdmin.mockReturnValueOnce(
      of({ ...basePost(), ...COVERED }),
    );
    fixture.detectChanges();

    const section: HTMLElement =
      fixture.nativeElement.querySelector('.news-admin-cover');
    const image = section.querySelector('img');
    expect(image?.getAttribute('src')).toBe(
      'https://images.example/cover/cover640x360',
    );
    expect(image?.getAttribute('alt')).toBe('The new shipyard');
    const buttons = Array.from(section.querySelectorAll('button')).map(button =>
      button.textContent?.trim(),
    );
    expect(buttons).toEqual(['Replace the cover', 'Remove the cover']);
  });

  it('opens the cover dialogue for the post, and reads the cover again once it closes', async () => {
    routeId = '1';
    await configure();
    fixture.detectChanges();
    component.form.patchValue({ title: 'Typed but not saved' });
    serviceSpy.getNewsByIdForAdmin.mockReturnValueOnce(
      of({ ...basePost(), ...COVERED }),
    );

    const setButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.news-admin-cover button',
    );
    setButton.click();
    fixture.detectChanges();

    expect(dialogSpy.open).toHaveBeenCalledWith(
      NewsCoverDialogComponent,
      expect.objectContaining({
        data: { postId: '1', scopeName: 'T', currentAlt: null },
      }),
    );
    expect(component.post?.coverImageId).toBe('cover');
    // Reading the cover again leaves what has been typed alone.
    expect(component.form.controls.title.value).toBe('Typed but not saved');
  });

  it('leaves the cover as it was when the dialogue is cancelled', async () => {
    routeId = '1';
    await configure();
    fixture.detectChanges();
    dialogAnswer = false;

    component.onSetCover(component.post as NewsPost);

    expect(serviceSpy.getNewsByIdForAdmin).toHaveBeenCalledTimes(1);
  });

  it('removes the cover once asked, then reads the post again', async () => {
    routeId = '1';
    await configure();
    serviceSpy.getNewsByIdForAdmin.mockReturnValueOnce(
      of({ ...basePost(), ...COVERED }),
    );
    fixture.detectChanges();

    const removeButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.news-admin-cover button.red',
    );
    removeButton.click();
    fixture.detectChanges();

    expect(serviceSpy.removeCover).toHaveBeenCalledWith('1');
    expect(serviceSpy.getNewsByIdForAdmin).toHaveBeenCalledTimes(2);
    expect(component.post?.coverImageId).toBeNull();
  });

  // The cover changed either way, so a failed re-read is not reported as a
  // failed change: the page keeps what it last read, and says nothing.
  it('keeps the post it had when reading it again after a cover change fails', async () => {
    routeId = '1';
    await configure();
    serviceSpy.getNewsByIdForAdmin
      .mockReturnValueOnce(of({ ...basePost(), ...COVERED }))
      .mockReturnValueOnce(throwError(() => new Error('read failed')));
    fixture.detectChanges();

    const removeButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.news-admin-cover button.red',
    );
    removeButton.click();
    fixture.detectChanges();

    expect(serviceSpy.removeCover).toHaveBeenCalledWith('1');
    expect(serviceSpy.getNewsByIdForAdmin).toHaveBeenCalledTimes(2);
    expect(component.post?.coverImageId).toBe('cover');
    expect(component.coverError).toBe('');
    expect(component.errorMessage).toBe('');
  });

  it('removes nothing when the removal is not confirmed', async () => {
    routeId = '1';
    await configure();
    fixture.detectChanges();
    dialogAnswer = false;

    component.onRemoveCover(component.post as NewsPost);

    expect(serviceSpy.removeCover).not.toHaveBeenCalled();
  });

  it('says so when the cover could not be removed', async () => {
    routeId = '1';
    await configure();
    serviceSpy.removeCover.mockReturnValueOnce(
      throwError(() => new Error('remove failed')),
    );
    fixture.detectChanges();

    component.onRemoveCover(component.post as NewsPost);
    fixture.detectChanges();

    expect(component.coverError).toBe(NEWS_COVER_REMOVE_FAILED);
    expect(fixture.nativeElement.textContent).toContain(
      NEWS_COVER_REMOVE_FAILED,
    );
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
