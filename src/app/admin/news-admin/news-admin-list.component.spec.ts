import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { NewsCategory, NewsStatus } from 'src/app/models/news.models';
import { NewsService } from 'src/app/news/news.service';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { NewsAdminListComponent } from './news-admin-list.component';

describe('NewsAdminListComponent', () => {
  let component: NewsAdminListComponent;
  let fixture: ComponentFixture<NewsAdminListComponent>;
  let serviceSpy: jest.Mocked<
    Pick<NewsService, 'getAllNewsForAdmin' | 'publishNews' | 'deleteNews'>
  >;
  let dialogSpy: jest.Mocked<MatDialog>;

  const post = {
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

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    serviceSpy = {
      getAllNewsForAdmin: jest.fn(() =>
        of({ items: [post], total: 1, page: 1, pageSize: 20 }),
      ),
      publishNews: jest.fn<
        ReturnType<NewsService['publishNews']>,
        Parameters<NewsService['publishNews']>
      >(() => of({ ...post, status: NewsStatus.PUBLISHED })),
      deleteNews: jest.fn<
        ReturnType<NewsService['deleteNews']>,
        Parameters<NewsService['deleteNews']>
      >(() => of(void 0)),
    };

    dialogSpy = {
      open: jest.fn(),
    } as unknown as jest.Mocked<MatDialog>;

    await TestBed.configureTestingModule({
      imports: [NewsAdminListComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
      ],
    })
      .overrideComponent(NewsAdminListComponent, {
        remove: { imports: [MatDialogModule] },
        add: { providers: [{ provide: MatDialog, useValue: dialogSpy }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NewsAdminListComponent);
    component = fixture.componentInstance;
  });

  it('loads the first page of five posts on init', () => {
    fixture.detectChanges();
    expect(serviceSpy.getAllNewsForAdmin).toHaveBeenCalledWith({
      page: 1,
      pageSize: 5,
    });
    expect(component.posts).toHaveLength(1);
    expect(component.total).toBe(1);
    expect(component.totalPages).toBe(1);
    expect(component.isLoading).toBe(false);
    expect(
      fixture.nativeElement.querySelector('app-lcars-pagination'),
    ).toBeNull();
  });

  it('turns the pages, five posts to each', () => {
    serviceSpy.getAllNewsForAdmin.mockReturnValue(
      of({ items: [post], total: 12, page: 1, pageSize: 5 }),
    );

    fixture.detectChanges();

    expect(component.totalPages).toBe(3);
    const pager: HTMLElement = fixture.nativeElement.querySelector(
      'app-lcars-pagination',
    );
    expect(pager).not.toBeNull();

    pager.querySelectorAll('button')[1].click();

    expect(component.page).toBe(2);
    expect(serviceSpy.getAllNewsForAdmin).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 5,
    });
  });

  it('handles empty datasets', () => {
    serviceSpy.getAllNewsForAdmin.mockReturnValueOnce(
      of({ items: [], total: 0, page: 1, pageSize: 20 }),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.posts).toEqual([]);
  });

  it('handles malformed payloads without hanging loading', () => {
    serviceSpy.getAllNewsForAdmin.mockReturnValueOnce(
      of(null as unknown as { items: []; total: 0; page: 1; pageSize: 20 }),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.posts).toEqual([]);
  });

  it('clears loading when manage-news request hangs', () => {
    serviceSpy.getAllNewsForAdmin.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading posts is taking longer than expected. Please try again.',
    );
  });

  it('publishes a post', () => {
    fixture.detectChanges();
    component.publish(post);
    expect(serviceSpy.publishNews).toHaveBeenCalledWith('1');
    expect(component.posts[0].status).toBe(NewsStatus.PUBLISHED);
  });

  it('deletes a post after confirmation', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);

    fixture.detectChanges();
    component.remove(post);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.anything(),
    );
    expect(serviceSpy.deleteNews).toHaveBeenCalledWith('1');
    // The page is read again, so the next post moves up into its place.
    expect(serviceSpy.getAllNewsForAdmin).toHaveBeenCalledTimes(2);
    expect(serviceSpy.getAllNewsForAdmin).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 5,
    });
  });

  // Deleting the only post of a later page would leave an empty page, so
  // the list goes back one.
  it('goes back a page when the last post of a later page is deleted', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);
    serviceSpy.getAllNewsForAdmin.mockReturnValue(
      of({ items: [post], total: 6, page: 2, pageSize: 5 }),
    );

    fixture.detectChanges();
    component.load(2);
    component.remove(post);

    expect(serviceSpy.getAllNewsForAdmin).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 5,
    });
    expect(component.page).toBe(1);
  });

  it('does not delete a post when cancelled', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(false)),
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);

    fixture.detectChanges();
    component.remove(post);

    expect(serviceSpy.deleteNews).not.toHaveBeenCalled();
    expect(component.posts).toHaveLength(1);
  });

  it('returns early from timeout callback when loading already stopped', () => {
    serviceSpy.getAllNewsForAdmin.mockReturnValueOnce(NEVER);

    component.load();
    component.isLoading = false;
    jest.advanceTimersByTime(12000);

    expect(component.errorMessage).toBe('');
  });

  it('handles load failure', () => {
    serviceSpy.getAllNewsForAdmin.mockReturnValueOnce(
      throwError(() => new Error('load failed')),
    );

    fixture.detectChanges();

    expect(component.errorMessage).toBe('Failed to load posts.');
    expect(component.isLoading).toBe(false);
  });

  it('handles publish failure', () => {
    serviceSpy.publishNews.mockReturnValueOnce(
      throwError(() => new Error('publish failed')),
    );

    fixture.detectChanges();
    component.publish(post);

    expect(component.errorMessage).toBe('Failed to publish the post.');
  });

  it('handles delete failure after confirmation', () => {
    const dialogRefSpy = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    } as unknown as MatDialogRef<unknown>;
    dialogSpy.open.mockReturnValue(dialogRefSpy);
    serviceSpy.deleteNews.mockReturnValueOnce(
      throwError(() => new Error('delete failed')),
    );

    fixture.detectChanges();
    component.remove(post);

    expect(component.errorMessage).toBe('Failed to delete the post.');
  });

  it('builds edit link via routing service', () => {
    fixture.detectChanges();
    const link = component.editLink(post);
    expect(link).toContain('/admin/news/1/edit');
  });

  it('keeps non-matching posts unchanged when publishing one post', () => {
    fixture.detectChanges();
    component.posts = [
      post,
      {
        ...post,
        id: '2',
        title: 'Second',
      },
    ];

    component.publish(post);

    expect(component.posts.find(item => item.id === '2')?.title).toBe('Second');
  });
});
