import { ChatMessage, ChatPerson } from 'src/app/models/fleet-chat.models';

import {
  chatAuthorName,
  chatPlaceKey,
  chatSegmentsOf,
  isGroupedWith,
  isInPlace,
  mentionQueryAt,
  mentionsStillIn,
} from './chat.text';

const KIRA: ChatPerson = { userId: 'kira', username: 'Kira' };
const KIRAN: ChatPerson = { userId: 'kiran', username: 'Kiran' };
const NAMELESS: ChatPerson = { userId: 'gone', username: null };

/**
 * A message.
 *
 * @param overrides - What differs.
 * @returns The message.
 */
function messageOf(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    channelId: 'general',
    conversationId: null,
    author: KIRA,
    body: 'Hail',
    clientMessageId: 'c1',
    createdAt: '2026-09-28T12:00:00.000Z',
    deleted: false,
    removed: false,
    hidden: false,
    mine: false,
    mentions: [],
    replyTo: null,
    ...overrides,
  };
}

describe('chat text', () => {
  it('keys a channel and a conversation apart', () => {
    expect(chatPlaceKey({ channelId: 'a' })).toBe('channel:a');
    expect(chatPlaceKey({ conversationId: 'a' })).toBe('conversation:a');
  });

  it('says whether a message is in a place', () => {
    expect(isInPlace(messageOf(), { channelId: 'general' })).toBe(true);
    expect(isInPlace(messageOf(), { conversationId: 'general' })).toBe(false);
    expect(
      isInPlace(messageOf({ channelId: null, conversationId: 'talk' }), {
        conversationId: 'talk',
      }),
    ).toBe(true);
  });

  describe('chatSegmentsOf', () => {
    it('marks only the people the server says are mentioned, longest name first', () => {
      expect(
        chatSegmentsOf('@Kiran and @Kira, but not @Odo or @Kiras', [
          KIRA,
          KIRAN,
          NAMELESS,
        ]),
      ).toEqual([
        { text: '@Kiran', mention: true },
        { text: ' and ', mention: false },
        { text: '@Kira', mention: true },
        { text: ', but not @Odo or @Kiras', mention: false },
      ]);
    });

    it('keeps markup as plain text', () => {
      expect(chatSegmentsOf('<b>@Kira</b>', [KIRA])).toEqual([
        { text: '<b>', mention: false },
        { text: '@Kira', mention: true },
        { text: '</b>', mention: false },
      ]);
    });

    it('marks a name with a hyphen, and one ending a sentence', () => {
      const demo = { userId: 'demo', username: 'demo-user-002' };

      expect(
        chatSegmentsOf('Hail @demo-user-002. And @Kira.', [demo, KIRA]),
      ).toEqual([
        { text: 'Hail ', mention: false },
        { text: '@demo-user-002', mention: true },
        { text: '. And ', mention: false },
        { text: '@Kira', mention: true },
        { text: '.', mention: false },
      ]);
      expect(mentionQueryAt('@demo-us', 8)).toEqual({
        start: 0,
        query: 'demo-us',
      });
    });

    it('gives nothing for nothing', () => {
      expect(chatSegmentsOf('', [KIRA])).toEqual([]);
    });
  });

  describe('isGroupedWith', () => {
    const first = messageOf();

    it('groups the same author’s next message within five minutes', () => {
      expect(
        isGroupedWith(
          first,
          messageOf({ createdAt: '2026-09-28T12:04:59.000Z' }),
        ),
      ).toBe(true);
    });

    it.each([
      ['with nothing before', undefined, messageOf()],
      [
        'after five minutes',
        first,
        messageOf({ createdAt: '2026-09-28T12:05:00.000Z' }),
      ],
      ['from somebody else', first, messageOf({ author: KIRAN })],
      ['from nobody', messageOf({ author: null }), messageOf({ author: null })],
      ['when deleted', first, messageOf({ deleted: true })],
      ['after a deleted one', messageOf({ deleted: true }), messageOf()],
      [
        'when it replies',
        first,
        messageOf({ replyTo: { id: 'x', author: null, excerpt: null } }),
      ],
    ])('does not group a message %s', (_label, previous, message) => {
      expect(isGroupedWith(previous, message)).toBe(false);
    });
  });

  describe('mentionQueryAt', () => {
    it('finds a mention being typed at the start or after a space', () => {
      expect(mentionQueryAt('@Ki', 3)).toEqual({ start: 0, query: 'Ki' });
      expect(mentionQueryAt('Hail @', 6)).toEqual({ start: 5, query: '' });
      expect(mentionQueryAt('Hail @Ki there', 8)).toEqual({
        start: 5,
        query: 'Ki',
      });
    });

    it('finds none in an address or after other text', () => {
      expect(mentionQueryAt('kira@example', 12)).toBeNull();
      expect(mentionQueryAt('@Kira there', 11)).toBeNull();
    });
  });

  it('keeps the picked people still named in the text', () => {
    expect(mentionsStillIn('@Kira aye', [KIRA, KIRAN, NAMELESS])).toEqual([
      'kira',
    ]);
  });

  it('names an author, or Somebody once they have gone', () => {
    expect(chatAuthorName(KIRA)).toBe('Kira');
    expect(chatAuthorName(NAMELESS)).toBe('Somebody');
    expect(chatAuthorName(null)).toBe('Somebody');
  });
});
