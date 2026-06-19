import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
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
    serviceSpy = {
      getNewsByIdForAdmin: jest.fn(() =>
        of({
          id: '1',
          slug: 's',
          title: 'T',
          summary: null,
          body: 'b',
          category: 'GENERAL',
          status: 'DRAFT',
          publishedAt: null,
          authorId: null,
          createdAt: '',
          updatedAt: '',
        } as never),
      ),
      createNews: jest.fn(() => of({ id: '1' } as never)),
      updateNews: jest.fn(() => of({ id: '1' } as never)),
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
    serviceSpy.getNewsByIdForAdmin.mockReturnValueOnce(of(null as never));

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
});
