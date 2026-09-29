import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { Subject } from 'rxjs';

import { ChatNotice } from 'src/app/models/fleet-chat.models';

import { ChatSocketService } from '../chat-socket.service';
import { CHAT_TOAST_MS, ChatToastsComponent } from './chat-toasts.component';

const KIRA = { userId: 'kira', username: 'Kira' };

describe('ChatToastsComponent', () => {
  let notices$: Subject<ChatNotice>;
  let fixture: ComponentFixture<ChatToastsComponent>;
  let element: HTMLElement;

  beforeEach(() => {
    jest.useFakeTimers();
    notices$ = new Subject();
    TestBed.configureTestingModule({
      imports: [ChatToastsComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: ChatSocketService, useValue: { notices$ } },
      ],
    });
    fixture = TestBed.createComponent(ChatToastsComponent);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const toasts = (): string[] => {
    fixture.detectChanges();

    return [...element.querySelectorAll('.chat-toast__link')].map(
      each => each.textContent?.trim() ?? '',
    );
  };

  it('says who sent a direct message, or mentioned the reader where, linking to it', () => {
    notices$.next({ kind: 'direct', conversationId: 'talk', from: KIRA });
    notices$.next({
      kind: 'mention',
      channelId: 'general',
      channelName: 'General',
      from: null,
    });

    expect(toasts()).toEqual([
      'Kira sent you a message',
      'Somebody mentioned you in # General',
    ]);
    expect(
      element.querySelector('.chat-toast__link')?.getAttribute('href'),
    ).toBe('/chat/direct/talk');
  });

  it('shows nothing for the place already open', () => {
    jest
      .spyOn(TestBed.inject(Router), 'url', 'get')
      .mockReturnValue('/chat/channels/general');

    notices$.next({
      kind: 'mention',
      channelId: 'general',
      channelName: 'General',
      from: KIRA,
    });

    expect(toasts()).toEqual([]);
  });

  it('goes after eight seconds, or when dismissed or followed', () => {
    notices$.next({ kind: 'direct', conversationId: 'a', from: KIRA });
    notices$.next({ kind: 'direct', conversationId: 'b', from: KIRA });
    notices$.next({ kind: 'direct', conversationId: 'c', from: KIRA });
    expect(toasts()).toHaveLength(3);

    (element.querySelector('.chat-toast__close') as HTMLButtonElement).click();
    expect(toasts()).toHaveLength(2);

    (element.querySelector('.chat-toast__link') as HTMLAnchorElement).click();
    expect(toasts()).toHaveLength(1);

    jest.advanceTimersByTime(CHAT_TOAST_MS);
    expect(toasts()).toEqual([]);
  });

  it('clears its timers with the page', () => {
    notices$.next({ kind: 'direct', conversationId: 'a', from: KIRA });
    fixture.destroy();

    expect(() => jest.advanceTimersByTime(CHAT_TOAST_MS)).not.toThrow();
  });
});
