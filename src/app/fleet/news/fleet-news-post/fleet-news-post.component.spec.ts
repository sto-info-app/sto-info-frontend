import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { of, throwError } from 'rxjs';

import { FLEET_LINKS } from 'src/app/fleet/fleet-links';
import {
  newsPost,
  NewsReader,
  newsRoute,
} from 'src/app/fleet/news/fleet-news.testing';
import {
  findButton,
  pageText,
  pressButton,
} from 'src/app/fleet/recruitment/recruitment.testing';
import {
  FleetNewsPost,
  FleetNewsPostView,
} from 'src/app/models/fleet-news.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';

import {
  FLEET_NEWS_CHANGE_FAILED,
  FLEET_NEWS_POST_MISSING,
  FleetNewsPostComponent,
} from './fleet-news-post.component';

const FLEET_NEWS =
  '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/news';

describe('FleetNewsPostComponent', () => {
  let fixture: ComponentFixture<FleetNewsPostComponent>;
  let news: Record<string, jest.Mock>;
  let confirm: ConfirmPromptDouble;
  let navigate: jest.SpyInstance;

  /**
   * Draws the page.
   *
   * @param view - What the server answers.
   * @param reader - Who is reading, and where.
   */
  async function render(
    view: Partial<FleetNewsPostView> & { post?: FleetNewsPost } = {},
    reader: NewsReader = { onFleet: true, postSlug: 'refit-night-abc' },
  ): Promise<void> {
    news = {
      read: jest.fn(() =>
        of({
          post: newsPost(),
          mayWrite: false,
          isOpen: true,
          isSuspended: false,
          ...view,
        }),
      ),
      publish: jest.fn(() => of(newsPost())),
      unpublish: jest.fn(() => of(newsPost({ status: 'DRAFT' }))),
      remove: jest.fn(() => of(null)),
      unpublishAsSiteAdmin: jest.fn(() => of(null)),
      removeAsSiteAdmin: jest.fn(() => of(null)),
    };
    confirm = stubConfirmPrompt();

    await TestBed.configureTestingModule({
      imports: [FleetNewsPostComponent],
      providers: [...newsRoute(reader, news).providers, confirm.provider],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(FleetNewsPostComponent);
    fixture.detectChanges();
  }

  /**
   * The links on the page.
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

  it('shows a published post to its reader, in full', async () => {
    await render({
      post: newsPost({
        coverImageId: 'cover-1',
        coverImageUrl:
          'https://cdn.test/cdn-cgi/imagedelivery/hash/cover-1/public?sig=c',
        coverImageAlt: 'The fleet',
      }),
    });

    const text = pageText(fixture);
    const element = fixture.nativeElement as HTMLElement;

    expect(news.read).toHaveBeenCalledWith(
      { communityId: 'community-1', fleetId: 'fleet-1' },
      'refit-night-abc',
    );
    expect(text).toContain('Refit night');
    expect(text).toContain('Bring your ships.');
    expect(element.querySelector('strong')?.textContent).toBe('eight');
    expect(text).toContain('For: Anyone, including signed-out visitors');
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('The fleet');
    expect(links()).toContainEqual({
      text: 'FleetOwner',
      href: '/community/registry/profiles/FleetOwner',
    });
    expect(links()).toContainEqual({
      text: 'Back to the news',
      href: FLEET_NEWS,
    });
    expect(text).not.toContain('Edit');
    expect(findButton(fixture, 'Delete')).toBeUndefined();
  });

  it('names an author it may not link, and a draft’s last change', async () => {
    await render({
      mayWrite: true,
      post: newsPost({
        status: 'DRAFT',
        publishedAt: null,
        summary: null,
        author: { username: 'Hidden', linksToProfile: false },
        audience: 'FLEET_MEMBERS',
      }),
    });

    const text = pageText(fixture);

    expect(text).toContain('Draft');
    expect(text).toContain('Last changed');
    expect(text).toContain('Posted by Hidden');
    expect(text).toContain('For: Approved members of the Fleet');
    expect(links().map(link => link.text)).not.toContain('Hidden');
  });

  it('shows a post nobody can be named as writing', async () => {
    await render({ post: newsPost({ author: null }) });

    expect(pageText(fixture)).not.toContain('Posted by');
  });

  it('words an Armada’s and a Community’s members for what they are', async () => {
    await render(
      { post: newsPost({ audience: 'FLEET_MEMBERS' }) },
      { onArmada: true, postSlug: 'refit-night-abc' },
    );

    expect(pageText(fixture)).toContain('For: Members of the Armada’s Fleets');

    TestBed.resetTestingModule();
    await render(
      { post: newsPost({ audience: 'COMMUNITY' }) },
      { postSlug: 'refit-night-abc' },
    );

    expect(pageText(fixture)).toContain(
      'For: The Community’s followers and members',
    );
    expect(fixture.componentInstance.missingMessage).toBe(
      FLEET_NEWS_POST_MISSING,
    );
  });

  it('reads nothing when the address names no post', async () => {
    await render({}, { onFleet: true });

    expect(news.read).toHaveBeenCalledWith(expect.anything(), '');
    expect(fixture.componentInstance.notPermittedMessage).toBe('');
  });

  describe('for a news writer', () => {
    it('edits, unpublishes and deletes a published post', async () => {
      await render({ mayWrite: true });

      expect(links()).toContainEqual({
        text: 'Edit',
        href: `${FLEET_NEWS}/refit-night-abc/edit`,
      });

      pressButton(fixture, 'Unpublish');
      expect(confirm.lastAsked()?.title).toBe('Unpublish this post?');
      expect(news.unpublish).toHaveBeenCalledWith(
        { communityId: 'community-1', fleetId: 'fleet-1' },
        'post-1',
      );
      expect(news.read).toHaveBeenCalledTimes(2);

      pressButton(fixture, 'Delete');
      expect(confirm.lastAsked()?.message).toContain('Refit night');
      expect(news.remove).toHaveBeenCalledWith(expect.anything(), 'post-1');
      expect(navigate).toHaveBeenCalledWith(
        FLEET_LINKS.fleetNews(
          'united-federation-alliance',
          'pc',
          'ninth-fleet',
        ),
      );
    });

    it('publishes a draft', async () => {
      await render({
        mayWrite: true,
        post: newsPost({ status: 'DRAFT', publishedAt: null }),
      });

      pressButton(fixture, 'Publish');

      expect(news.publish).toHaveBeenCalledWith(expect.anything(), 'post-1');
      expect(news.read).toHaveBeenCalledTimes(2);
    });

    it('changes nothing when the question is declined', async () => {
      await render({ mayWrite: true });
      confirm.answer(false);

      pressButton(fixture, 'Unpublish');
      pressButton(fixture, 'Delete');

      expect(news.unpublish).not.toHaveBeenCalled();
      expect(news.remove).not.toHaveBeenCalled();
    });

    it('shows why a change was refused, or that it failed', async () => {
      await render({ mayWrite: true });
      news['unpublish'].mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                message: 'This Fleet is closed, so its news cannot change.',
              },
            }),
        ),
      );

      pressButton(fixture, 'Unpublish');

      expect(pageText(fixture)).toContain(
        'This Fleet is closed, so its news cannot change.',
      );
      expect(findButton(fixture, 'Unpublish')?.disabled).toBe(false);

      news['remove'].mockReturnValue(throwError(() => new Error('offline')));
      pressButton(fixture, 'Delete');

      expect(pageText(fixture)).toContain(FLEET_NEWS_CHANGE_FAILED);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('offers only deleting a closed scope’s draft', async () => {
      await render({
        mayWrite: true,
        isOpen: false,
        post: newsPost({ status: 'DRAFT', publishedAt: null }),
      });

      expect(findButton(fixture, 'Delete')).toBeDefined();
      expect(findButton(fixture, 'Publish')).toBeUndefined();
      expect(links().map(link => link.text)).not.toContain('Edit');
      expect(pageText(fixture)).toContain('its news can no longer change');
    });

    it('says a suspended scope’s news waits on reinstatement', async () => {
      await render({ mayWrite: true, isOpen: false, isSuspended: true });

      expect(pageText(fixture)).toContain('until it is reinstated');
      expect(pageText(fixture)).not.toContain('This is closed');
    });

    it('offers nothing on a closed scope’s published post', async () => {
      await render({ mayWrite: true, isOpen: false });

      expect(findButton(fixture, 'Delete')).toBeUndefined();
      expect(findButton(fixture, 'Unpublish')).toBeUndefined();
    });
  });

  describe('for a site administrator', () => {
    it('takes a post down, asking first', async () => {
      await render(
        {},
        {
          onFleet: true,
          postSlug: 'refit-night-abc',
          isSiteAdmin: true,
        },
      );

      pressButton(fixture, 'Unpublish as site administrator');
      expect(confirm.lastAsked()?.message).toContain('site administrator');
      expect(news.unpublishAsSiteAdmin).toHaveBeenCalledWith('post-1');

      pressButton(fixture, 'Delete as site administrator');
      expect(news.removeAsSiteAdmin).toHaveBeenCalledWith('post-1');
      expect(navigate).toHaveBeenCalled();
    });

    it('is offered a writer’s actions instead where they write news', async () => {
      await render(
        { mayWrite: true },
        { onFleet: true, postSlug: 'refit-night-abc', isSiteAdmin: true },
      );

      expect(
        findButton(fixture, 'Delete as site administrator'),
      ).toBeUndefined();
      expect(findButton(fixture, 'Delete')).toBeDefined();
    });
  });
});
