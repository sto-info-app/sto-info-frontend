/** The windows the scan usage figures are reported over, ending now. */
export type ScanUsageWindowName = '24h' | '7d' | '30d';

/**
 * What the scan worker did over one window.
 *
 * Totals only: nothing here names a file, an uploader or a signature.
 */
export interface ScanUsageWindow {
  readonly window: ScanUsageWindowName;
  /** Scans of an asset for the first time. */
  readonly initialScans: number;
  /** Scans of an asset scanned before, or as part of a campaign. */
  readonly rescans: number;
  /** Scans that needed more than one claim. */
  readonly retriedScans: number;
  /** Claims beyond the first, in total. */
  readonly retries: number;
  readonly clean: number;
  readonly infected: number;
  /** Archives, encrypted payloads or formats the scanner could not open. */
  readonly unsupported: number;
  /** Files that were not what the upload said they were. */
  readonly contentTypeMismatch: number;
  readonly tooLarge: number;
  /** Files whose bytes did not match the hash the registry recorded. */
  readonly hashMismatch: number;
  /** Files that were missing from quarantine. */
  readonly objectMissing: number;
  /** Scans refused after every retry failed. */
  readonly retriesExhausted: number;
  /** Scans that failed without a verdict. */
  readonly failed: number;
  readonly inProgress: number;
  /** From the scanner getting the bytes to its answer. */
  readonly scanMedianMs: number | null;
  readonly scanP95Ms: number | null;
  readonly scanMaxMs: number | null;
  /** From the request being queued to the answer. */
  readonly waitMedianMs: number | null;
  readonly waitP95Ms: number | null;
  readonly waitMaxMs: number | null;
}

/** The scanner the latest attempt reported. */
export interface ScanEngineStatus {
  readonly engine: string;
  readonly engineVersion: string | null;
  readonly signatureVersion: string | null;
  /** When the signature database was built, as an ISO 8601 instant. */
  readonly definitionsBuiltAt: string | null;
  /** How old the signatures were when the figures were read, in hours. */
  readonly signatureAgeHours: number | null;
  /** When the latest attempt reported this, as an ISO 8601 instant. */
  readonly reportedAt: string;
}

/** Scan requests waiting on the worker, from the queue itself. */
export interface ScanQueue {
  readonly waiting: number;
  /** Put back until the scanner is fit to judge. */
  readonly delayed: number;
  readonly active: number;
  readonly failed: number;
}

/** Assets the registry holds that have no final verdict yet. */
export interface ScanAwaiting {
  readonly quarantined: number;
  readonly scanning: number;
  readonly retryPending: number;
}

/**
 * Everything the admin scan diagnostics page shows (FC-003).
 *
 * A part is null when the server could not reach its source, so the page
 * shows the rest.
 */
export interface ScanDiagnostics {
  /** When the figures were read, as an ISO 8601 instant. */
  readonly generatedAt: string;
  readonly usage: readonly ScanUsageWindow[] | null;
  readonly engine: ScanEngineStatus | null;
  readonly queue: ScanQueue | null;
  readonly awaiting: ScanAwaiting;
}
