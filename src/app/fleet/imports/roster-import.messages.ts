import {
  RosterFilenameRejection,
  RosterImportStatus,
  RosterRowRejection,
} from 'src/app/models/fleet-import.models';

/**
 * What the server's structural codes mean, in words.
 *
 * The codes are deliberately about the shape of a file and never about its
 * contents, which is what makes them safe to send back — and also what makes
 * them useless to the person holding the file. `ROW_AMBIGUOUS` is precise and
 * says nothing to a Fleet leader who exported a CSV twenty seconds ago, so
 * every one of them is written out here.
 *
 * Each message says what was found and, where there is one, what to do. Where
 * there is nothing to do, it says that too: an export the game wrote wrongly
 * is not something anybody can fix by trying again.
 */

/** Why an upload was refused before a single row was read. */
export const ROSTER_UPLOAD_REFUSALS: Record<string, string> = {
  FILE_TOO_LARGE: 'That file is larger than any roster export the game writes.',
  FILE_EMPTY: 'That file has nothing in it.',
  FILENAME_UNUSABLE:
    'That filename cannot be recorded as it stands. Send the file under the ' +
    'name the game gave it.',
  ENCODING_NOT_UTF8:
    'That file is not text the game wrote. If it has been opened and saved ' +
    'in a spreadsheet, export a fresh copy instead.',
  CONTROL_CHARACTER:
    'A line holds a character no roster field can contain. Export a fresh ' +
    'copy rather than editing this one.',
  LINE_ENDING_UNSUPPORTED:
    'The line endings are not ones the game writes. Export a fresh copy.',
  HEADER_UNRECOGNISED:
    'The first line is not the heading an STO roster export starts with. ' +
    'Either this is not a roster export, or it has been edited.',
  TOO_MANY_ROWS: 'That export holds more members than any Fleet can have.',
  BLANK_LINE: 'There is an empty line in the middle of the export.',
  LINE_TOO_LONG: 'A line is far longer than any roster row.',
  FIELD_TOO_LONG: 'A single value is far longer than any roster field.',
  TOO_MANY_QUOTES: 'A line holds more quotation marks than any roster row.',
  ROW_PREFIX_MALFORMED:
    'A row does not have the columns a roster row has. Export a fresh copy ' +
    'rather than editing this one.',
  ROW_UNPARSEABLE: 'A row cannot be read as a roster row at all.',
  ROW_AMBIGUOUS:
    'A row could be read two different ways, and reading it wrongly would ' +
    'mean keeping text that should be discarded. It is refused rather than ' +
    'guessed at.',
  ROW_PARSE_BUDGET:
    'A row would take more work to read than any real roster row does.',
  ROWS_UNREADABLE:
    'Some rows hold values that cannot be read. Check the export again to ' +
    'see which.',
  STAMP_CHOICE_REQUIRED:
    'The filename names a time the clock went back over, so it names two ' +
    'moments. Choose which one before importing.',
  STAMP_CHOICE_NOT_A_CANDIDATE:
    'The moment chosen is not one the filename could name. Check the export ' +
    'again and choose one of the two it offers.',
};

/** What to say when the server refuses a file for a reason not listed. */
export const ROSTER_UPLOAD_REFUSAL_FALLBACK =
  'That file could not be read as an STO roster export.';

/** Why an export's filename is evidence of nothing. */
export const ROSTER_FILENAME_REJECTIONS: Record<
  RosterFilenameRejection,
  string
> = {
  [RosterFilenameRejection.SHAPE_UNRECOGNISED]:
    'This is not the name the game gave the file. An export is named ' +
    '<Fleet>_YYYYMMDD-HHMMSS.csv, and anything added to that — ' +
    '" - My Export", "_PrePromotions" — means the name is no longer ' +
    'evidence of which Fleet it is or when it was taken. Send it under its ' +
    'original name.',
  [RosterFilenameRejection.STAMP_NOT_A_TIME]:
    'The date and time in the filename do not name a real moment.',
  [RosterFilenameRejection.STAMP_NONEXISTENT]:
    'The filename names a time that never happened in the timezone chosen ' +
    '— the hour a clock skips going forward. Either the timezone is ' +
    'wrong or the file has been renamed.',
  [RosterFilenameRejection.FLEET_NAME_MISMATCH]:
    'The Fleet named in the filename is not this Fleet. Names are compared ' +
    'exactly, spaces at either end included, because that spacing may be the ' +
    'only thing telling two Fleets apart. If the Fleet has been renamed, its ' +
    'former name has to be recorded here before older exports will match.',
};

/** Why a row cannot be read as an observation. */
export const ROSTER_ROW_REJECTIONS: Record<RosterRowRejection, string> = {
  [RosterRowRejection.SANITISED_MALFORMED]:
    'This row does not have the columns a roster row has.',
  [RosterRowRejection.CHARACTER_NAME_EMPTY]: 'This row names no Character.',
  [RosterRowRejection.ACCOUNT_HANDLE_EMPTY]: 'This row carries no handle.',
  [RosterRowRejection.LEVEL_MALFORMED]: 'The level is not a whole number.',
  [RosterRowRejection.CONTRIBUTION_MALFORMED]:
    'The contribution total is not a whole number.',
  [RosterRowRejection.DATE_MALFORMED]:
    'This date is not one the game writes, or it names a day that does not ' +
    'exist.',
  [RosterRowRejection.DATE_NONEXISTENT]:
    'This date falls in the hour the clock skips going forward, so it never ' +
    'happened in the timezone chosen.',
  [RosterRowRejection.DUPLICATE_IDENTITY]:
    'Another row carries the same Character and handle, and nothing in the ' +
    'export tells them apart.',
};

/** What each status is called where it is shown. */
export const ROSTER_IMPORT_STATUS_LABELS: Record<RosterImportStatus, string> = {
  [RosterImportStatus.SCANNING]: 'Scanning',
  [RosterImportStatus.PUBLISHING]: 'Reading',
  [RosterImportStatus.IMPORTED]: 'Imported',
  [RosterImportStatus.HELD]: 'Held',
  [RosterImportStatus.REFUSED]: 'Refused',
  [RosterImportStatus.ABANDONED]: 'Abandoned',
};

/** What each status means for the roster, in a sentence. */
export const ROSTER_IMPORT_STATUS_DESCRIPTIONS: Record<
  RosterImportStatus,
  string
> = {
  [RosterImportStatus.SCANNING]:
    'The file is in quarantine and waiting for, or undergoing, a scan. ' +
    'Nothing reads it before then, and nothing in it is in force yet.',
  [RosterImportStatus.PUBLISHING]:
    'The file has been scanned and cleared, and is being read into the ' +
    'roster. Nothing in it is in force yet.',
  [RosterImportStatus.IMPORTED]:
    'The export has been read into the roster and is in force.',
  [RosterImportStatus.HELD]:
    'The export has been read and is not in force. It is waiting, and will ' +
    'stay waiting until whatever is holding it is settled.',
  [RosterImportStatus.REFUSED]:
    'The export was refused, and nothing in it has been read into the ' +
    'roster.',
  [RosterImportStatus.ABANDONED]:
    'This import was given up on before it was read. Nothing in it is in ' +
    'force. Importing the export again starts afresh.',
};

/** Why an import is held or was refused, in words. */
export const ROSTER_IMPORT_STATUS_REASONS: Record<string, string> = {
  EXPORT_INSTANT_IN_CONFLICT:
    'Another export of this Fleet claims the same moment and says something ' +
    'different. The first version of that moment stays in force, and this ' +
    'one waits until the conflict is resolved.',
  SCAN_REFUSED:
    'The file did not pass the scan. What the scan found is not reported.',
  ROWS_UNREADABLE: 'Some rows hold values that cannot be read.',
  EXPORT_TIMEZONE_MISSING:
    'This import does not record which timezone the export was taken in, so ' +
    'its dates cannot be read without guessing one. Import the export again.',
  NOT_THIS_IMPORT:
    'The stored file and the import disagree about which export they ' +
    'describe, so it was not read into either. This is not something the ' +
    'uploader caused.',
};

/**
 * Says why an import is held or was refused.
 *
 * @param reason - The server's code, if it gave one.
 * @returns The sentence, or null when there is nothing to explain.
 */
export function describeStatusReason(
  reason: string | null | undefined,
): string | null {
  if (reason === null || reason === undefined) {
    return null;
  }

  return (
    ROSTER_IMPORT_STATUS_REASONS[reason] ??
    'The server gave a reason this page does not recognise.'
  );
}

/**
 * Turns the server's refusal into a sentence.
 *
 * @param code - The structural code, if the server sent one.
 * @param line - The line at fault, if the refusal belongs to one.
 * @returns What to tell the reader.
 */
export function describeUploadRefusal(
  code: string | null | undefined,
  line: number | null | undefined,
): string {
  // A filename refusal can reach an upload too, when a file that previewed
  // cleanly is sent under another name or with another zone.
  const message =
    (code === null || code === undefined
      ? undefined
      : (ROSTER_UPLOAD_REFUSALS[code] ??
        (ROSTER_FILENAME_REJECTIONS as Record<string, string>)[code])) ??
    ROSTER_UPLOAD_REFUSAL_FALLBACK;

  return line === null || line === undefined
    ? message
    : `${message} (Line ${line}.)`;
}
