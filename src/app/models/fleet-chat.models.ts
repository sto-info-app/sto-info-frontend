import { ReportReason, ReportStatus } from './moderation.models';

/**
 * Chat's shapes (FC-031, FC-032), as the API and its socket give them.
 */

/** A channel or a conversation. */
export type ChatPlace =
  | { readonly channelId: string; readonly conversationId?: undefined }
  | { readonly conversationId: string; readonly channelId?: undefined };

/** Somebody named in chat, by username and nothing else. */
export interface ChatPerson {
  readonly userId: string;
  readonly username: string | null;
}

/** The least role that reads or posts in a channel. */
export type ChatRole = 'MEMBER' | 'OFFICER' | 'ADMIN' | 'OWNER';

/** A channel, and what the reader may do there. */
export interface ChatChannel {
  readonly id: string;
  readonly kind: 'STANDARD' | 'CUSTOM';
  readonly name: string;
  readonly readRole: ChatRole;
  readonly postRole: ChatRole;
  readonly mayPost: boolean;
  /** Whether they may rename or archive it. */
  readonly mayManage: boolean;
  /** Whether they may report its messages (FC-035). */
  readonly mayReport: boolean;
}

/** Where a scope's channels are. */
export interface ChatScopeTarget {
  readonly communityId: string;
  readonly fleetId: string | null;
  readonly armadaId: string | null;
}

/** One scope's channels, among the reader's own. */
export interface ChatScopeChannels {
  readonly kind: 'COMMUNITY' | 'FLEET' | 'ARMADA';
  readonly name: string;
  /** Its page on the site. */
  readonly path: string;
  readonly target: ChatScopeTarget;
  /** Whether they may add a channel here. */
  readonly mayCreate: boolean;
  /** Whether they may export its channels' transcripts (FC-035). */
  readonly mayExport: boolean;
  readonly channels: ChatChannel[];
}

/** A custom channel as its moderator writes it. */
export interface ChatChannelInput {
  readonly name: string;
  readonly readRole: ChatRole;
  readonly postRole?: ChatRole;
}

/** A conversation with a friend. */
export interface ChatConversation {
  readonly id: string;
  readonly other: ChatPerson;
}

/**
 * The message a reply answers: its author and its first words, or neither
 * once it is deleted, older than the window or no longer visible.
 */
export interface ChatReply {
  readonly id: string;
  readonly author: ChatPerson | null;
  readonly excerpt: string | null;
}

/** One message, as the reader may see it. */
export interface ChatMessage {
  readonly id: string;
  readonly channelId: string | null;
  readonly conversationId: string | null;
  /** Who wrote it, or null once their account has gone. */
  readonly author: ChatPerson | null;
  /** What it says, or null once it was deleted. */
  readonly body: string | null;
  readonly clientMessageId: string;
  readonly createdAt: string;
  readonly deleted: boolean;
  readonly mine: boolean;
  /**
   * Whether it is from somebody across a block from the reader, and so shows
   * nobody and nothing (FC-034).
   */
  readonly hidden: boolean;
  /** Who it names, each able to read its place. */
  readonly mentions: ChatPerson[];
  /** What it answers, if anything. */
  readonly replyTo: ChatReply | null;
}

/** What a message may carry besides its text. */
export interface ChatPostOptions {
  /** Who was picked from the list as it was typed. */
  readonly mentions?: readonly string[];
  readonly replyToMessageId?: string;
}

/** A page of messages, oldest first. */
export interface ChatMessagePage {
  readonly messages: ChatMessage[];
  /** Where the page before starts, or null at the four-hour edge. */
  readonly before: string | null;
}

/** Somebody writing in a place being read (FC-034). */
export type ChatTyping = ChatPlace & { readonly user: ChatPerson };

/**
 * A message for the reader elsewhere on the site (FC-034): a direct message,
 * or a mention in a channel. Who and where, never what.
 */
export type ChatNotice = ChatPlace & {
  readonly kind: 'direct' | 'mention';
  readonly from: ChatPerson | null;
  /** The channel's name, for a mention. */
  readonly channelName?: string;
};

/** Whether somebody is online, as the reader may know it (FC-034). */
export interface ChatPresence {
  readonly username: string;
  readonly online: boolean;
}

/** A message deleted in a place being read. */
export type ChatDeletion = ChatPlace & { readonly messageId: string };

/**
 * Where the chat socket stands:
 *
 * - `idle` before anything asked for it, or after it was closed;
 * - `connecting` while it connects or says who the reader is;
 * - `online` once it may be used;
 * - `offline` while it is trying to reconnect;
 * - `signedOut` when there is no session to show;
 * - `replaced` when the reader opened too many elsewhere and this one gave
 *   way.
 */
export type ChatSocketStatus =
  'idle' | 'connecting' | 'online' | 'offline' | 'signedOut' | 'replaced';

/** What every socket event is answered with. */
export type ChatAck<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly error: { readonly status: number; readonly message: string };
    };

/** Where a transcript is (FC-035). */
export type ChatTranscriptStatus = 'PENDING' | 'READY' | 'FAILED' | 'EXPIRED';

/** A scope admin's request for a transcript of one channel (FC-035). */
export interface ChatTranscriptRequest {
  /** The first instant, within the last seven days, as ISO 8601. */
  readonly fromAt: string;
  /** The last instant, as ISO 8601. */
  readonly toAt: string;
  /** Why it is needed: 10 to 500 characters. */
  readonly purpose: string;
}

/** A transcript the reader asked for (FC-035). */
export interface ChatTranscript {
  readonly id: string;
  readonly channelId: string;
  readonly channelName: string;
  readonly scopeKind: 'COMMUNITY' | 'FLEET' | 'ARMADA';
  readonly scopeName: string | null;
  readonly purpose: string;
  readonly fromAt: string;
  readonly toAt: string;
  readonly status: ChatTranscriptStatus;
  readonly messageCount: number | null;
  readonly createdAt: string;
  readonly readyAt: string | null;
  /** When its download stops working. */
  readonly expiresAt: string | null;
}

/** A reader's report of a message (FC-035). */
export interface ChatReportInput {
  readonly reason: ReportReason;
  readonly details?: string;
}

/** Where a reported message was. */
export interface ChatReportPlace {
  readonly kind: 'CHANNEL' | 'DIRECT';
  readonly channelId: string | null;
  readonly channelName: string | null;
  readonly scopeKind: 'COMMUNITY' | 'FLEET' | 'ARMADA' | null;
  readonly scopeName: string | null;
  readonly conversationId: string | null;
}

/** A chat report in the site admins' queue (FC-035). */
export interface ChatReportSummary {
  readonly id: string;
  readonly messageId: string;
  readonly place: ChatReportPlace;
  readonly reporter: ChatPerson | null;
  readonly author: ChatPerson | null;
  readonly reason: ReportReason;
  readonly details: string | null;
  readonly status: ReportStatus;
  readonly createdAt: string;
  /** Open member reports about its author (FC-036). */
  readonly openUserReportCount: number;
}

/** One message held as evidence. */
export interface ChatReportEvidence {
  /** 0 for the reported message, then back. */
  readonly position: number;
  readonly messageId: string;
  readonly author: ChatPerson | null;
  /** Null for a message deleted before the report. */
  readonly body: string | null;
  readonly deleted: boolean;
  readonly sentAt: string;
}

/** A chat report, with its evidence and what was decided. */
export interface ChatReportDetail extends ChatReportSummary {
  /** Oldest first. */
  readonly evidence: ChatReportEvidence[];
  /** Whether the reported message has since been deleted or removed. */
  readonly messageRemoved: boolean;
  readonly resolutionNote: string | null;
  readonly resolvedBy: ChatPerson | null;
  readonly resolvedAt: string | null;
  /** The hold keeping its evidence, while one is in force (FC-036). */
  readonly holdId: string | null;
}

/** A page of the admin queue. */
export interface ChatReportPage {
  readonly items: ChatReportSummary[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  /** Open reports across the whole queue. */
  readonly openCount: number;
}

/** An admin closing a report. */
export interface ChatReportDecision {
  readonly status: ReportStatus.ACTIONED | ReportStatus.DISMISSED;
  /** Why: required, and kept in the site admin log (FC-039). */
  readonly note: string;
}
