/**
 * The Captain's Log (sc-1450), as the API hands it out.
 */

/** The two kinds of entry. */
export enum LogEntryType {
  /** Shown on its author's profile while the profile is public. */
  CAPTAIN = 'CAPTAIN',
  /** Only ever shown to its author. */
  PERSONAL = 'PERSONAL',
}

/** A picture's addresses, by the size it is drawn at. */
export interface LogPictureUrls {
  readonly cover640x360: string;
  readonly cover1920x1080: string;
}

/** An entry as anybody reading a public profile sees it. */
export interface PublicLogEntry {
  readonly id: string;
  /** The author's headline, or the stardate one. */
  readonly headline: string;
  /** The entry, in Markdown. */
  readonly body: string;
  readonly stardate: number;
  readonly pictureUrls: LogPictureUrls | null;
  readonly pictureAlt: string | null;
  readonly createdAt: string;
  readonly editedAt: string | null;
}

/** An entry as its author sees it. */
export interface LogEntry extends PublicLogEntry {
  readonly type: LogEntryType;
  /** The headline the author typed, or null when it is the stardate one. */
  readonly customHeadline: string | null;
  readonly removedAt: string | null;
  readonly removedReason: string | null;
}

/** An entry as a site admin sees it, with its author. */
export interface AdminLogEntry extends LogEntry {
  readonly userId: string;
}

/** A page of entries. */
export interface LogEntryPage<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

/** A new entry. */
export interface CreateLogEntryRequest {
  readonly type: LogEntryType;
  readonly headline?: string;
  readonly body: string;
}

/** Changes to an entry. */
export type UpdateLogEntryRequest = Partial<CreateLogEntryRequest>;

/** Which entries to list. */
export interface LogEntryQuery {
  readonly type?: LogEntryType;
  readonly page?: number;
  readonly pageSize?: number;
}
