import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { ChatTranscriptRequest } from 'src/app/models/fleet-chat.models';

import { inWords } from '../chat.text';

/** What the transcript dialog is opened with. */
export interface ChatTranscriptDialogData {
  readonly channelName: string;
  /** The scope it belongs to, as a label and a name. */
  readonly scopeName: string;
  /** How many days back a transcript may reach, from the Fleet policy. */
  readonly reachDays: number;
}

/** The shortest purpose, as the server allows. */
export const CHAT_TRANSCRIPT_PURPOSE_MIN = 10;

/** The longest purpose, as the server allows. */
export const CHAT_TRANSCRIPT_PURPOSE_MAX = 500;

/** A day, in milliseconds. */
const DAY_MS = 24 * 3_600_000;

/**
 * Room left inside the reach, so a device clock a little behind the server's
 * is not refused.
 */
const REACH_MARGIN_MS = 10 * 60_000;

/** The range offered first: the last day. */
const DEFAULT_SPAN_MS = DAY_MS;

/**
 * An instant as a `datetime-local` field holds it: the device's own time, to
 * the minute.
 *
 * @param at - The instant.
 * @returns `YYYY-MM-DDTHH:mm`.
 */
export function toLocalInput(at: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` +
    `T${pad(at.getHours())}:${pad(at.getMinutes())}`
  );
}

/**
 * Asks a scope admin for a transcript's range and purpose (FC-035). The range
 * is in the device's time, within the policy's reach (seven days at launch);
 * the server checks it again. Closes with the request, or undefined when
 * cancelled.
 */
@Component({
  selector: 'app-chat-transcript-dialog',
  templateUrl: './chat-transcript-dialog.component.html',
  styleUrls: ['./chat-transcript-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatTranscriptDialogComponent {
  readonly data: ChatTranscriptDialogData = inject(MAT_DIALOG_DATA);
  private readonly _dialogRef = inject(
    MatDialogRef<ChatTranscriptDialogComponent, ChatTranscriptRequest>,
  );

  private readonly _now = new Date();

  /** How far back a transcript reaches, in words: "seven days". */
  readonly reach = inWords(this.data.reachDays, 'day');

  readonly purposeMin = CHAT_TRANSCRIPT_PURPOSE_MIN;
  readonly purposeMax = CHAT_TRANSCRIPT_PURPOSE_MAX;
  readonly earliest = toLocalInput(
    new Date(
      this._now.getTime() - this.data.reachDays * DAY_MS + REACH_MARGIN_MS,
    ),
  );
  readonly latest = toLocalInput(this._now);
  readonly fromAt = signal(
    toLocalInput(new Date(this._now.getTime() - DEFAULT_SPAN_MS)),
  );
  readonly toAt = signal(this.latest);
  readonly purpose = signal('');

  /** What is wrong with the range, if anything. */
  readonly rangeError = computed(() => {
    const from = new Date(this.fromAt()).getTime();
    const to = new Date(this.toAt()).getTime();

    if (Number.isNaN(from) || Number.isNaN(to)) {
      return 'Choose when the transcript starts and ends.';
    }

    if (from < new Date(this.earliest).getTime()) {
      return `A transcript reaches back ${this.reach} at most.`;
    }

    return from < to ? null : 'The end must come after the start.';
  });

  /** Whether the purpose is long enough and not too long. */
  readonly isPurposeValid = computed(() => {
    const length = this.purpose().trim().length;

    return length >= this.purposeMin && length <= this.purposeMax;
  });

  /**
   * Sets the start as chosen.
   *
   * @param value - The field's value.
   */
  protected setFrom(value: string): void {
    this.fromAt.set(value);
  }

  /**
   * Sets the end as chosen.
   *
   * @param value - The field's value.
   */
  protected setTo(value: string): void {
    this.toAt.set(value);
  }

  /**
   * Sets the purpose as typed.
   *
   * @param value - The purpose.
   */
  protected setPurpose(value: string): void {
    this.purpose.set(value);
  }

  /** Closes with the request. */
  protected request(): void {
    if (this.rangeError() !== null || !this.isPurposeValid()) {
      return;
    }

    this._dialogRef.close({
      fromAt: new Date(this.fromAt()).toISOString(),
      toAt: new Date(this.toAt()).toISOString(),
      purpose: this.purpose().trim(),
    });
  }

  /** Closes without asking. */
  protected cancel(): void {
    this._dialogRef.close();
  }
}
