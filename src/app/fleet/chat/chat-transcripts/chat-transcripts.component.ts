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
  // Whatever stopped it, nothing was kept and nothing can be retried, so it
  // says so and points to asking again.
  FAILED: 'There was an issue generating the transcript. Try again later.',
  EXPIRED: 'Expired',
};

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

  /** Whether one is still being written. */
  readonly hasPending = computed(() =>
    this.transcripts().some(transcript => transcript.status === 'PENDING'),
  );
}
