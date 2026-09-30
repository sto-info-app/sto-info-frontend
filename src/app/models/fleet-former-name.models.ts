/**
 * The names a Fleet was known by before it was renamed in game (FC-050).
 *
 * An export's filename carries the Fleet's name as it was when the export was
 * taken, so an export from before a rename names a Fleet that no longer
 * exists. A former name recorded here, with when it was used, lets such an
 * export match. Nothing is learned from a file: a name is only ever used once
 * somebody records it.
 */

/** One name a Fleet used to have, and when it had it. */
export interface FleetFormerName {
  id: string;
  /** The name exactly as the game wrote it, edge spaces included. */
  exactName: string;
  /** When the name began to be used, as an ISO instant. */
  validFrom: string;
  /**
   * When the name stopped being used, as an ISO instant: the first moment
   * it was not, so the day before is the last it was. Null only for a name
   * recorded without an end, which the server no longer accepts.
   */
  validTo: string | null;
  reason: string;
  /** Who recorded it, or null once their account is gone. */
  recordedByName: string | null;
  recordedAt: string;
  /** When it was removed, or null while it is in use. */
  removedAt: string | null;
  removedByName: string | null;
  removalReason: string | null;
  /** How many imports matched it while it was in use. */
  matchedImports: number;
}

/** A Fleet's former names, and whether the reader may change them. */
export interface FleetFormerNameList {
  /** The names in use, most recent first. */
  items: FleetFormerName[];
  /** The names removed, most recently removed first. */
  removed: FleetFormerName[];
  /** False for a site admin looking in, who reads and changes nothing. */
  mayChange: boolean;
}

/** A former name as it is recorded. */
export interface RecordFleetFormerName {
  /** Exactly as the game wrote it: never trimmed. */
  exactName: string;
  validFrom: string;
  validTo: string;
  reason: string;
}
