import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import {
  ChatTranscript,
  ChatTranscriptStatus,
} from 'src/app/models/fleet-chat.models';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { AppDatePipe } from 'src/app/shared/pipes/app-date.pipe';

/** What each transcript status is shown as (FC-035). */
export const TRANSCRIPT_STATUS_LABELS: Readonly<
  Record<ChatTranscriptStatus, string>
> = {
  PENDING: 'Being written',
  READY: 'Ready',
  FAILED: 'Error',
  EXPIRED: 'Expired',
};

/** Something wrong with a transcript, said across its row. */
export interface TranscriptProblem {
  readonly kind: 'error' | 'warning';
  /** What its status says instead. */
  readonly label: string;
  readonly message: string;
}

/**
 * Gave up on: whatever stopped it, nothing was kept and nothing can be
 * retried, so it points to asking again.
 */
const TRANSCRIPT_ERROR: TranscriptProblem = {
  kind: 'error',
  label: TRANSCRIPT_STATUS_LABELS.FAILED,
  message: 'There was an issue generating the transcript. Try again later.',
};

/**
 * Still waiting, but its job has failed: a site admin may yet retry it, so
 * it points to checking back.
 */
const TRANSCRIPT_WARNING: TranscriptProblem = {
  kind: 'warning',
  label: 'Warning',
  message: 'There was an issue generating the transcript. Check back later.',
};

/**
 * What is wrong with a transcript, if anything.
 *
 * @param transcript - The transcript.
 * @returns The problem, or null.
 */
export function transcriptProblem(
  transcript: ChatTranscript,
): TranscriptProblem | null {
  if (transcript.status === 'FAILED') {
    return TRANSCRIPT_ERROR;
  }

  return transcript.status === 'PENDING' && transcript.jobFailed
    ? TRANSCRIPT_WARNING
    : null;
}

/**
 * Whether a transcript may be downloaded now.
 *
 * @param transcript - The transcript.
 * @returns True while it is written and its day has not passed.
 */
export function isTranscriptDownloadable(transcript: ChatTranscript): boolean {
  return (
    transcript.status === 'READY' &&
    transcript.expiresAt !== null &&
    new Date(transcript.expiresAt).getTime() > Date.now()
  );
}

/**
 * The reader's transcripts (FC-035), in the chat page's pane where a
 * conversation otherwise sits: the ones asked for in the last day, a row
 * each, with Download while one is ready. The page reads, refreshes and
 * downloads them; this only shows them.
 */
@Component({
  selector: 'app-chat-transcripts',
  templateUrl: './chat-transcripts.component.html',
  styleUrls: ['./chat-transcripts.component.scss'],
  standalone: true,
  imports: [AppDatePipe, LcarsErrorMessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatTranscriptsComponent {
  /** The transcripts, newest first. */
  readonly transcripts = input.required<readonly ChatTranscript[]>();
  /** Why they, or one of them, could not be read, if so. */
  readonly error = input<string | null>(null);

  /** Read them again. */
  readonly refresh = output<void>();
  /** Download this one. */
  readonly download = output<ChatTranscript>();
  /** Back to the list, on a narrow screen. */
  readonly back = output<void>();

  readonly statusLabels = TRANSCRIPT_STATUS_LABELS;
  readonly isDownloadable = isTranscriptDownloadable;
  readonly problemOf = transcriptProblem;

  /** Whether one is still being written, with nothing wrong. */
  readonly hasPending = computed(() =>
    this.transcripts().some(
      transcript => transcript.status === 'PENDING' && !transcript.jobFailed,
    ),
  );
}
