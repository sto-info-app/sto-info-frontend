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
