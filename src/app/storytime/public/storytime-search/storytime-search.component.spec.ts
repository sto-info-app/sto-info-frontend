import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import {
  SearchHit,
  SearchResults,
  StorytimeTargetType,
} from 'src/app/models/storytime.models';
import { SearchService } from '../../search.service';
import { StorytimeSearchComponent } from './storytime-search.component';

describe('StorytimeSearchComponent', () => {
  let fixture: ComponentFixture<StorytimeSearchComponent>;
  let searchService: { search: jest.Mock };
  let router: { navigate: jest.Mock };
  let queryParams: BehaviorSubject<Map<string, string>>;

  /**
   * Builds a search result.
   *
   * @param overrides - Fields to change.
   * @returns The result.
   */
  const buildHit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
    targetType: StorytimeTargetType.STORY,
    id: 'story-1',
    slug: 'voyager-home',
    title: 'Voyager Home',
    summary: 'A summary',
    storySlug: null,
    ...overrides,
  });

  /**
   * Builds a page of results.
   *
   * @param items - The results.
   * @returns The page.
   */
  const buildResults = (items: SearchHit[] = [buildHit()]): SearchResults => ({
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    countsByType: { STORY: items.length },
  });

  /**
   * Builds and renders the component.
   *
   * @returns The rendered element.
   */
  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(StorytimeSearchComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    queryParams = new BehaviorSubject(new Map([['q', 'voyager']]));
    searchService = {
      search: jest.fn().mockReturnValue(of(buildResults())),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [StorytimeSearchComponent],
      providers: [
        provideRouter([]),
        { provide: SearchService, useValue: searchService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParams, snapshot: {} },
        },
      ],
    });
  });

  // The query lives in the URL so a search can be shared and returned to.
  it('searches for whatever the address asks for', () => {
    const element = render();

    expect(searchService.search).toHaveBeenCalledWith('voyager', {
      types: undefined,
    });
    expect(element.textContent).toContain('Voyager Home');
  });

  it('searches again when the address changes', () => {
    render();

    queryParams.next(new Map([['q', 'enterprise']]));

    expect(searchService.search).toHaveBeenLastCalledWith('enterprise', {
      types: undefined,
    });
  });

  it('limits the search when the address names a kind', () => {
    queryParams.next(
      new Map([
        ['q', 'voyager'],
        ['type', 'ARC'],
      ]),
    );

    render();

    expect(searchService.search).toHaveBeenCalledWith('voyager', {
      types: [StorytimeTargetType.ARC],
    });
  });

  // Two characters is where the server starts answering; asking below that
  // would produce a refusal the reader has done nothing to deserve.
  it.each([[''], ['a'], ['  ']])('searches for nothing when given %p', term => {
    queryParams.next(new Map([['q', term]]));

    const element = render();

    expect(searchService.search).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Two letters is enough to start');
  });

  it('puts a new search in the address rather than running it directly', () => {
    render();
    fixture.componentInstance.form.patchValue({ q: '  enterprise  ' });
    fixture.componentInstance.submit();

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { q: 'enterprise', type: null },
      }),
    );
  });

  it('clears the search from the address when it is emptied', () => {
    render();
    fixture.componentInstance.form.patchValue({ q: '' });
    fixture.componentInstance.submit();

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { q: null, type: null } }),
    );
  });

  it('filters to one kind through the address', () => {
    render();
    fixture.componentInstance.filterTo('CHAPTER');

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { q: 'voyager', type: 'CHAPTER' },
      }),
    );
  });

  it('says so when nothing matched', () => {
    searchService.search.mockReturnValue(of(buildResults([])));

    const element = render();

    expect(element.textContent).toContain('Nothing matched that');
  });

  it('shows how many of each kind matched', () => {
    render();

    expect(fixture.componentInstance.countFor('STORY')).toBe(1);
    expect(fixture.componentInstance.countFor('')).toBe(1);
  });

  it('counts nothing before a search has run', () => {
    queryParams.next(new Map());

    render();

    expect(fixture.componentInstance.countFor('STORY')).toBe(0);
    expect(fixture.componentInstance.countFor('')).toBe(0);
  });

  it('counts nothing for a kind that matched nothing', () => {
    render();

    expect(fixture.componentInstance.countFor('ARC')).toBe(0);
  });

  describe('where a result leads', () => {
    it.each([
      [StorytimeTargetType.STORY, {}, 'stories/voyager-home'],
      [
        StorytimeTargetType.CHAPTER,
        { slug: 'first-contact', storySlug: 'voyager-home' },
        'stories/voyager-home/chapters/first-contact',
      ],
      [
        StorytimeTargetType.CHARACTER,
        { slug: 't-vel', storySlug: 'voyager-home' },
        'stories/voyager-home/characters/t-vel',
      ],
      [StorytimeTargetType.ARC, { slug: 'the-long-war' }, 'arcs/the-long-war'],
    ])('links a %s to its own page', (targetType, overrides, expected) => {
      render();

      const link = fixture.componentInstance
        .linkFor(buildHit({ targetType, ...overrides }))
        .join('/');

      expect(link).toContain(expected);
    });
  });

  it('reports a search that could not be run', () => {
    searchService.search.mockReturnValue(
      throwError(() => new Error('unavailable')),
    );

    const element = render();

    expect(element.textContent).toContain('could not be run');
    expect(fixture.componentInstance.results).toBeNull();
  });
});
