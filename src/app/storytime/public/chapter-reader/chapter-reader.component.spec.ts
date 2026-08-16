import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ChapterWithNavigation } from 'src/app/models/storytime.models';
import { ChapterService } from '../../chapter.service';
import { ChapterReaderComponent } from './chapter-reader.component';

describe('ChapterReaderComponent', () => {
  let fixture: ComponentFixture<ChapterReaderComponent>;
  let chapterService: { getChapter: jest.Mock };
  let params: BehaviorSubject<Map<string, string>>;

  /**
   * Builds a Chapter response.
   *
   * @param overrides - Fields to change on the payload.
   * @returns The response.
   */
  const buildResponse = (
    overrides: Partial<ChapterWithNavigation> = {},
  ): ChapterWithNavigation =>
    ({
      chapter: {
        id: 'chapter-1',
        slug: 'chapter-one',
        title: 'Chapter One',
        synopsis: 'A summary',
        contentHtml: '<p id="b1">The Enterprise went to warp.</p>',
        languageCode: 'en',
        wordCount: 5,
        estimatedReadingMinutes: 1,
        coverImageUrl: null,
        coverImageAlt: null,
      },
      previous: null,
      next: null,
      ...overrides,
    }) as ChapterWithNavigation;

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ChapterReaderComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    params = new BehaviorSubject(
      new Map([
        ['storySlug', 'a-story'],
        ['chapterSlug', 'chapter-one'],
      ]),
    );
    chapterService = {
      getChapter: jest.fn().mockReturnValue(of(buildResponse())),
    };

    TestBed.configureTestingModule({
      imports: [ChapterReaderComponent],
      providers: [
        provideRouter([]),
        { provide: ChapterService, useValue: chapterService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: new Map() } },
        },
      ],
    });
  });

  it('shows the Chapter', () => {
    const element = render();

    expect(element.textContent).toContain('Chapter One');
    expect(element.textContent).toContain('A summary');
  });

  it('renders the server-rendered body', () => {
    const element = render();

    expect(
      element.querySelector('.storytime-chapter__body')?.innerHTML,
    ).toContain('The Enterprise went to warp.');
  });

  // The block anchors are what reading progress will be recorded against, so
  // they must survive into the DOM.
  it('keeps the block anchors in the rendered body', () => {
    const element = render();

    expect(
      element.querySelector('.storytime-chapter__body #b1'),
    ).not.toBeNull();
  });

  // The lang attribute lets a screen reader pronounce the Chapter correctly.
  it('carries the resolved language on the article', () => {
    const element = render();

    expect(element.querySelector('article')?.getAttribute('lang')).toBe('en');
  });

  it('carries a Chapter language that differs from its Story', () => {
    chapterService.getChapter.mockReturnValue(
      of(
        buildResponse({
          chapter: {
            ...buildResponse().chapter,
            languageCode: 'tlh',
          },
        } as Partial<ChapterWithNavigation>),
      ),
    );

    const element = render();

    expect(element.querySelector('article')?.getAttribute('lang')).toBe('tlh');
  });

  it('offers no navigation for a lone Chapter', () => {
    const element = render();

    expect(element.querySelector('.storytime-chapter__previous')).toBeNull();
    expect(element.querySelector('.storytime-chapter__next')).toBeNull();
  });

  it('offers navigation to the neighbouring Chapters', () => {
    chapterService.getChapter.mockReturnValue(
      of(
        buildResponse({
          previous: { slug: 'prologue', title: 'Prologue' },
          next: { slug: 'chapter-two', title: 'Chapter Two' },
        }),
      ),
    );

    const element = render();

    expect(element.textContent).toContain('Prologue');
    expect(element.textContent).toContain('Chapter Two');
  });

  // Moving to the next Chapter changes the URL without leaving the component,
  // so the reader has to react to the parameters rather than read them once.
  it('reloads when the route moves to another Chapter', () => {
    render();
    params.next(
      new Map([
        ['storySlug', 'a-story'],
        ['chapterSlug', 'chapter-two'],
      ]),
    );

    expect(chapterService.getChapter).toHaveBeenCalledTimes(2);
    expect(chapterService.getChapter).toHaveBeenLastCalledWith(
      'a-story',
      'chapter-two',
    );
  });

  it('explains a Chapter with no content', () => {
    chapterService.getChapter.mockReturnValue(
      of(
        buildResponse({
          chapter: { ...buildResponse().chapter, contentHtml: null },
        } as Partial<ChapterWithNavigation>),
      ),
    );

    const element = render();

    expect(element.textContent).toContain('no content yet');
  });

  // A route without the parameters should still make a request that fails
  // cleanly, rather than throwing before it starts.
  it('asks for empty slugs when the route carries none', () => {
    params.next(new Map());

    render();

    expect(chapterService.getChapter).toHaveBeenCalledWith('', '');
  });

  it('explains a missing Chapter', () => {
    chapterService.getChapter.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be found',
    );
  });

  it('reports another failure differently', () => {
    chapterService.getChapter.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    render();

    expect(fixture.componentInstance.errorMessage).toContain(
      'could not be read',
    );
  });
});
