import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { EndeavourRankBadgeComponent } from '../endeavour-rank-badge/endeavour-rank-badge.component';
import { AccountCardDetail, AccountCardVm } from './account-card.model';

/** How long a copy button shows its tick, or its failure, before resetting. */
export const COPY_FEEDBACK_MS = 2000;

/** What a copy button is showing: nothing yet, done, or refused. */
export type CopyOutcome = 'copied' | 'failed';

/**
 * An STO account card.
 *
 * Shared by the owner-facing dashboard account list and the public registry so
 * both render identically; callers vary only the `vm` they build — in
 * particular `actions`, which is empty for read-only contexts.
 *
 * A detail worth copying — the username and the email, which the owner's
 * list flags `copyable` — gets a copy button after its value. The button's icon turns to a tick for a moment
 * once the value is on the clipboard, and a visually hidden live region says
 * so for a screen reader; if the clipboard refuses, the tooltip says the
 * copy could not be made (#1090).
 */
@Component({
  selector: 'app-account-card',
  templateUrl: './account-card.component.html',
  styleUrls: ['./account-card.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, EndeavourRankBadgeComponent],
})
export class AccountCardComponent {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _timers = new Map<string, ReturnType<typeof setTimeout>>();

  @Input({ required: true }) vm!: AccountCardVm;
  @Input() privacyMode = false;

  /** Emits the `key` of the action button the user activated. */
  @Output() readonly action = new EventEmitter<string>();

  /** What each copy button is showing, by what it copies. */
  readonly copyOutcomes = signal<ReadonlyMap<string, CopyOutcome>>(new Map());

  /** What the live region last said. */
  readonly announcement = signal('');

  constructor() {
    this._destroyRef.onDestroy(() => {
      for (const timer of this._timers.values()) {
        clearTimeout(timer);
      }
    });
  }

  /**
   * Whether any detail row shows its label, which switches the body to a
   * two-column label/value grid so the values line up.
   *
   * @returns True when at least one detail row is visibly labelled.
   */
  get hasVisibleLabels(): boolean {
    return this.vm.details.some(detail => detail.showLabel);
  }

  /**
   * Emits an action, stopping the click from also triggering card navigation.
   *
   * @param key - The activated action's key.
   * @param event - The originating click event.
   */
  onAction(key: string, event: Event): void {
    event.stopPropagation();
    this.action.emit(key);
  }

  /**
   * Stops a nested link's click from also triggering card navigation.
   *
   * @param event - The originating click event.
   */
  onNestedLinkClick(event: Event): void {
    event.stopPropagation();
  }

  /**
   * What a detail's copy button is named by: its label, or its text when it
   * has none.
   *
   * @param detail - The detail.
   * @returns The name, as the tooltip says it: "Email".
   */
  copyNameOf(detail: AccountCardDetail): string {
    return detail.label ?? detail.text;
  }

  /**
   * The icon a copy button shows: a tick for a moment once it has copied,
   * the copy icon otherwise.
   *
   * @param name - What the button copies.
   * @returns The icon's classes.
   */
  copyIconOf(name: string): string {
    return this.copyOutcomes().get(name) === 'copied'
      ? 'fas fa-check'
      : 'fas fa-copy';
  }

  /**
   * The copy button's tooltip, which says what it does until it has done it.
   *
   * @param name - What the button copies.
   * @returns The tooltip.
   */
  copyTitleOf(name: string): string {
    switch (this.copyOutcomes().get(name)) {
      case 'copied':
        return 'Copied';
      case 'failed':
        return 'Could not copy';
      default:
        return `Copy ${name.toLowerCase()}`;
    }
  }

  /**
   * Puts a value on the clipboard, stopping the click from also opening the
   * account, and shows how it went for a moment.
   *
   * @param name - What is being copied, for the tooltip and the announcement.
   * @param value - The value.
   * @param event - The originating click event.
   */
  async copy(name: string, value: string, event: Event): Promise<void> {
    event.stopPropagation();

    // The refusal is taken on the promise itself rather than by catching an
    // await, so a rejected clipboard never stands unhandled for a tick; the
    // try is for a browser with no clipboard at all.
    let outcome: CopyOutcome;
    try {
      outcome = await navigator.clipboard.writeText(value).then(
        (): CopyOutcome => 'copied',
        (): CopyOutcome => 'failed',
      );
    } catch {
      outcome = 'failed';
    }

    this.showCopyOutcome(name, outcome);
  }

  /**
   * Shows what a copy came to, and clears it again after a moment.
   *
   * @param name - What was copied.
   * @param outcome - How it went.
   */
  private showCopyOutcome(name: string, outcome: CopyOutcome): void {
    this.copyOutcomes.update(outcomes => new Map(outcomes).set(name, outcome));
    this.announcement.set(
      outcome === 'copied' ? `${name} copied` : `${name} could not be copied`,
    );

    clearTimeout(this._timers.get(name));
    this._timers.set(
      name,
      setTimeout(() => {
        this.copyOutcomes.update(outcomes => {
          const next = new Map(outcomes);
          next.delete(name);

          return next;
        });
        this._timers.delete(name);
      }, COPY_FEEDBACK_MS),
    );
  }
}
