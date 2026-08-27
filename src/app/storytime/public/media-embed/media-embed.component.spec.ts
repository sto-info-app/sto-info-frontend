import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChapterMedia, MediaProvider } from 'src/app/models/storytime.models';
import { MediaEmbedComponent } from './media-embed.component';

describe('MediaEmbedComponent', () => {
  let fixture: ComponentFixture<MediaEmbedComponent>;

  /**
   * Builds a video.
   *
   * @param overrides - Fields to change.
   * @returns The video.
   */
  const buildMedia = (overrides: Partial<ChapterMedia> = {}): ChapterMedia =>
    ({
      id: 'media-1',
      chapterId: 'chapter-1',
      provider: MediaProvider.YOUTUBE,
      externalId: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      title: null,
      caption: null,
      startSeconds: null,
      endSeconds: null,
      isPrimary: false,
      orderIndex: 1000,
      ...overrides,
    }) as ChapterMedia;

  /**
   * Builds and renders the component.
   *
   * @param media - The video to show.
   * @returns The rendered element.
   */
  const render = (media: ChapterMedia = buildMedia()): HTMLElement => {
    fixture = TestBed.createComponent(MediaEmbedComponent);
    fixture.componentRef.setInput('media', media);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Presses the play button the way a reader would.
   *
   * Clicked rather than calling the method, so the test exercises the same
   * path a reader takes and the rendered result is what they would see.
   *
   * @param element - The rendered element.
   */
  const pressPlay = (element: HTMLElement): void => {
    element
      .querySelector<HTMLButtonElement>('.storytime-media__poster')
      ?.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MediaEmbedComponent] });
  });

  // The whole point of the component: an iframe rendered on load would
  // announce every reader to YouTube before they had decided to watch anything.
  describe('before the reader presses play', () => {
    it('loads no iframe at all', () => {
      const element = render();

      expect(element.querySelector('iframe')).toBeNull();
      expect(fixture.componentInstance.embedSource).toBeNull();
    });

    it('shows the still instead', () => {
      const element = render();
      const thumbnail = element.querySelector('.storytime-media__thumbnail');

      expect(thumbnail?.getAttribute('src')).toContain('i.ytimg.com');
    });

    it('says plainly that nothing has been loaded', () => {
      const element = render();

      expect(element.textContent).toContain('until you press play');
    });
  });

  describe('once the reader presses play', () => {
    it('loads the embed', () => {
      const element = render();

      pressPlay(element);

      expect(element.querySelector('iframe')).not.toBeNull();
    });

    // Playback goes through the no-cookie host so a reader who does press play
    // is not handed a tracking cookie with the video.
    it('embeds through the no-cookie host', () => {
      render();

      fixture.componentInstance.play();

      expect(String(fixture.componentInstance.embedSource)).toContain(
        'youtube-nocookie.com',
      );
    });

    // Pressing play means play: without this the reader has to press twice.
    it('starts playback automatically', () => {
      render();

      fixture.componentInstance.play();

      expect(String(fixture.componentInstance.embedSource)).toContain(
        'autoplay=1',
      );
    });

    it('ignores malformed embed URLs', () => {
      const element = render(buildMedia({ embedUrl: 'not-a-url' }));

      fixture.componentInstance.play();

      expect(fixture.componentInstance.embedSource).toBeNull();
      expect(element.querySelector('iframe')).toBeNull();
    });

    it('ignores non-YouTube embed hosts', () => {
      const element = render(
        buildMedia({ embedUrl: 'https://example.com/embed/video' }),
      );

      fixture.componentInstance.play();

      expect(fixture.componentInstance.embedSource).toBeNull();
      expect(element.querySelector('iframe')).toBeNull();
    });

    it('keeps the clip the server built', () => {
      render(
        buildMedia({
          embedUrl:
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=10&end=20',
        }),
      );

      fixture.componentInstance.play();
      const source = String(fixture.componentInstance.embedSource);

      expect(source).toContain('start=10');
      expect(source).toContain('end=20');
      expect(source).toContain('&autoplay=1');
    });

    it('stops the reader having to press play twice', () => {
      const element = render();

      pressPlay(element);

      expect(element.querySelector('.storytime-media__poster')).toBeNull();
      expect(element.textContent).not.toContain('until you press play');
    });
  });

  describe('what it is announced as', () => {
    it('uses the creator’s title when there is one', () => {
      const element = render(buildMedia({ title: 'The escape' }));

      expect(fixture.componentInstance.label).toBe('The escape');
      expect(element.textContent).toContain('Play The escape');
    });

    // A video with no title still needs something a screen reader can say.
    it('falls back to a plain description', () => {
      render();

      expect(fixture.componentInstance.label).toBe('Embedded video');
    });

    it('titles the iframe too, once loaded', () => {
      const element = render(buildMedia({ title: 'The escape' }));

      pressPlay(element);

      expect(element.querySelector('iframe')?.getAttribute('title')).toBe(
        'The escape',
      );
    });
  });

  describe('the caption', () => {
    it('shows the title and caption together', () => {
      const element = render(
        buildMedia({ title: 'The escape', caption: 'Shot on Risa.' }),
      );

      expect(element.textContent).toContain('The escape');
      expect(element.textContent).toContain('Shot on Risa.');
    });

    it('shows nothing when there is neither', () => {
      const element = render();

      expect(element.querySelector('figcaption')).toBeNull();
    });

    it('shows a caption with no title', () => {
      const element = render(buildMedia({ caption: 'Shot on Risa.' }));

      expect(element.querySelector('figcaption')).not.toBeNull();
      expect(element.textContent).toContain('Shot on Risa.');
    });
  });

  // The still is decorative: the caption and the button label already say what
  // the video is, so announcing the thumbnail again would only repeat it.
  it('leaves the still out of the accessibility tree', () => {
    const element = render(buildMedia({ title: 'The escape' }));

    expect(
      element.querySelector('.storytime-media__thumbnail')?.getAttribute('alt'),
    ).toBe('');
  });
});
