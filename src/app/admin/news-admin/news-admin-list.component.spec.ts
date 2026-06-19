import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { NewsCategory, NewsStatus } from 'src/app/models/news.models';
import { NewsService } from 'src/app/news/news.service';
import { NewsAdminListComponent } from './news-admin-list.component';

describe('NewsAdminListComponent', () => {
  let component: NewsAdminListComponent;
  let fixture: ComponentFixture<NewsAdminListComponent>;
  let serviceSpy: jest.Mocked<
    Pick<NewsService, 'getAllNewsForAdmin' | 'publishNews' | 'deleteNews'>
  >;

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
      publishNews: jest.fn(() => of({ ...post, status: NewsStatus.PUBLISHED })),
      deleteNews: jest.fn(() => of(void 0)),
    };

    await TestBed.configureTestingModule({
      imports: [NewsAdminListComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsAdminListComponent);
    component = fixture.componentInstance;
  });

  it('loads posts on init', () => {
    fixture.detectChanges();
    expect(component.posts).toHaveLength(1);
    expect(component.isLoading).toBe(false);
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
    jest.spyOn(globalThis, 'confirm').mockReturnValue(true);
    fixture.detectChanges();
    component.remove(post);
    expect(serviceSpy.deleteNews).toHaveBeenCalledWith('1');
    expect(component.posts).toHaveLength(0);
  });
});
