import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, NEVER, Subject, of, throwError } from 'rxjs';
import type { PaginatedNews } from 'src/app/models/news.models';
import { NewsService } from '../news.service';
import { NewsListComponent } from './news-list.component';

describe('NewsListComponent', () => {
  let component: NewsListComponent;
  let fixture: ComponentFixture<NewsListComponent>;
  let serviceSpy: jest.Mocked<Pick<NewsService, 'getPublishedNews'>>;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    serviceSpy = {
      getPublishedNews: jest.fn(() =>
        of({ items: [], total: 0, page: 1, pageSize: 10 }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [NewsListComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: NewsService, useValue: serviceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsListComponent);
    component = fixture.componentInstance;
  });

  it('loads the first page on init', () => {
    fixture.detectChanges();
    expect(serviceSpy.getPublishedNews).toHaveBeenCalled();
    expect(component.page).toBe(1);
  });

  it('reloads when filtering by category', () => {
    fixture.detectChanges();
    serviceSpy.getPublishedNews.mockClear();
    component.filterByCategory(null);
    expect(serviceSpy.getPublishedNews).toHaveBeenCalled();
  });

  it('handles an empty payload shape without hanging loading', () => {
    serviceSpy.getPublishedNews.mockReturnValueOnce(
      of(null as unknown as { items: []; total: 0; page: 1; pageSize: 10 }),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.posts).toEqual([]);
    expect(component.total).toBe(0);
  });

  it('renders the empty-state message when there are no posts', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const emptyState = host.querySelector('.news-empty') as HTMLElement | null;
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain(
      'There are no announcements, release notes and general updates to show yet. Check back soon.',
    );
  });

  it('clears loading and sets error when request fails', () => {
    serviceSpy.getPublishedNews.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Something went wrong loading the news.',
    );
  });

  it('clears loading when the stream completes without emitting', () => {
    // A stream that completes with no value must still drop the spinner;
    // otherwise the loading bar hangs forever (clearing only happens in next).
    serviceSpy.getPublishedNews.mockReturnValueOnce(EMPTY);

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('');
  });

  it('cancels an in-flight request when the category changes again', () => {
    // First load never settles; the second supersedes it.
    const firstLoad = new Subject<PaginatedNews>();
    serviceSpy.getPublishedNews
      .mockReturnValueOnce(firstLoad.asObservable())
      .mockReturnValueOnce(
        of({ items: [], total: 0, page: 1, pageSize: 10 } as PaginatedNews),
      );

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    // Switching category starts a fresh load that resolves immediately.
    component.filterByCategory(null);
    expect(component.isLoading).toBe(false);

    // A late response from the cancelled first request must be ignored, so the
    // spinner stays off and the stale timeout never fires.
    firstLoad.next({
      items: [{ id: 'stale' }] as unknown as PaginatedNews['items'],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.posts).toEqual([]);
    expect(component.errorMessage).toBe('');
  });

  it('clears loading when the news request hangs', () => {
    serviceSpy.getPublishedNews.mockReturnValueOnce(NEVER);

    fixture.detectChanges();
    expect(component.isLoading).toBe(true);

    jest.advanceTimersByTime(12000);

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Loading news is taking longer than expected. Please try again.',
    );
  });
});
