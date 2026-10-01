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

/** A state a scan worker process reports itself in (FC-042). */
export type ScanWorkerState = 'RUNNING' | 'PAUSED' | 'STOPPING';

/**
 * One scan worker process, as its heartbeat last reported it (FC-042).
 *
 * Every age is measured on the database's clock, the one the worker wrote
 * its beats on, so the browser's clock never enters into it.
 */
export interface ScanWorkerHeartbeat {
  /** The identifier the process made itself at start. */
  readonly workerId: string;
  readonly state: ScanWorkerState;
  /**
   * Why it is paused, as a code: SCANNER_NOT_ASKED, SCANNER_UNREACHABLE,
   * SIGNATURES_UNDATED, SIGNATURES_TOO_OLD or UNKNOWN. Null unless paused.
   */
  readonly pauseReason: string | null;
  readonly definitionsVersion: string | null;
  /** When its signatures were built, as an ISO 8601 instant. */
  readonly definitionsBuiltAt: string | null;
  /** How old its signatures are, in hours to one decimal place. */
  readonly signatureAgeHours: number | null;
  /** Scan requests it is working on. */
  readonly jobsInHand: number;
  readonly startedAt: string;
  /** When it last beat; it beats every 30 seconds. */
  readonly beatAt: string;
  readonly secondsSinceBeat: number;
  /** Whether it beat in the last two minutes. */
  readonly live: boolean;
  /** When the current pause began, or null unless paused. */
  readonly pausedSince: string | null;
  readonly pausedMinutes: number | null;
}

/** An operations problem the alert run watches for (FC-042). */
export type OperationsAlertKind =
  | 'SCAN_QUEUE_LAG'
  | 'PUBLICATION_QUEUE_LAG'
  | 'WORKER_SILENT'
  | 'WORKER_PAUSED'
  | 'SIGNATURES_STALE'
  | 'FAILED_JOBS'
  | 'PUBLICATION_PAUSED_LONG'
  | 'QUEUES_UNREACHABLE';

/**
 * An operations problem that is open now (FC-042). Every site admin was told
 * of it once, in the site, when it opened.
 */
export interface OperationsAlert {
  readonly kind: OperationsAlertKind;
  /** When the problem was first seen, as an ISO 8601 instant. */
  readonly openedAt: string;
  /** When the alert run last saw it. */
  readonly lastSeenAt: string;
  /** Counts and ages as last seen; never a name or an error's text. */
  readonly detail: Readonly<Record<string, number>>;
}

/**
 * Whether publication of scanned uploads is paused (FC-042). Uploads are
 * still accepted and scanned while it is; nothing is published until it is
 * resumed.
 */
export interface PublicationPause {
  readonly paused: boolean;
  /** When it was paused, as an ISO 8601 instant; null while it runs. */
  readonly pausedAt: string | null;
  /** The site admin who paused it; null while it runs. */
  readonly pausedByUserId: string | null;
  /**
   * That site admin's username; null while it runs, or when their account
   * has gone.
   */
  readonly pausedByUsername: string | null;
  /**
   * Whether the publication queue itself is paused, or null when the job
   * queues cannot be reached or are too slow to answer. Paused with this
   * null, the queue is paused as soon as they answer, and nothing is
   * published meanwhile.
   */
  readonly queuePaused: boolean | null;
  /**
   * Cleared uploads waiting to be published, or null when the job queues
   * cannot be reached or are too slow to answer.
   */
  readonly held: number | null;
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
  /**
   * Every worker process that has beaten in the last day, latest beat
   * first; empty when none has, null when the heartbeats cannot be read
   * (FC-042).
   */
  readonly workers: readonly ScanWorkerHeartbeat[] | null;
  /** The operations problems open now, oldest first (FC-042). */
  readonly alerts: readonly OperationsAlert[];
  /** Whether publication is paused (FC-042). */
  readonly publication: PublicationPause;
}

/**
 * One asset's scan outcome (FC-039): why it was refused and with what, but
 * never a signature name, which the server does not keep.
 */
export interface ScanAssetDetail {
  readonly id: string;
  /** What the asset is for. */
  readonly kind: string;
  readonly state: string;
  /** Why it was refused, as a code. */
  readonly rejectionCode: string | null;
  readonly scanEngine: string | null;
  readonly scanEngineVersion: string | null;
  readonly scanSignatureVersion: string | null;
  readonly policyVersion: number;
  readonly createdAt: string;
  readonly lastVerdictAt: string | null;
}

/** A page of refused assets, newest verdict first. */
export interface ScanRejectionPage {
  readonly items: readonly ScanAssetDetail[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
