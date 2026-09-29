import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import {
  FLEET_RSVP_LABELS,
  FLEET_RSVP_RESPONSES,
} from 'src/app/fleet/events/fleet-events.constants';
import { RecruitmentCharacterOption } from 'src/app/fleet/recruitment/recruitment.utils';
import {
  FleetOccurrenceSummary,
  FleetRsvpResponse,
} from 'src/app/models/fleet-events.models';

/** An answer to give. */
export interface FleetEventAnswer {
  readonly response: FleetRsvpResponse;
  readonly characterId: string | null;
}

/**
 * The reader's answer to one occurrence, and how to change it (FC-030).
 *
 * Going, Maybe or Can't go, with one of their own Characters if they choose.
 * What their answer means is said plainly: a place, a place on the waitlist
 * and how far along, or no place counted. Going when every place is taken
 * says beforehand that it joins the waitlist. The page makes the change; this
 * only asks for it.
 */
@Component({
  selector: 'app-fleet-event-answer',
  templateUrl: './fleet-event-answer.component.html',
  styleUrls: ['../fleet-events.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FleetEventAnswerComponent {
  /** The occurrence, with the reader's answer and the counts. */
  readonly occurrence = input.required<FleetOccurrenceSummary>();

  /** Places for Going, or null for no limit. */
  readonly capacity = input<number | null>(null);

  /** The reader's own Characters. */
  readonly characters = input<readonly RecruitmentCharacterOption[]>([]);

  /** Whether a change is being made. */
  readonly busy = input(false);

  /** Asks for an answer to be given or changed. */
  readonly answered = output<FleetEventAnswer>();

  /** Asks for the answer to be taken back. */
  readonly withdrawn = output<void>();

  readonly responses = FLEET_RSVP_RESPONSES;
  readonly labels = FLEET_RSVP_LABELS;

  /** The Character chosen, or empty for none. */
  readonly characterId = signal('');

  /** Whether every place is taken, so Going would wait. */
  readonly isFull = computed(() => {
    const capacity = this.capacity();

    return (
      capacity !== null &&
      this.occurrence().counts.going >= capacity &&
      this.occurrence().mine?.response !== 'GOING'
    );
  });

  constructor() {
    // The Character answered with, when the answer is read or changes.
    effect(() => {
      this.characterId.set(this.occurrence().mine?.characterId ?? '');
    });
  }

  /**
   * Gives an answer, as the chosen Character.
   *
   * @param response - The answer.
   */
  onAnswer(response: FleetRsvpResponse): void {
    this.answered.emit({
      response,
      characterId: this.characterId() === '' ? null : this.characterId(),
    });
  }

  /** Takes the answer back. */
  onWithdraw(): void {
    this.withdrawn.emit();
  }
}
