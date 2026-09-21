import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FleetDirectorySortOption } from 'src/app/fleet/directory/fleet-directory-page.models';
import {
  FleetDirectorySort,
  FleetDirectoryStatusFilter,
} from 'src/app/models/fleet.models';

/** One choice in the lifecycle control, and what it is called. */
export interface FleetStatusOption {
  /** The value sent to the server. */
  value: FleetDirectoryStatusFilter;

  /** What the reader picks. */
  label: string;
}

/**
 * The lifecycle filter's three choices.
 *
 * "Every record" rather than "Any" because the two people using a directory
 * want opposite things: somebody looking for a Fleet to join wants the ones
 * that still exist, and somebody checking whether a name is taken wants every
 * record there has ever been. Being shown only the live ones would tell the
 * second one the name is free when it is not.
 */
export const FLEET_STATUS_OPTIONS: readonly FleetStatusOption[] = [
  { value: FleetDirectoryStatusFilter.ACTIVE, label: 'Operating' },
  { value: FleetDirectoryStatusFilter.CLOSED, label: 'Closed' },
  { value: FleetDirectoryStatusFilter.ANY, label: 'Every record' },
];

/**
 * The questions every Fleet listing accepts: a name, a lifecycle, an order.
 *
 * Searching is a button rather than a keystroke. The server is asked a whole
 * question at a time, and a listing that reloaded per character would send
 * nineteen requests for "Starfleet Command" and draw whichever came back
 * last.
 *
 * Anything a particular listing has of its own goes in the slot below,
 * because the alternative — an input per filter any listing might want —
 * would put a recruitment control on the Armada listing, which recruits
 * nobody.
 */
@Component({
  selector: 'app-fleet-directory-filters',
  templateUrl: './fleet-directory-filters.component.html',
  styleUrls: ['./fleet-directory-filters.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class FleetDirectoryFiltersComponent {
  /** The lifecycle choices, in the order they are offered. */
  readonly statusOptions = FLEET_STATUS_OPTIONS;

  /** What is currently in the search box. */
  searchTerm = '';

  /** The search the URL is holding. */
  @Input({ required: true }) set search(value: string) {
    this.searchTerm = value;
  }

  /** What the search box is asking for, e.g. a Fleet name. */
  @Input({ required: true }) searchLabel!: string;

  /** An example of what to type. */
  @Input({ required: true }) searchPlaceholder!: string;

  /** The lifecycle filter in force. */
  @Input({ required: true }) status!: FleetDirectoryStatusFilter;

  /** The ordering in force. */
  @Input({ required: true }) sort!: FleetDirectorySort;

  /** The orderings this listing offers. */
  @Input({ required: true }) sortOptions!: readonly FleetDirectorySortOption[];

  /**
   * Whether the URL is currently narrowing the listing in any way.
   *
   * Asked of the page rather than worked out here, because the filters this
   * bar knows about are the three every listing shares and the ones that
   * matter most are projected into it by whichever listing this is.
   */
  @Input() filtersApplied = false;

  /** Emits the name to search for, or an empty string to stop searching. */
  @Output() readonly searchChange = new EventEmitter<string>();

  /** Emits the lifecycle filter the reader picked. */
  @Output() readonly statusChange =
    new EventEmitter<FleetDirectoryStatusFilter>();

  /** Emits the ordering the reader picked. */
  @Output() readonly sortChange = new EventEmitter<FleetDirectorySort>();

  /** Emits when the reader asked for the listing back as it started. */
  @Output() readonly cleared = new EventEmitter<void>();

  /**
   * Searches for what is in the box.
   */
  onSubmit(): void {
    this.searchChange.emit(this.searchTerm.trim());
  }

  /**
   * Puts the listing back to the question it starts on.
   *
   * Everything, not just the search. Somebody who has narrowed by platform,
   * posture, allegiance and roster and wants to start again would otherwise
   * have to undo four controls one at a time, or edit the address bar.
   *
   * The box is emptied here as well as in the URL, and said straight away
   * rather than waiting for a submit the reader has no reason to expect.
   */
  onClear(): void {
    this.searchTerm = '';
    this.cleared.emit();
  }

  /**
   * Narrows to one set of lifecycle states.
   *
   * @param value - The value the control now holds.
   */
  onStatusPicked(value: string): void {
    this.statusChange.emit(value as FleetDirectoryStatusFilter);
  }

  /**
   * Reorders the listing.
   *
   * @param value - The value the control now holds.
   */
  onSortPicked(value: string): void {
    this.sortChange.emit(value as FleetDirectorySort);
  }
}
