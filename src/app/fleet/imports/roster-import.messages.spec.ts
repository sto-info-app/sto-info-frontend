import { RosterImportStatus } from 'src/app/models/fleet-import.models';

import {
  describeStatusReason,
  describeUploadRefusal,
  ROSTER_FILENAME_REJECTIONS,
  ROSTER_IMPORT_STATUS_DESCRIPTIONS,
  ROSTER_IMPORT_STATUS_LABELS,
  ROSTER_IMPORT_STATUS_REASONS,
  ROSTER_UPLOAD_REFUSAL_FALLBACK,
  ROSTER_UPLOAD_REFUSALS,
} from './roster-import.messages';

describe('roster import messages', () => {
  describe('describeUploadRefusal', () => {
    it('says what a structural code means', () => {
      expect(describeUploadRefusal('FILE_EMPTY', null)).toBe(
        ROSTER_UPLOAD_REFUSALS['FILE_EMPTY'],
      );
    });

    it('names the line at fault when there is one', () => {
      expect(describeUploadRefusal('BLANK_LINE', 7)).toBe(
        `${ROSTER_UPLOAD_REFUSALS['BLANK_LINE']} (Line 7.)`,
      );
    });

    // A file that previewed cleanly can still reach the upload under another
    // name, and its refusal is then about the filename.
    it('says what a filename code means', () => {
      expect(describeUploadRefusal('FLEET_NAME_MISMATCH', undefined)).toBe(
        ROSTER_FILENAME_REJECTIONS.FLEET_NAME_MISMATCH,
      );
    });

    it.each([null, undefined, 'SOMETHING_NEW'])(
      'falls back for %s',
      (code: string | null | undefined) => {
        expect(describeUploadRefusal(code, null)).toBe(
          ROSTER_UPLOAD_REFUSAL_FALLBACK,
        );
      },
    );
  });

  describe('describeStatusReason', () => {
    it.each([null, undefined])('has nothing to say for %s', reason => {
      expect(describeStatusReason(reason)).toBeNull();
    });

    it.each(Object.keys(ROSTER_IMPORT_STATUS_REASONS))(
      'explains %s',
      (reason: string) => {
        expect(describeStatusReason(reason)).toBe(
          ROSTER_IMPORT_STATUS_REASONS[reason],
        );
      },
    );

    it('admits to a reason it does not recognise', () => {
      expect(describeStatusReason('SOMETHING_NEW')).toBe(
        'The server gave a reason this page does not recognise.',
      );
    });
  });

  it.each(Object.values(RosterImportStatus))(
    'labels and describes %s',
    (status: RosterImportStatus) => {
      expect(ROSTER_IMPORT_STATUS_LABELS[status]).toBeTruthy();
      expect(ROSTER_IMPORT_STATUS_DESCRIPTIONS[status]).toBeTruthy();
    },
  );
});
