import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CHAT_EMOJI_DATA_SOURCE,
  CHAT_EMOJI_PICKER_LOADER,
  ChatEmojiButtonComponent,
  ChatEmojiPickerFactory,
} from './chat-emoji-button.component';

jest.mock('emoji-picker-element/picker', () => ({
  __esModule: true,
  default: class {
    readonly options: unknown;

    constructor(options: unknown) {
      this.options = options;
    }
  },
}));

jest.mock('emoji-picker-element/i18n/en', () => ({
  __esModule: true,
  default: { searchLabel: 'Search', favoritesLabel: 'Favorites' },
}));

describe('ChatEmojiButtonComponent', () => {
  let fixture: ComponentFixture<ChatEmojiButtonComponent>;
  let element: HTMLElement;
  let load: jest.Mock<Promise<ChatEmojiPickerFactory>>;
  let made: HTMLElement[];
  let picked: string[];
  let dismissed: number;

  beforeEach(() => {
    made = [];
    load = jest.fn(() =>
      Promise.resolve(() => {
        const picker = document.createElement('emoji-picker');

        made.push(picker);

        return picker;
      }),
    );
    TestBed.configureTestingModule({
      imports: [ChatEmojiButtonComponent],
      providers: [{ provide: CHAT_EMOJI_PICKER_LOADER, useValue: load }],
    });
  });

  afterEach(() => {
    fixture?.destroy();
  });

  /** Shows the button. */
  function show(): void {
    fixture = TestBed.createComponent(ChatEmojiButtonComponent);
    fixture.componentInstance.picked.subscribe(emoji => picked.push(emoji));
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    picked = [];
    dismissed = 0;
    fixture.autoDetectChanges();
    element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
  }

  /**
   * Holds the picker's code back on its next load, until let go.
   *
   * @returns What lets it come.
   */
  function held(): () => void {
    let release: () => void = () => undefined;
    const fallback =
      load.getMockImplementation() as () => Promise<ChatEmojiPickerFactory>;

    load.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          release = () => resolve(fallback());
        }),
    );

    return () => release();
  }

  /** Lets the picker's code come and the panel draw it. */
  async function settle(): Promise<void> {
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
  }

  const toggle = (): HTMLButtonElement =>
    element.querySelector('.chat-emoji__toggle') as HTMLButtonElement;
  const panel = (): HTMLElement | null =>
    element.querySelector('#chat-emoji-panel');
  const note = (): string | undefined =>
    element.querySelector('.chat-emoji__note')?.textContent?.trim();
  const shown = (): Element | null =>
    element.querySelector('.chat-emoji__picker emoji-picker');

  /**
   * Clicks an emoji in the picker, as the picker says it.
   *
   * @param unicode - Its characters.
   */
  function choose(unicode: string): void {
    shown()?.dispatchEvent(
      new CustomEvent('emoji-click', { detail: { unicode } }),
    );
  }

  /**
   * Presses Escape somewhere in the button.
   *
   * @param target - Where.
   * @returns The key's event.
   */
  function escape(target: Element): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });

    target.dispatchEvent(event);
    fixture.detectChanges();

    return event;
  }

  /**
   * Presses the pointer down on something.
   *
   * @param target - What.
   */
  function press(target: EventTarget): void {
    target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
  }

  it('shows only the face until it is pressed, loading nothing', () => {
    show();

    expect(toggle().getAttribute('aria-label')).toBe('Add an emoji');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-controls')).toBe('chat-emoji-panel');
    expect(
      toggle().querySelector('i')?.classList.contains('fa-face-smile'),
    ).toBe(true);
    expect(panel()).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it('opens the picker above the box, saying so while its code comes', async () => {
    const made$ = held();

    show();
    toggle().click();
    fixture.detectChanges();

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.tagName).toBe('FIELDSET');
    expect(panel()?.getAttribute('aria-label')).toBe('Emoji');
    expect(note()).toBe('Loading emoji…');

    made$();
    await settle();

    expect(note()).toBeUndefined();
    expect(shown()).toBe(made[0]);
  });

  it('gives each emoji picked, and stays open for another', async () => {
    show();
    toggle().click();
    await settle();

    choose('👍');
    choose('🖖🏽');

    expect(picked).toEqual(['👍', '🖖🏽']);
    expect(panel()).not.toBeNull();
  });

  it('closes on the face again, then opens the same picker without loading again', async () => {
    show();
    toggle().click();
    await settle();
    toggle().click();
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');

    toggle().click();
    await settle();

    expect(load).toHaveBeenCalledTimes(1);
    expect(made).toHaveLength(1);
    expect(shown()).toBe(made[0]);
  });

  it('closes on Escape and hands the focus back, leaving Escape alone while closed', async () => {
    show();

    expect(escape(toggle()).defaultPrevented).toBe(false);
    expect(dismissed).toBe(0);

    toggle().click();
    await settle();
    const event = escape(shown() as Element);

    expect(event.defaultPrevented).toBe(true);
    expect(panel()).toBeNull();
    expect(dismissed).toBe(1);
  });

  it('closes on a press outside it, not inside', async () => {
    show();
    toggle().click();
    await settle();

    press(shown() as Element);

    expect(panel()).not.toBeNull();

    press(document.body);

    expect(panel()).toBeNull();

    // No longer listening once closed.
    toggle().click();
    await settle();
    press(document.body);
    press(document.body);

    expect(panel()).toBeNull();
  });

  it('says when the picker could not be loaded, and tries again when opened again', async () => {
    load.mockReturnValueOnce(Promise.reject(new Error('offline')));
    show();
    toggle().click();
    await settle();

    expect(note()).toBe('Emoji could not be loaded. Close this and try again.');
    expect(shown()).toBeNull();

    const made$ = held();

    toggle().click();
    toggle().click();
    fixture.detectChanges();

    expect(note()).toBe('Loading emoji…');

    made$();
    await settle();

    expect(load).toHaveBeenCalledTimes(2);
    expect(shown()).toBe(made[0]);
  });

  it('stops listening for presses when it goes', async () => {
    show();
    toggle().click();
    await settle();
    const remove = jest.spyOn(document, 'removeEventListener');

    fixture.destroy();

    expect(remove.mock.calls.some(([type]) => type === 'pointerdown')).toBe(
      true,
    );
    remove.mockRestore();
  });
});

describe('CHAT_EMOJI_PICKER_LOADER', () => {
  it('loads a picker reading the site’s own English emoji data, in British English', async () => {
    const make = await TestBed.inject(CHAT_EMOJI_PICKER_LOADER)();

    expect((make() as unknown as { options: unknown }).options).toEqual({
      dataSource: CHAT_EMOJI_DATA_SOURCE,
      locale: 'en',
      i18n: {
        searchLabel: 'Search',
        favoritesLabel: 'Favourites',
        emojiUnsupportedMessage: 'Your browser does not support colour emoji.',
      },
    });
    expect(CHAT_EMOJI_DATA_SOURCE).toBe('/assets/emoji/data.json');
  });
});
