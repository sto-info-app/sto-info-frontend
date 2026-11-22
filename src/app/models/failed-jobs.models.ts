/**
 * The queues whose failed jobs a site admin can see, retry and discard
 * (FC-042), in the order the server lists them.
 */
export const FAILED_JOB_QUEUES = [
  'file-scan',
  'file-scan-verdict',
  'file-asset-publication',
  'chat-transcript',
  'fleet-roster-replay',
] as const;

/** A queue whose failed jobs a site admin can see. */
export type FailedJobQueue = (typeof FAILED_JOB_QUEUES)[number];

/** What each queue is called on the page. */
export const FAILED_JOB_QUEUE_LABELS: Readonly<Record<string, string>> = {
  'file-scan': 'Scan requests',
  'file-scan-verdict': 'Scan verdicts',
  'file-asset-publication': 'Publishing scanned uploads',
  'chat-transcript': 'Chat transcripts',
  'fleet-roster-replay': 'Roster replays',
};

/** What each kind of thing a job concerns is called on the page. */
export const FAILED_JOB_SUBJECT_LABELS: Readonly<Record<string, string>> = {
  FILE_ASSET: 'Asset',
  CHAT_TRANSCRIPT: 'Chat transcript',
  FLEET: 'Fleet',
};

/** Why a retry would change nothing, in words. */
export const NOT_RETRYABLE_LABELS: Readonly<Record<string, string>> = {
  SETTLED: 'What it was for has moved on, so a retry would do nothing.',
  NO_SUBJECT: 'It names nothing to act on, so a retry would do nothing.',
};

/**
 * One job a queue gave up on (FC-042). Internal IDs and codes only: never
 * the job's data, and never the text of its error.
 */
export interface FailedJob {
  readonly queue: FailedJobQueue;
  readonly jobId: string;
  /** The kind of job. */
  readonly name: string;
  readonly attemptsMade: number;
  /** When it failed, as an ISO 8601 instant. */
  readonly failedAt: string | null;
  /** What it was for: FILE_ASSET, CHAT_TRANSCRIPT or FLEET. */
  readonly subjectKind: string | null;
  readonly subjectId: string | null;
  /** Why it failed, as a code. */
  readonly reason: string;
  /** Whether retrying it could change anything. */
  readonly retryable: boolean;
  /** Why a retry would change nothing: SETTLED or NO_SUBJECT. */
  readonly notRetryableBecause: string | null;
}

/** A page of failed jobs, queue by queue, newest failure first in each. */
export interface FailedJobPage {
  readonly items: readonly FailedJob[];
  /** Failed jobs in every queue asked for. */
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  /** Failed jobs in each queue asked for; null for one that did not answer. */
  readonly counts: Readonly<Record<string, number | null>>;
}

/** What a "Retry all" came to. */
export interface RetryAllResult {
  readonly retried: number;
  /** Left alone, because a retry would not help. */
  readonly skipped: number;
  /** Failed jobs still in the queues asked for, or null when unknown. */
  readonly remaining: number | null;
}

/** What a "Discard all that can't be retried" came to. */
export interface DiscardUnretryableResult {
  readonly discarded: number;
  /** Kept, because a retry could still help. */
  readonly kept: number;
  /** Failed jobs still in the queues asked for, or null when unknown. */
  readonly remaining: number | null;
}
