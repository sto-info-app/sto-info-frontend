import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { ChatService } from 'src/app/fleet/chat/chat.service';

import { FriendChatService } from './friend-chat.service';

describe('FriendChatService (FC-033)', () => {
  let service: FriendChatService;
  let chat: { open: jest.Mock };
  let navigate: jest.SpyInstance;

  beforeEach(() => {
    chat = { open: jest.fn(() => of({ id: 'conversation-1' })) };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ChatService, useValue: chat }],
    });

    service = TestBed.inject(FriendChatService);
    navigate = jest
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
  });

  it('opens the conversation by the friendship and goes to it', () => {
    const done = jest.fn();

    service.open('friendship-1').subscribe({ next: done });

    expect(chat.open).toHaveBeenCalledWith({ friendshipId: 'friendship-1' });
    expect(navigate).toHaveBeenCalledWith([
      '/chat',
      'direct',
      'conversation-1',
    ]);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('takes only the first answer, and completes', () => {
    const answers = new Subject<{ id: string }>();
    chat.open.mockReturnValue(answers);
    const complete = jest.fn();

    service.open('friendship-1').subscribe({ complete });
    answers.next({ id: 'conversation-1' });
    answers.next({ id: 'conversation-2' });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalled();
  });

  it('goes nowhere when the conversation could not be opened', () => {
    chat.open.mockReturnValue(throwError(() => new Error('down')));
    const error = jest.fn();

    service.open('friendship-1').subscribe({ error });

    expect(error).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
