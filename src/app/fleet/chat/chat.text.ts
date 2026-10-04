import {
  ChatMessage,
  ChatPerson,
  ChatPlace,
  ChatRole,
} from 'src/app/models/fleet-chat.models';

/** Posting in a scope's chat: what its members hold (FC-031). */
export const CHAT_POST_CAPABILITY = 'chat.post';

/** The most a message may say, in characters, as the server allows. */
export const CHAT_MESSAGE_MAX_LENGTH = 2_000;

/** How close to the limit the composer starts counting down. */
export const CHAT_COUNTER_FROM = 1_800;

/** How long after one message the same author's next is grouped under it. */
export const CHAT_GROUP_WITHIN_MS = 5 * 60_000;

/** Small counts as the guides write them; anything larger is a numeral. */
const COUNT_WORDS: readonly string[] = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

/**
 * A count with its unit, in words: "four hours", "one day".
 *
 * @param count - How many.
 * @param unit - The unit, singular.
 * @returns The phrase.
 */
export function inWords(count: number, unit: string): string {
  return `${COUNT_WORDS[count] ?? String(count)} ${count === 1 ? unit : `${unit}s`}`;
}

/**
 * What the top of a place says once nothing older can be read (FC-044).
 *
 * It says how far back a member can read, not how long messages are kept:
 * they are kept far longer, for moderation, and the window is the server's,
 * so the figure is too.
 *
 * @param hours - How far back members may read, from the Fleet policy.
 * @returns The note.
 */
export function chatEdgeNote(hours: number): string {
  return hours === 1
    ? 'You can read back the last hour here.'
    : `You can read back the last ${inWords(hours, 'hour')} here.`;
}

/** The roles a channel may be kept for, least first. */
export const CHAT_ROLES: readonly ChatRole[] = [
  'MEMBER',
  'OFFICER',
  'ADMIN',
  'OWNER',
];

/** Each role as a reader sees it. */
export const CHAT_ROLE_LABELS: Readonly<Record<ChatRole, string>> = {
  MEMBER: 'Members',
  OFFICER: 'Officers and up',
  ADMIN: 'Admins and the Owner',
  OWNER: 'The Owner',
};

/** A stretch of a message's text: plain, or a mention of somebody. */
export interface ChatSegment {
  readonly text: string;
  readonly mention: boolean;
}

/**
 * The key naming a place, for routes, rooms and remembering.
 *
 * @param place - The channel or conversation.
 * @returns Its key.
 */
export function chatPlaceKey(place: ChatPlace): string {
  return place.channelId === undefined
    ? `conversation:${place.conversationId}`
    : `channel:${place.channelId}`;
}

/**
 * Whether a message is in a place.
 *
 * @param message - The message.
 * @param place - The place.
 * @returns True when it is.
 */
export function isInPlace(message: ChatMessage, place: ChatPlace): boolean {
  return place.channelId === undefined
    ? message.conversationId === place.conversationId
    : message.channelId === place.channelId;
}

/**
 * Splits a message's text so its mentions can be marked. Only the people the
 * server says it mentions are marked; any other `@name` stays plain text.
 * Every piece is text, so nothing in a message is ever read as markup.
 *
 * @param body - What the message says.
 * @param mentions - Who it mentions.
 * @returns The pieces, in order.
 */
export function chatSegmentsOf(
  body: string,
  mentions: readonly ChatPerson[],
): ChatSegment[] {
  const names = mentions
    .map(person => person.username)
    .filter((name): name is string => name !== null)
    .sort((a, b) => b.length - a.length);
  const segments: ChatSegment[] = [];
  let plain = '';
  let index = 0;

  while (index < body.length) {
    const name =
      body[index] === '@'
        ? names.find(
            each =>
              body.startsWith(each, index + 1) &&
              !/[\w-]/.test(body.charAt(index + 1 + each.length)),
          )
        : undefined;

    if (name === undefined) {
      plain += body[index];
      index += 1;
      continue;
    }

    if (plain !== '') {
      segments.push({ text: plain, mention: false });
      plain = '';
    }

    segments.push({ text: `@${name}`, mention: true });
    index += name.length + 1;
  }

  if (plain !== '') {
    segments.push({ text: plain, mention: false });
  }

  return segments;
}

/**
 * Whether a message sits under the one before it, without its author's name
 * again: the same author, the same day, within five minutes, and neither
 * deleted.
 *
 * @param previous - The message before, if any.
 * @param message - The message.
 * @returns True when it is grouped.
 */
export function isGroupedWith(
  previous: ChatMessage | undefined,
  message: ChatMessage,
): boolean {
  return (
    previous !== undefined &&
    previous.author !== null &&
    previous.author.userId === message.author?.userId &&
    !message.deleted &&
    !previous.deleted &&
    message.replyTo === null &&
    Date.parse(message.createdAt) - Date.parse(previous.createdAt) <
      CHAT_GROUP_WITHIN_MS
  );
}

/**
 * The mention being typed at the caret: an `@` at the start or after a
 * space, followed by the start of a name.
 *
 * @param text - What is in the composer.
 * @param caret - Where the caret is.
 * @returns Where the `@` is and what follows it, or null.
 */
export function mentionQueryAt(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  // Usernames are letters and digits, though some older ones hold a hyphen
  // or an underscore. A full stop ends a mention, as at the end of a
  // sentence.
  const match = /(^|\s)@([\w-]{0,50})$/.exec(before);

  if (match === null) {
    return null;
  }

  return { start: caret - match[2].length - 1, query: match[2] };
}

/**
 * Of the people picked from the list, those still named in the text.
 *
 * @param text - What is being sent.
 * @param picked - Who was picked.
 * @returns Their IDs.
 */
export function mentionsStillIn(
  text: string,
  picked: readonly ChatPerson[],
): string[] {
  return picked
    .filter(
      person =>
        person.username !== null &&
        chatSegmentsOf(text, [person]).some(segment => segment.mention),
    )
    .map(person => person.userId);
}

/**
 * The name to show for a message's author.
 *
 * @param author - The author, or null once their account has gone.
 * @returns Their username, or a stand-in.
 */
export function chatAuthorName(author: ChatPerson | null): string {
  return author?.username ?? 'Somebody';
}
