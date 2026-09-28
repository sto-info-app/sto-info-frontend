import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, Router } from '@angular/router';

import { of } from 'rxjs';

import {
  newsPage,
  newsPost,
  NewsReader,
  newsRoute,
  NewsRouteStubs,
} from 'src/app/fleet/news/fleet-news.testing';
import {
  findButton,
  pageText,
  pressButton,
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import { FleetNewsPage } from 'src/app/models/fleet-news.models';

import { FleetNewsListComponent } from './fleet-news-list.component';

describe('FleetNewsListComponent', () => {
  let fixture: ComponentFixture<FleetNewsListComponent>;
  let news: { list: jest.Mock };
  let route: NewsRouteStubs;
  let navigate: jest.SpyInstance;

  /**
   * Draws the page.
   *
   * @param reader - Who is reading, where, and what the address asks.
   * @param page - What the server answers.
   */
  async function render(
    reader: NewsReader = { onFleet: true },
    page: FleetNewsPage = newsPage([newsPost()]),
  ): Promise<void> {
    news = { list: jest.fn(() => of(page)) };
    route = newsRoute(reader, news);

    await TestBed.configureTestingModule({
      imports: [FleetNewsListComponent],
      providers: route.providers,
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(FleetNewsListComponent);
    fixture.detectChanges();
  }

  /**
   * The query the page last navigated to.
   *
   * @returns The query parameters.
   */
  function navigatedQuery(): Record<string, unknown> {
    return navigate.mock.lastCall[1].queryParams;
  }

  it('lists a Fleet’s posts for the reader, newest first', async () => {
    await render(undefined, {
      ...newsPage([
        newsPost({ coverImageId: 'cover-1', coverImageAlt: 'The fleet' }),
        newsPost({
          id: 'post-2',
          title: 'Members only',
          audience: 'FLEET_MEMBERS',
          summary: null,
          author: { username: 'Hidden', linksToProfile: false },
        }),
        newsPost({ id: 'post-3', title: 'Anonymous', author: null }),
      ]),
    });

    const text = pageText(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('a')).map(link =>
      link.getAttribute('href'),
    );

    expect(news.list).toHaveBeenCalledWith(
      { communityId: 'community-1', fleetId: 'fleet-1' },
      { pageSize: 10 },
    );
    expect(text).toContain('Refit night');
    expect(text).toContain('Bring your ships.');
    expect(text).toContain('Posted by FleetOwner');
    expect(text).toContain('Posted by Hidden');
    expect(text).toContain('Public');
    expect(text).toContain('Members only');
    expect(links).toContain(
      '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/news/refit-night-abc',
    );
    expect(links).toContain('/community/registry/profiles/FleetOwner');
    expect(links).not.toContain('/community/registry/profiles/Hidden');
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('The fleet');
    expect(text).not.toContain('Write a post');
    expect(findButton(fixture, 'Drafts')).toBeUndefined();
  });

  it('says when nothing has been published', async () => {
    await render(undefined, newsPage([]));

    expect(pageText(fixture)).toContain('Nothing has been published here yet.');
  });

  it('reads the page, the search and drafts from the address', async () => {
    await render(
      { onFleet: true, query: { page: '2', q: ' refit ', status: 'DRAFT' } },
      newsPage([], { mayWrite: true }),
    );

    expect(news.list).toHaveBeenCalledWith(expect.anything(), {
      page: 2,
      q: 'refit',
      status: 'DRAFT',
      pageSize: 10,
    });
    expect(pageText(fixture)).toContain('No post matches “refit”.');
    expect(
      (
        (fixture.nativeElement as HTMLElement).querySelector(
          '#fleet-news-search',
        ) as HTMLInputElement
      ).value,
    ).toBe('refit');
  });

  it('ignores what it cannot use in the address', async () => {
    await render({ onFleet: true, query: { page: 'x', status: 'OTHER' } });

    expect(news.list).toHaveBeenCalledWith(expect.anything(), {
      pageSize: 10,
    });
  });

  it('says when there are no drafts', async () => {
    await render(
      { onFleet: true, query: { status: 'DRAFT' } },
      newsPage([], { mayWrite: true }),
    );

    expect(pageText(fixture)).toContain('There are no drafts.');
    expect(findButton(fixture, 'Drafts')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('reads the news again when the address’s query changes', async () => {
    await render();

    route.query$.next(convertToParamMap({ page: '3' }));
    fixture.detectChanges();

    expect(news.list).toHaveBeenCalledTimes(2);
    expect(news.list).toHaveBeenLastCalledWith(expect.anything(), {
      page: 3,
      pageSize: 10,
    });
  });

  it('offers a news writer a new post and the drafts', async () => {
    await render(undefined, newsPage([], { mayWrite: true }));

    const write = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).find(link => link.textContent?.trim() === 'Write a post');

    expect(write?.getAttribute('href')).toBe(
      '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/news/write',
    );

    pressButton(fixture, 'Drafts');
    expect(navigatedQuery()).toEqual({ status: 'DRAFT', page: null });

    pressButton(fixture, 'Published');
    expect(navigatedQuery()).toEqual({ status: null, page: null });
  });

  it('tells a news writer when the scope is closed', async () => {
    await render(undefined, newsPage([], { mayWrite: true, isOpen: false }));

    const text = pageText(fixture);

    expect(text).not.toContain('Write a post');
    expect(text).toContain('This is closed, so its news can no longer change.');
  });

  it('searches from the first page, and clears the search', async () => {
    await render({ onFleet: true, query: { q: 'refit' } });

    typeInto(fixture, '#fleet-news-search', '  ship  ');
    pressButton(fixture, 'Search');
    expect(navigatedQuery()).toEqual({ q: 'ship', page: null });

    typeInto(fixture, '#fleet-news-search', '   ');
    pressButton(fixture, 'Search');
    expect(navigatedQuery()).toEqual({ q: null, page: null });

    pressButton(fixture, 'Clear');
    expect(navigatedQuery()).toEqual({ q: null, page: null });
    expect(fixture.componentInstance.search()).toBe('');
  });

  it('pages through the news', async () => {
    await render(
      { onFleet: true, query: { page: '2' } },
      newsPage([newsPost()], { total: 25, page: 2 }),
    );

    expect(pageText(fixture)).toContain('Page 2 of 3');

    pressButton(fixture, 'Older');
    expect(navigatedQuery()).toEqual({ page: 3 });

    pressButton(fixture, 'Newer');
    expect(navigatedQuery()).toEqual({ page: null });
  });

  it('counts at least one page', async () => {
    await render();

    expect(
      fixture.componentInstance.totalPages(newsPage([], { total: 0 })),
    ).toBe(1);
    expect(pageText(fixture)).not.toContain('Page 1 of');
  });

  it('draws an Armada’s tabs on its news', async () => {
    await render({ onArmada: true });

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-armada-tabs')).not.toBeNull();
    expect(news.list).toHaveBeenCalledWith(
      { communityId: 'community-1', fleetId: null, armadaId: 'armada-1' },
      { pageSize: 10 },
    );
  });

  it('leads a Community’s news back to the Community', async () => {
    await render({});

    const back = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).find(link => link.textContent?.trim().startsWith('Back to'));

    expect(back?.getAttribute('href')).toBe(
      '/fleets/communities/united-federation-alliance',
    );
    expect(fixture.componentInstance.notPermittedMessage).toBe('');
  });
});
