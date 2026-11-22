import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpGuideVideo } from '../help.models';
import { HelpVideoComponent } from './help-video.component';

describe('HelpVideoComponent', () => {
  let fixture: ComponentFixture<HelpVideoComponent>;

  const VIDEO: HelpGuideVideo = {
    videoId: 'v0ZLFFfK8HY',
    title: 'Finding a Fleet on STO Info',
  };

  /**
   * Builds and renders the component.
   *
   * @param video - The video to show.
   * @returns The rendered element.
   */
  const render = (video: HelpGuideVideo = VIDEO): HTMLElement => {
    fixture = TestBed.createComponent(HelpVideoComponent);
    fixture.componentRef.setInput('video', video);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  /**
   * Presses play the way a reader would.
   *
   * @param element - The rendered element.
   */
  const pressPlay = (element: HTMLElement): void => {
    element.querySelector<HTMLButtonElement>('.help-video__poster')?.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HelpVideoComponent] });
  });

  it('should show the full-size still, and load nothing from YouTube, until play is pressed', () => {
    const element = render();

    expect(element.querySelector('iframe')).toBeNull();
    expect(
      element.querySelector<HTMLImageElement>('.help-video__still')?.src,
    ).toBe('https://i.ytimg.com/vi/v0ZLFFfK8HY/maxresdefault.jpg');
  });

  it('should name the button after the video for a screen reader', () => {
    const element = render();

    expect(
      element.querySelector('.help-video__poster .sr-only')?.textContent,
    ).toBe('Play the video: Finding a Fleet on STO Info');
  });

  it('should fall back to the still every video has when the full-size one is missing', () => {
    const element = render();
    const still = element.querySelector<HTMLImageElement>('.help-video__still');

    still?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(still?.src).toBe('https://i.ytimg.com/vi/v0ZLFFfK8HY/hqdefault.jpg');
  });

  it('should play the video from the no-cookie host once play is pressed', () => {
    const element = render();

    pressPlay(element);

    const player = element.querySelector('iframe');
    expect(player?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/v0ZLFFfK8HY?autoplay=1',
    );
    expect(player?.getAttribute('title')).toBe('Finding a Fleet on STO Info');
    expect(element.querySelector('.help-video__poster')).toBeNull();
  });

  it('should load no player for an identifier that is not one', () => {
    const element = render({ videoId: 'not an id', title: 'Broken' });

    pressPlay(element);

    expect(element.querySelector('iframe')).toBeNull();
  });

  it('should link to the video on YouTube in a new tab', () => {
    const link = render().querySelector<HTMLAnchorElement>(
      '.help-video__caption a',
    );

    expect(link?.href).toBe('https://www.youtube.com/watch?v=v0ZLFFfK8HY');
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toBe('noopener noreferrer');
  });
});
