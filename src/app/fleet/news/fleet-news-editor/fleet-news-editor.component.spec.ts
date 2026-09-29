import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { of, throwError } from 'rxjs';

import { FleetImageSlot } from 'src/app/fleet/fleet-image.constants';
import { FleetImageService } from 'src/app/fleet/fleet-image.service';
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
  typeInto,
} from 'src/app/fleet/recruitment/recruitment.testing';
import { FleetNewsPost } from 'src/app/models/fleet-news.models';
import {
  ConfirmPromptDouble,
  stubConfirmPrompt,
} from 'src/app/shared/actions/confirm-prompt.testing';

import {
  FLEET_NEWS_COVER_REMOVE_FAILED,
  FLEET_NEWS_EDITOR_NOT_PERMITTED,
  FLEET_NEWS_SAVE_FAILED,
  FleetNewsEditorComponent,
} from './fleet-news-editor.component';

const FLEET = { communityId: 'community-1', fleetId: 'fleet-1' };
const FLEET_NEWS = FLEET_LINKS.fleetNews(
  'united-federation-alliance',
  'pc',
  'ninth-fleet',
);
const WRITER: NewsReader = { onFleet: true, capabilities: ['news.write'] };

describe('FleetNewsEditorComponent', () => {
  let fixture: ComponentFixture<FleetNewsEditorComponent>;
  let news: Record<string, jest.Mock>;
  let images: { remove: jest.Mock };
  let dialog: ConfirmPromptDouble;
  let navigate: jest.SpyInstance;

  /**
   * Draws the page.
   *
   * @param reader - Who is writing, where, and which post.
   * @param post - The post the server answers with, when one is named.
   */
  async function render(
    reader: NewsReader = WRITER,
    post: FleetNewsPost = newsPost({ status: 'DRAFT', publishedAt: null }),
  ): Promise<void> {
    news = {
      read: jest.fn(() => of({ post, mayWrite: true, isOpen: true })),
      create: jest.fn((_target, draft) =>
        of(
          newsPost({
            ...draft,
            id: 'post-9',
            slug: 'new-post-xyz',
            status: 'DRAFT',
          }),
        ),
      ),
      update: jest.fn((_target, _id, draft) => of({ ...post, ...draft })),
      publish: jest.fn((_target, id) =>
        of(newsPost({ id, slug: 'new-post-xyz', status: 'PUBLISHED' })),
      ),
    };
    images = { remove: jest.fn(() => of(undefined)) };
    dialog = stubConfirmPrompt();

    await TestBed.configureTestingModule({
      imports: [FleetNewsEditorComponent],
      providers: [
        ...newsRoute(reader, news).providers,
        dialog.provider,
        { provide: FleetImageService, useValue: images },
      ],
    }).compileComponents();

    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(FleetNewsEditorComponent);
    fixture.detectChanges();
  }

  /**
   * Chooses an audience as a writer would.
   *
   * @param value - The audience.
   */
  function chooseAudience(value: string): void {
    const radio = (fixture.nativeElement as HTMLElement).querySelector(
      `input[type="radio"][value="${value}"]`,
    ) as HTMLInputElement;

    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('is for the scope’s news writers', async () => {
    await render({ onFleet: true });

    expect(pageText(fixture)).toContain(FLEET_NEWS_EDITOR_NOT_PERMITTED);
    expect(news.read).not.toHaveBeenCalled();
  });

  it('is closed with the scope', async () => {
    await render({ ...WRITER, closed: true });

    expect(pageText(fixture)).toContain(FLEET_NEWS_EDITOR_NOT_PERMITTED);
  });

  describe('a new post', () => {
    it('starts empty and public, and cannot be saved empty', async () => {
      await render();

      const text = pageText(fixture);

      expect(text).toContain('Write a post');
      expect(text).toContain('Save the post as a draft first');
      expect(news.read).not.toHaveBeenCalled();
      expect(
        (
          (fixture.nativeElement as HTMLElement).querySelector(
            'input[value="PUBLIC"]',
          ) as HTMLInputElement
        ).checked,
      ).toBe(true);
      expect(findButton(fixture, 'Save draft')?.disabled).toBe(true);

      fixture.componentInstance.onSave({} as never, null, false);
      expect(news.create).not.toHaveBeenCalled();
    });

    it('saves a draft and opens it here again, for its cover', async () => {
      await render();

      typeInto(fixture, '#fleet-news-title', '  Refit night  ');
      typeInto(fixture, '#fleet-news-summary', '   ');
      typeInto(fixture, '#fleet-news-body', 'Friday.');
      chooseAudience('FLEET_MEMBERS');
      pressButton(fixture, 'Save draft');

      expect(news.create).toHaveBeenCalledWith(FLEET, {
        title: 'Refit night',
        summary: null,
        body: 'Friday.',
        audience: 'FLEET_MEMBERS',
      });
      expect(news.publish).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith([
        ...FLEET_NEWS,
        'new-post-xyz',
        'edit',
      ]);
    });

    it('publishes straight away, and opens the post', async () => {
      await render();

      typeInto(fixture, '#fleet-news-title', 'Refit night');
      typeInto(fixture, '#fleet-news-summary', ' Bring ships ');
      typeInto(fixture, '#fleet-news-body', 'Friday.');
      pressButton(fixture, 'Publish');

      expect(news.create).toHaveBeenCalledWith(
        FLEET,
        expect.objectContaining({ summary: 'Bring ships', audience: 'PUBLIC' }),
      );
      expect(news.publish).toHaveBeenCalledWith(FLEET, 'post-9');
      expect(navigate).toHaveBeenCalledWith([...FLEET_NEWS, 'new-post-xyz']);
    });

    it('previews the body as it will read', async () => {
      await render();

      typeInto(fixture, '#fleet-news-body', 'Friday at **eight**.');
      pressButton(fixture, 'Preview');

      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('strong')?.textContent).toBe('eight');
      expect(element.querySelector('#fleet-news-body')).toBeNull();

      pressButton(fixture, 'Write');
      expect(element.querySelector('#fleet-news-body')).not.toBeNull();
    });

    it('shows why a save was refused, or that it failed', async () => {
      await render();
      news['create'].mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'Please give the post a title' },
            }),
        ),
      );

      typeInto(fixture, '#fleet-news-title', 'T');
      typeInto(fixture, '#fleet-news-body', 'B');
      pressButton(fixture, 'Save draft');

      expect(pageText(fixture)).toContain('Please give the post a title');

      news['create'].mockReturnValue(throwError(() => new Error('offline')));
      pressButton(fixture, 'Save draft');

      expect(pageText(fixture)).toContain(FLEET_NEWS_SAVE_FAILED);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('cancels back to the news', async () => {
      await render();

      const cancel = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
      ).find(link => link.textContent?.trim() === 'Cancel');

      expect(cancel?.getAttribute('href')).toBe(
        '/fleets/communities/united-federation-alliance/fleets/pc/ninth-fleet/news',
      );
    });
  });

  describe('a post being changed', () => {
    const EDITING: NewsReader = { ...WRITER, postSlug: 'refit-night-abc' };

    it('fills the form from the draft, and saves it', async () => {
      await render(EDITING);

      expect(news.read).toHaveBeenCalledWith(FLEET, 'refit-night-abc');
      expect(pageText(fixture)).toContain('Edit a post');
      expect(fixture.componentInstance.title()).toBe('Refit night');
      expect(fixture.componentInstance.summary()).toBe('Bring your ships.');

      typeInto(fixture, '#fleet-news-title', 'Refit night, moved');
      pressButton(fixture, 'Save draft');

      expect(news.update).toHaveBeenCalledWith(
        FLEET,
        'post-1',
        expect.objectContaining({ title: 'Refit night, moved' }),
      );
      expect(navigate).toHaveBeenCalledWith([...FLEET_NEWS, 'refit-night-abc']);
    });

    it('saves a published post’s changes without publishing it again', async () => {
      await render(
        EDITING,
        newsPost({
          summary: null,
          coverImageId: 'c-1',
          coverImageUrl:
            'https://cdn.test/cdn-cgi/imagedelivery/hash/c-1/public?sig=c',
        }),
      );

      expect(fixture.componentInstance.summary()).toBe('');
      expect(findButton(fixture, 'Publish')).toBeUndefined();

      pressButton(fixture, 'Save changes');
      // Publishing what is already published publishes nothing again.
      fixture.componentInstance.onSave(
        {
          target: FLEET,
          scopeLink: FLEET_LINKS.fleet(
            'united-federation-alliance',
            'pc',
            'ninth-fleet',
          ),
        } as never,
        newsPost(),
        true,
      );

      expect(news.update).toHaveBeenCalledTimes(2);
      expect(news.publish).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith([...FLEET_NEWS, 'refit-night-abc']);
    });

    it('publishes a draft on saving', async () => {
      await render(EDITING);

      pressButton(fixture, 'Publish');

      expect(news.update).toHaveBeenCalled();
      expect(news.publish).toHaveBeenCalledWith(FLEET, 'post-1');
    });

    it('cancels back to the post', async () => {
      await render(EDITING);

      const cancel = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
      ).find(link => link.textContent?.trim() === 'Cancel');

      expect(cancel?.getAttribute('href')).toContain('/news/refit-night-abc');
    });

    it('sets a cover, keeping what has been typed', async () => {
      await render({
        onArmada: true,
        capabilities: ['news.write'],
        postSlug: 'refit-night-abc',
      });

      typeInto(fixture, '#fleet-news-title', 'Typed');
      pressButton(fixture, 'Set the cover');

      expect(dialog.dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: {
            slot: FleetImageSlot.COVER,
            target: {
              kind: 'NEWS_POST',
              communityId: 'community-1',
              fleetId: null,
              armadaId: 'armada-1',
              postId: 'post-1',
            },
            scopeName: 'Refit night',
            currentAlt: null,
          },
        }),
      );
      expect(news.read).toHaveBeenCalledTimes(2);
      expect(fixture.componentInstance.title()).toBe('Typed');
    });

    it('reads nothing again when no cover was set', async () => {
      await render(EDITING);
      dialog.answer(false);

      pressButton(fixture, 'Set the cover');

      expect(news.read).toHaveBeenCalledTimes(1);
    });

    it('replaces and removes a cover, asking first', async () => {
      await render(
        EDITING,
        newsPost({
          status: 'DRAFT',
          coverImageId: 'cover-1',
          coverImageUrl:
            'https://cdn.test/cdn-cgi/imagedelivery/hash/cover-1/public?sig=c',
          coverImageAlt: 'The fleet',
        }),
      );

      expect(
        (fixture.nativeElement as HTMLElement)
          .querySelector('.fleet-news__cover')
          ?.getAttribute('alt'),
      ).toBe('The fleet');
      expect(findButton(fixture, 'Replace the cover')).toBeDefined();

      pressButton(fixture, 'Remove the cover');

      expect(images.remove).toHaveBeenCalledWith(
        {
          kind: 'NEWS_POST',
          communityId: 'community-1',
          fleetId: 'fleet-1',
          armadaId: null,
          postId: 'post-1',
        },
        FleetImageSlot.COVER,
      );
      expect(news.read).toHaveBeenCalledTimes(2);
    });

    it('keeps the cover when the question is declined, and says when removing fails', async () => {
      await render(
        EDITING,
        newsPost({
          coverImageId: 'cover-1',
          coverImageUrl:
            'https://cdn.test/cdn-cgi/imagedelivery/hash/cover-1/public?sig=c',
        }),
      );
      dialog.answer(false);

      pressButton(fixture, 'Remove the cover');
      expect(images.remove).not.toHaveBeenCalled();

      dialog.answer(true);
      images.remove.mockReturnValue(throwError(() => new Error('offline')));
      pressButton(fixture, 'Remove the cover');

      expect(pageText(fixture)).toContain(FLEET_NEWS_COVER_REMOVE_FAILED);
    });
  });

  it('words each audience for a Community', async () => {
    await render({ capabilities: ['news.write'] });

    expect(pageText(fixture)).toContain('Members of the Community');
  });
});
