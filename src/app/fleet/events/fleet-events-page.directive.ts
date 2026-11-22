import { DestroyRef, Directive, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { filter, Observable } from 'rxjs';

import {
  FleetEventScopeKind,
  fleetEventAudienceLabel,
  FLEET_EVENTS_CHANGE_FAILED,
} from 'src/app/fleet/events/fleet-events.constants';
import { FleetEventsService } from 'src/app/fleet/events/fleet-events.service';
import {
  GovernancePageDirective,
  GovernanceScopeVm,
} from 'src/app/fleet/governance/governance-page.directive';
import { recruitmentRefusalOf } from 'src/app/fleet/recruitment/recruitment.utils';
import { FleetEventAudience } from 'src/app/models/fleet-events.models';
import { ConfirmPrompt } from 'src/app/shared/actions/confirm-prompt';

/**
 * The half of an events page that is the same for all of them (FC-030).
 *
 * A Community's, a Fleet's and an Armada's events are the same pages at
 * three kinds of address, resolved as their news is. Anybody who may see the
 * scope may open its calendar and its events' pages: which events and
 * answers they are shown is the server's answer. Only the editor asks for
 * more.
 */
@Directive()
export abstract class FleetEventsPageDirective<
  T,
> extends GovernancePageDirective<T> {
  protected readonly _events = inject(FleetEventsService);
  protected readonly _destroyRef = inject(DestroyRef);
  protected readonly _confirm = new ConfirmPrompt();

  /** Never shown on a reading page: anybody who may see the scope may. */
  readonly notPermittedMessage: string =
    'Only this calendar’s event managers can do that.';

  /** Whether a change is being made. */
  readonly busy = signal(false);

  /** What the last change came to, if it was refused or failed. */
  readonly error = signal<string | null>(null);

  /**
   * Where the scope's calendar is.
   *
   * @param scope - The scope.
   * @returns The router link.
   */
  eventsLinkOf(scope: GovernanceScopeVm): string[] {
    return [...scope.scopeLink, 'events'];
  }

  /**
   * Where one of its events is.
   *
   * @param scope - The scope.
   * @param eventId - The event.
   * @returns The router link.
   */
  eventLinkOf(scope: GovernanceScopeVm, eventId: string): string[] {
    return [...this.eventsLinkOf(scope), eventId];
  }

  /**
   * Where one occurrence of an event is.
   *
   * @param scope - The scope.
   * @param eventId - The event.
   * @param occurrenceId - The occurrence.
   * @returns The router link.
   */
  occurrenceLinkOf(
    scope: GovernanceScopeVm,
    eventId: string,
    occurrenceId: string,
  ): string[] {
    return [...this.eventLinkOf(scope, eventId), 'occurrences', occurrenceId];
  }

  /**
   * Where a new event is written.
   *
   * @param scope - The scope.
   * @returns The router link.
   */
  newLinkOf(scope: GovernanceScopeVm): string[] {
    return [...this.eventsLinkOf(scope), 'new'];
  }

  /**
   * Where an event is changed.
   *
   * @param scope - The scope.
   * @param eventId - The event.
   * @returns The router link.
   */
  editLinkOf(scope: GovernanceScopeVm, eventId: string): string[] {
    return [...this.eventLinkOf(scope, eventId), 'edit'];
  }

  /**
   * What kind of scope it is, for the wording of its audiences.
   *
   * @param scope - The scope.
   * @returns Its kind.
   */
  kindOf(scope: GovernanceScopeVm): FleetEventScopeKind {
    if (scope.isCommunity) {
      return 'COMMUNITY';
    }

    return scope.isArmada ? 'ARMADA' : 'FLEET';
  }

  /**
   * Who an event is for, in words.
   *
   * @param scope - The scope.
   * @param audience - The audience.
   * @returns Who may see it.
   */
  audienceOf(scope: GovernanceScopeVm, audience: FleetEventAudience): string {
    return fleetEventAudienceLabel(audience, this.kindOf(scope));
  }

  /**
   * Opens to anybody who may see the scope. The editor asks for more.
   *
   * @returns True.
   */
  protected override mayOpen(): boolean {
    return true;
  }

  /**
   * Makes a change once the reader has agreed to it.
   *
   * @param asked - The reader's answer.
   * @param change - The change.
   * @param done - What to do once it is made.
   */
  protected confirmThen(
    asked: Observable<boolean>,
    change: () => Observable<unknown>,
    done: () => void,
  ): void {
    asked.pipe(filter(Boolean)).subscribe(() => this.run(change(), done));
  }

  /**
   * Makes a change, reporting a refusal in the server's words where it
   * gave some.
   *
   * @param change - The change.
   * @param done - What to do once it is made.
   */
  protected run(change: Observable<unknown>, done: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    change.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        done();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(recruitmentRefusalOf(error, FLEET_EVENTS_CHANGE_FAILED));
      },
    });
  }
}
