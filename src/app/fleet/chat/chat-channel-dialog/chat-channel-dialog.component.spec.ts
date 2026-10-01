import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ChatChannel } from 'src/app/models/fleet-chat.models';

import {
  ChatChannelDialogComponent,
  ChatChannelDialogData,
} from './chat-channel-dialog.component';

const CHANNEL: ChatChannel = {
  id: 'officers',
  kind: 'CUSTOM',
  name: 'Officers',
  readRole: 'OFFICER',
  postRole: 'ADMIN',
  mayPost: true,
  mayManage: true,
  mayReport: true,
};

describe('ChatChannelDialogComponent', () => {
  let close: jest.Mock;

  /**
   * Opens the dialog.
   *
   * @param channel - The channel being changed, or null.
   * @returns Its element.
   */
  function open(channel: ChatChannel | null): HTMLElement {
    close = jest.fn();
    TestBed.configureTestingModule({
      imports: [ChatChannelDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            scopeName: 'Fixture Fleet',
            channel,
          } as ChatChannelDialogData,
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });

    const fixture = TestBed.createComponent(ChatChannelDialogComponent);

    fixture.autoDetectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  const field = <T extends HTMLElement>(element: HTMLElement, id: string): T =>
    element.querySelector(`#${id}`) as T;

  const choose = (select: HTMLSelectElement, value: string): void => {
    select.value = value;
    select.dispatchEvent(new Event('change'));
  };

  const type = (input: HTMLInputElement, value: string): void => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('adds a channel, open to members by default', () => {
    const element = open(null);
    const save = element.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(element.querySelector('h2')?.textContent).toContain('Add a channel');
    expect(element.querySelector('h2')?.textContent).toContain('Fixture Fleet');
    expect(save.disabled).toBe(true);

    type(field(element, 'chat-channel-name'), '  Away team ');
    save.click();

    expect(close).toHaveBeenCalledWith({
      name: 'Away team',
      readRole: 'MEMBER',
      postRole: 'MEMBER',
    });
  });

  it('changes a channel, starting from what it is', () => {
    const element = open(CHANNEL);

    expect(element.querySelector('h2')?.textContent).toContain(
      'Change Officers',
    );
    expect(field<HTMLInputElement>(element, 'chat-channel-name').value).toBe(
      'Officers',
    );

    // Posting is offered from the reading role up.
    const post = field<HTMLSelectElement>(element, 'chat-channel-post');

    expect([...post.options].map(option => option.value)).toEqual([
      'OFFICER',
      'ADMIN',
      'OWNER',
    ]);

    choose(post, 'OWNER');
    element.querySelector('form')?.dispatchEvent(new Event('submit'));

    expect(close).toHaveBeenCalledWith({
      name: 'Officers',
      readRole: 'OFFICER',
      postRole: 'OWNER',
    });
  });

  it('lifts the posting role when reading is narrowed past it, and keeps it when not', () => {
    const element = open(null);

    type(field(element, 'chat-channel-name'), 'Ops');
    choose(field(element, 'chat-channel-read'), 'ADMIN');
    choose(field(element, 'chat-channel-read'), 'OFFICER');
    element.querySelector('form')?.dispatchEvent(new Event('submit'));

    expect(close).toHaveBeenCalledWith({
      name: 'Ops',
      readRole: 'OFFICER',
      postRole: 'ADMIN',
    });
  });

  it('saves nothing without a name, and closes on cancel', () => {
    const element = open(null);

    type(field(element, 'chat-channel-name'), '   ');
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(close).not.toHaveBeenCalled();

    (element.querySelector('button.red') as HTMLButtonElement).click();
    expect(close).toHaveBeenCalledWith();
  });
});
