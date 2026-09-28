import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { of, throwError } from 'rxjs';

import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import { newsPage, newsPost } from 'src/app/fleet/news/fleet-news.testing';
import { FleetNewsService } from 'src/app/fleet/news/fleet-news.service';
import { pageText } from 'src/app/fleet/recruitment/recruitment.testing';

import {
  FleetNewsLatestComponent,
  FleetNewsLatestVm,
} from './fleet-news-latest.component';

const VM: FleetNewsLatestVm = {
  target: { communityId: 'community-1', fleetId: null, armadaId: null },
  newsLink: FLEET_LINKS.communityNews('united-federation-alliance'),
};

describe('FleetNewsLatestComponent', () => {
  let fixture: ComponentFixture<FleetNewsLatestComponent>;
  let news: { list: jest.Mock };

  /**
   * Draws the section.
   *
   * @param answer - What the server answers.
   */
  async function render(
    answer: ReturnType<FleetNewsService['list']>,
  ): Promise<void> {
    news = { list: jest.fn(() => answer) };

    await TestBed.configureTestingModule({
      imports: [FleetNewsLatestComponent],
      providers: [
        provideRouter([]),
        { provide: FleetNewsService, useValue: news },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FleetNewsLatestComponent);
    fixture.componentRef.setInput('vm', VM);
    fixture.detectChanges();
  }

  /**
   * The links in the section.
   *
   * @returns Each link's text and address.
   */
  function links(): { text: string; href: string | null }[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).map(link => ({
      text: String(link.textContent).trim(),
      href: link.getAttribute('href'),
    }));
  }

  it('shows the latest three posts, and the way to the rest', async () => {
    await render(
      of(
        newsPage([
          newsPost(),
          newsPost({
            id: 'post-2',
            title: 'Draft',
            publishedAt: null,
            summary: null,
          }),
        ]),
      ),
    );

    expect(news.list).toHaveBeenCalledWith(VM.target, { pageSize: 3 });
    expect(pageText(fixture)).toContain('Bring your ships.');
    expect(links()).toEqual([
      {
        text: 'Refit night',
        href: '/fleets/communities/united-federation-alliance/news/refit-night-abc',
      },
      {
        text: 'Draft',
        href: '/fleets/communities/united-federation-alliance/news/refit-night-abc',
      },
      {
        text: 'All news',
        href: '/fleets/communities/united-federation-alliance/news',
      },
    ]);
  });

  it('says when nothing is published, and offers a writer a new post', async () => {
    await render(of(newsPage([], { mayWrite: true })));

    expect(pageText(fixture)).toContain('Nothing has been published here yet.');
    expect(links()).toContainEqual({
      text: 'Write a post',
      href: '/fleets/communities/united-federation-alliance/news/write',
    });
  });

  it('offers no new post while the Community is closed', async () => {
    await render(of(newsPage([], { mayWrite: true, isOpen: false })));

    expect(links().map(link => link.text)).toEqual(['All news']);
  });

  it('keeps the way to the news when the posts could not be read', async () => {
    await render(throwError(() => new Error('offline')));

    expect(pageText(fixture)).not.toContain('Nothing has been published');
    expect(links().map(link => link.text)).toEqual(['All news']);
  });
});
