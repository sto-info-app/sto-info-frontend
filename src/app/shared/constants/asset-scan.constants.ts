/**
 * Where an uploaded file has got to, and what to tell the person who sent it.
 *
 * Every upload in the application is becoming asynchronous: a file is received,
 * held privately, scanned, and only then published. That is five states a
 * person can be looking at, and they need naming once rather than per upload
 * form — a Fleet roster CSV, a captain's portrait and a Storytime cover are
 * the same five states, and a reader should not have to learn them twice.
 *
 * **A rejection never says why in detail.** Naming the signature that matched
 * tells somebody probing the scanner exactly what got through and what did
 * not, so the copy here says the file was refused and stops. What was actually
 * found is available to an authorised investigator through its own route.
 *
 * Not in the Fleet feature's own folder, even though the Fleet import is the
 * first thing to need it: the profile picture, account image and captain
 * portrait upload paths all move onto the same states, and a shared component
 * reaching into a feature folder is the seam that stops being crossable later.
 */

/** The file is still being sent. */
export const ASSET_SCAN_UPLOADING = 'UPLOADING';

/** The file has arrived and is waiting its turn to be scanned. */
export const ASSET_SCAN_AWAITING = 'AWAITING_SCAN';

/** The scanner has the file. */
export const ASSET_SCAN_SCANNING = 'SCANNING';

/** The file passed and is in use. */
export const ASSET_SCAN_AVAILABLE = 'AVAILABLE';

/** The file was refused. */
export const ASSET_SCAN_REJECTED = 'REJECTED';

/** How far along an uploaded file is. */
export type AssetScanState =
  | typeof ASSET_SCAN_UPLOADING
  | typeof ASSET_SCAN_AWAITING
  | typeof ASSET_SCAN_SCANNING
  | typeof ASSET_SCAN_AVAILABLE
  | typeof ASSET_SCAN_REJECTED;

/** What one state looks like and says. */
export interface AssetScanStatePresentation {
  /** The short name of the state, e.g. `Scanning`. */
  label: string;

  /** A sentence saying what is happening and what the reader should do. */
  description: string;

  /**
   * Font Awesome classes for the state's icon.
   *
   * All five are already used elsewhere in the application, which is the only
   * way to know a glyph is in the subsetted kit: one that is not renders as
   * nothing at all, silently.
   */
  iconClass: string;

  /** Modifier suffix selecting the state's colour. */
  modifier: string;

  /**
   * Whether the state is still moving.
   *
   * Drives the animated bar, and is why a settled state does not carry one: a
   * progress animation under a finished upload says the site is still working
   * when it is not.
   */
  isInProgress: boolean;
}

export const ASSET_SCAN_STATES: Readonly<
  Record<AssetScanState, AssetScanStatePresentation>
> = {
  [ASSET_SCAN_UPLOADING]: {
    label: 'Uploading',
    description: 'The file is on its way. Please keep this page open.',
    iconClass: 'fa-solid fa-spinner fa-spin',
    modifier: 'uploading',
    isInProgress: true,
  },
  [ASSET_SCAN_AWAITING]: {
    label: 'Awaiting scan',
    description:
      'The file has arrived and is held privately until it has been checked. ' +
      'Nobody can see or download it yet.',
    iconClass: 'fa-solid fa-hourglass-half',
    modifier: 'awaiting',
    isInProgress: true,
  },
  [ASSET_SCAN_SCANNING]: {
    label: 'Scanning',
    description:
      'The file is being checked for malware. This is usually quick.',
    iconClass: 'fa-solid fa-shield-halved',
    modifier: 'scanning',
    isInProgress: true,
  },
  [ASSET_SCAN_AVAILABLE]: {
    label: 'Available',
    description: 'The file passed its check and is now in use.',
    iconClass: 'fa-solid fa-circle-check',
    modifier: 'available',
    isInProgress: false,
  },
  [ASSET_SCAN_REJECTED]: {
    label: 'Rejected',
    description:
      'The file was refused and has not been kept. Nothing that was already ' +
      'here has changed. You can try again with a different file.',
    iconClass: 'fa-solid fa-circle-exclamation',
    modifier: 'rejected',
    isInProgress: false,
  },
};
