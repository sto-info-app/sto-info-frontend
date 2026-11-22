import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  InjectionToken,
  output,
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Where the picker reads its emoji from: English emojibase data, copied from
 * `emoji-picker-element-data` into the site's own assets at build time, so
 * nothing is fetched from another host and the CSP stays as it is.
 */
export const CHAT_EMOJI_DATA_SOURCE = '/assets/emoji/data.json';

/** Makes a picker element, ready to be put on the page. */
export type ChatEmojiPickerFactory = () => HTMLElement;

/**
 * Loads `emoji-picker-element` and gives back a way to make pickers. The
 * picker is its own chunk, fetched the first time somebody opens it, never
 * with the page.
 */
export const CHAT_EMOJI_PICKER_LOADER = new InjectionToken<
  () => Promise<ChatEmojiPickerFactory>
>('CHAT_EMOJI_PICKER_LOADER', {
  providedIn: 'root',
  factory: () => async () => {
    const [{ default: Picker }, { default: english }] = await Promise.all([
      import('emoji-picker-element/picker'),
      import('emoji-picker-element/i18n/en'),
    ]);
    // Its English is American; the site's is British.
    const i18n = {
      ...english,
      favoritesLabel: 'Favourites',
      emojiUnsupportedMessage: 'Your browser does not support colour emoji.',
    };

    return () =>
      new Picker({ dataSource: CHAT_EMOJI_DATA_SOURCE, locale: 'en', i18n });
  },
});

/** What the picker says of an emoji that was clicked. */
interface ChatEmojiClick {
  /** Its characters, with the skin tone chosen. Only custom emoji lack it. */
  readonly unicode?: string;
}

/**
 * The smiling face in the corner of chat's message box, and the emoji picker
 * it opens above it: search, categories, skin tones and those used most.
 *
 * The picker stays open so several can be added in a row, each one put in at
 * the caret. The face, Escape or a click anywhere else closes it; Escape
 * hands the focus back to the message box.
 */
@Component({
  selector: 'app-chat-emoji-button',
  templateUrl: './chat-emoji-button.component.html',
  styleUrls: ['./chat-emoji-button.component.scss'],
  standalone: true,
  host: { '(keydown.escape)': 'onEscape($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatEmojiButtonComponent {
  private readonly _load = inject(CHAT_EMOJI_PICKER_LOADER);
  private readonly _host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly _renderer = inject(Renderer2);

  /** An emoji was picked: its characters, to put in at the caret. */
  readonly picked = output<string>();
  /** Escape closed the picker, so the message box should take the focus. */
  readonly dismissed = output<void>();

  readonly isOpen = signal(false);
  readonly failed = signal(false);

  /** Makes the picker, once its code has come. */
  private readonly _factory = signal<ChatEmojiPickerFactory | null>(null);
  readonly isReady = computed(() => this._factory() !== null);

  private readonly _slot = viewChild<ElementRef<HTMLElement>>('slot');
  /** Kept between openings, so it remembers where it was. */
  private _picker: HTMLElement | null = null;
  private _loading: Promise<void> | null = null;
  private _stopWatchingClicks: (() => void) | null = null;

  constructor() {
    // The picker goes into the panel each time the panel is drawn, once
    // there is one to put there. This runs again only for a new panel or the
    // picker's code coming, never with the picker already in place.
    afterRenderEffect(() => {
      const slot = this._slot()?.nativeElement;
      const make = this._factory();

      if (slot === undefined || make === null) {
        return;
      }

      this._picker ??= this.create(make);
      slot.append(this._picker);
    });

    inject(DestroyRef).onDestroy(() => this.stopWatchingClicks());
  }

  /** Opens the picker, or closes it. */
  protected toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Closes the picker on Escape and hands the focus back to the message box.
   *
   * @param event - The key.
   */
  protected onEscape(event: Event): void {
    if (!this.isOpen()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.close();
    this.dismissed.emit();
  }

  private open(): void {
    this.failed.set(false);
    this.isOpen.set(true);
    this._loading ??= this._load().then(
      make => this._factory.set(make),
      () => {
        // Tried again the next time it opens.
        this._loading = null;
        this.failed.set(true);
      },
    );

    // A press anywhere outside closes it, the message box included.
    this._stopWatchingClicks = this._renderer.listen(
      'document',
      'pointerdown',
      (event: PointerEvent) => {
        if (!this._host.contains(event.target as Node)) {
          this.close();
        }
      },
    );
  }

  private close(): void {
    this.isOpen.set(false);
    this.stopWatchingClicks();
  }

  private stopWatchingClicks(): void {
    this._stopWatchingClicks?.();
    this._stopWatchingClicks = null;
  }

  private create(make: ChatEmojiPickerFactory): HTMLElement {
    const picker = make();

    picker.addEventListener('emoji-click', event => {
      // No custom emoji are given to the picker, so every one has its
      // characters.
      const { unicode } = (event as CustomEvent<ChatEmojiClick>).detail;

      this.picked.emit(unicode as string);
    });

    return picker;
  }
}
