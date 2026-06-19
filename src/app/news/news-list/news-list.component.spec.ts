import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
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

    const emptyState =
      fixture.nativeElement.querySelector<HTMLElement>('.news-empty');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain(
      'There is no news to show yet. Check back soon.',
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
