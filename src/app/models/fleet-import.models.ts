/**
 * What a roster export turns out to be, before anything is imported from it.
 *
 * Separate from `fleet.models.ts` because it describes a file rather than a
 * record. Nothing here is stored anywhere: it is the answer to "how would you
 * read this", asked of a file the uploader still holds.
 */

/** Which of the two export headers a file carried. */
export enum RosterSourceHeaderShape {
  /** The twelve-column export. Nothing was discarded. */
  NORMAL = 'NORMAL',

  /** The fifteen-column export. The three officer columns were discarded. */
  OFFICER = 'OFFICER',
}

/** The three professions a Character may hold. */
export enum RosterProfession {
  TACTICAL = 'TACTICAL',
  ENGINEERING = 'ENGINEERING',
  SCIENCE = 'SCIENCE',
}

/** What a date column turned out to mean. */
export enum RosterDateResolution {
  /** The column was empty. */
  ABSENT = 'ABSENT',

  /** One instant carries the local time written in the file. */
  EXACT = 'EXACT',

  /** Two instants carry it, because the clock went back over that hour. */
  AMBIGUOUS = 'AMBIGUOUS',
}

/** Why an export's filename is evidence of nothing. */
export enum RosterFilenameRejection {
  /** The name is not the one the game writes. */
  SHAPE_UNRECOGNISED = 'SHAPE_UNRECOGNISED',

  /** The stamp is digits in the right places naming no real date or time. */
  STAMP_NOT_A_TIME = 'STAMP_NOT_A_TIME',

  /** The stamp names a local time the chosen timezone skipped. */
  STAMP_NONEXISTENT = 'STAMP_NONEXISTENT',

  /** The Fleet in the name is not this Fleet. */
  FLEET_NAME_MISMATCH = 'FLEET_NAME_MISMATCH',
}

/** Why a row of an export cannot be read as an observation. */
export enum RosterRowRejection {
  SANITISED_MALFORMED = 'SANITISED_MALFORMED',
  CHARACTER_NAME_EMPTY = 'CHARACTER_NAME_EMPTY',
  ACCOUNT_HANDLE_EMPTY = 'ACCOUNT_HANDLE_EMPTY',
  LEVEL_MALFORMED = 'LEVEL_MALFORMED',
  CONTRIBUTION_MALFORMED = 'CONTRIBUTION_MALFORMED',
  DATE_MALFORMED = 'DATE_MALFORMED',
  DATE_NONEXISTENT = 'DATE_NONEXISTENT',
  DUPLICATE_IDENTITY = 'DUPLICATE_IDENTITY',
}

/** What an export's filename says about itself. */
export interface RosterPreviewFilename {
  /** Why the name is evidence of nothing, or null when it is. */
  rejection: RosterFilenameRejection | null;

  /** The Fleet label the name carries, exactly as written. */
  fleetLabel: string | null;

  /** The local wall-clock stamp the name carries. */
  localStamp: string | null;

  /** When the export was taken, or null while that is not settled. */
  exportedAt: string | null;

  /**
   * Every instant the stamp could name, earliest first.
   *
   * Two of them means the clock went back over that hour and somebody has to
   * say which they meant.
   */
  exportedAtCandidates: string[];

  /** The former name this label matched, or null for the current one. */
  matchedAlias: string | null;
}

/** What the file itself is. */
export interface RosterPreviewSource {
  headerShape: RosterSourceHeaderShape;
  rowCount: number;

  /** How many rows carried an officer note, which was discarded at upload. */
  officerTailRowCount: number;
  parserVersion: number;
  sourceSha256: string;
  sourceByteSize: number;
}

/** Something about a row that stops the export being believed. */
export interface RosterPreviewProblem {
  code: RosterRowRejection;
  line: number;

  /** Which column, or null when the whole row is at fault. */
  column: string | null;
}

/** One date of one sampled row, read both ways. */
export interface RosterPreviewDate {
  resolution: RosterDateResolution;

  /** The local wall-clock time the file wrote. */
  local: string | null;

  /** Every instant it could name. */
  candidates: string[];
}

/** One sampled row, as the importer reads it. */
export interface RosterPreviewRow {
  line: number;
  characterName: string;
  accountHandle: string;
  level: number;
  className: string;

  /** The profession read out of the Class, or null when it names none. */
  profession: RosterProfession | null;
  guildRank: string;
  contributionTotal: number;
  joinedAt: RosterPreviewDate;
  rankChangedAt: RosterPreviewDate;
  lastActiveAt: RosterPreviewDate;
}

/** How an export would be read, without reading it into anything. */
export interface RosterImportPreview {
  /** Whether this file could be imported as it stands. */
  canImport: boolean;

  /** The timezone every date was read through. */
  timezone: string;
  filename: RosterPreviewFilename;
  source: RosterPreviewSource;

  /** How many rows could be read into values. */
  readableRowCount: number;

  /** How many readable rows carry a Class naming no profession. */
  unknownClassCount: number;

  /** How many readable rows carry a date the clock went back over. */
  ambiguousDateCount: number;
  problems: RosterPreviewProblem[];

  /** The first rows of the file, as the importer reads them. */
  sample: RosterPreviewRow[];
}

/** Where an import has got to, as the server works it out. */
export enum RosterImportStatus {
  /** Quarantined, and waiting for or undergoing a scan. */
  SCANNING = 'SCANNING',

  /** Scanned clean, and not yet read into the roster. */
  PUBLISHING = 'PUBLISHING',

  /** Read into the roster, and in force. */
  IMPORTED = 'IMPORTED',

  /** Read, and waiting because another export of the moment disagrees. */
  HELD = 'HELD',

  /** Refused, by the scanner or by the reading. */
  REFUSED = 'REFUSED',

  /** Given up on, and never read. */
  ABANDONED = 'ABANDONED',
}

/** The statuses nothing further happens to on its own. */
export const SETTLED_ROSTER_IMPORT_STATUSES: readonly RosterImportStatus[] = [
  RosterImportStatus.IMPORTED,
  RosterImportStatus.HELD,
  RosterImportStatus.REFUSED,
  RosterImportStatus.ABANDONED,
];

/**
 * One import, as a listing reports it.
 *
 * A report about the file and what became of it, never about its rows. The
 * problems themselves, and the other imports in a conflict, are only on
 * {@link RosterImportDetail}, and only for somebody who investigates imports.
 */
export interface RosterImportSummary {
  id: string;
  assetId: string;
  fleetId: string;
  originalFilename: string;
  sourceSha256: string;
  sanitisedSha256: string;
  sourceByteSize: number;
  sanitisedByteSize: number;
  sourceHeaderShape: RosterSourceHeaderShape;

  /** The zone the uploader said the export was taken in. */
  exportTimezone: string | null;

  /** The wall-clock stamp the filename carried, exactly as written. */
  exportLocalStamp: string | null;

  /** When the export was taken, as that stamp reads in that zone. */
  exportedAt: string | null;

  /** Whether that instant was chosen between two. */
  exportedAtAmbiguous: boolean;
  rowCount: number;
  officerTailRowCount: number;
  parserVersion: number;

  /** The stored file's own state, in the asset registry's words. */
  state: string;
  retainUntil: string | null;

  /** The conflict this import is in, or null when nothing disagrees. */
  conflictGroupId: string | null;
  status: RosterImportStatus;

  /** Why it is HELD or REFUSED, as a code, or null. */
  statusReason: string | null;

  /** How many row problems stopped it being read. */
  problemCount: number;

  /** Who uploaded it, or null once that account is gone. */
  uploadedByName: string | null;
  uploadedAt: string;
}

/**
 * One import, with what only an investigator is shown.
 *
 * Null is not empty: null says "not yours to see", an empty list says there
 * is nothing.
 */
export interface RosterImportDetail extends RosterImportSummary {
  problems: RosterPreviewProblem[] | null;

  /** The other imports claiming the same moment, oldest first. */
  conflictMembers: RosterImportSummary[] | null;
}

/** A page of a Fleet's imports, newest first. */
export interface RosterImportPage {
  items: RosterImportSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/** What an upload came back as. */
export interface RosterImportUploadResult {
  /** The import, exactly as the listing would report it. */
  summary: RosterImportSummary;

  /** True when this Fleet had already imported the file, and nothing new was stored. */
  repeated: boolean;
}

/**
 * Why an upload was refused as a repeat read differently.
 *
 * Every value is one the server wrote about the earlier import, which stands.
 */
export interface RosterImportRepeatConflict {
  code: 'ALREADY_IMPORTED_DIFFERENTLY';
  importId: string;
  exportTimezone: string | null;
  exportLocalStamp: string | null;
  exportedAt: string | null;
}
