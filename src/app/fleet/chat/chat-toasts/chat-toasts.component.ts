import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { ChatNotice } from 'src/app/models/fleet-chat.models';

import { ChatSocketService } from '../chat-socket.service';
import { chatAuthorName } from '../chat.text';

/** How long a toast stays, in milliseconds. */
export const CHAT_TOAST_MS = 8_000;

/** A toast on screen. */
export interface ChatToast {
  readonly id: number;
  readonly text: string;
  readonly link: string[];
}

/**
 * Chat's toasts (FC-034): a direct message or a mention of the reader,
 * wherever they are on the site, unless that place is already open.
 *
 * Steve's decision of 29 September 2026: who and where, never what — the
 * text is read in chat — for eight seconds, with a way into it.
 */
@Component({
  selector: 'app-chat-toasts',
  templateUrl: './chat-toasts.component.html',
  styleUrls: ['./chat-toasts.component.scss'],
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatToastsComponent implements OnDestroy {
  private readonly _router = inject(Router);

  readonly toasts = signal<ChatToast[]>([]);

  private _nextId = 1;
  private readonly _timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    inject(ChatSocketService)
      .notices$.pipe(takeUntilDestroyed())
      .subscribe(notice => this.show(notice));
  }

  /**
   * Clears every toast's timer with the component.
   */
  ngOnDestroy(): void {
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
  }

  /**
   * Takes a toast away.
   *
   * @param id - Which.
   */
  dismiss(id: number): void {
    clearTimeout(this._timers.get(id));
    this._timers.delete(id);
    this.toasts.update(toasts => toasts.filter(toast => toast.id !== id));
  }

  /**
   * Shows a notice, unless its place is open.
   *
   * @param notice - The notice.
   */
  private show(notice: ChatNotice): void {
    const link =
      notice.channelId === undefined
        ? ['/chat', 'direct', notice.conversationId]
        : ['/chat', 'channels', notice.channelId];

    if (this._router.url === link.join('/')) {
      return;
    }

    const who = chatAuthorName(notice.from);
    const id = this._nextId++;

    this.toasts.update(toasts => [
      ...toasts,
      {
        id,
        text:
          notice.kind === 'direct'
            ? `${who} sent you a message`
            : `${who} mentioned you in # ${notice.channelName}`,
        link,
      },
    ]);
    this._timers.set(
      id,
      setTimeout(() => this.dismiss(id), CHAT_TOAST_MS),
    );
  }
}
