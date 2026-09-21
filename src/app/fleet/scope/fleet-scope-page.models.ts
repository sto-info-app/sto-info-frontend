import { FleetScopeCardStatus } from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.model';
import { FleetScopeType } from 'src/app/fleet/constants/fleet-scope.constants';
import { FleetPicture } from 'src/app/fleet/fleet-artwork';
import { FleetImageSlot } from 'src/app/fleet/fleet-image.constants';
import { FleetArtworkTarget } from 'src/app/fleet/fleet-image.service';

/** One labelled line in the block of facts beneath a scope's name. */
export interface FleetScopeFact {
  /** What the line is about, e.g. "Platform". */
  label: string;

  /** What it says. Already written out, dates included. */
  value: string;
}

/**
 * The head of a Community, Fleet or Armada page.
 *
 * One shape for all three, because the head of each says the same six
 * things: what kind of record it is, what it is called, whose it is, what
 * state it is in, what it looks like, and the handful of facts that tell it
 * apart from a record of the same name.
 */
export interface FleetScopeHeaderVm {
  /** Which level of the hierarchy this is. */
  scope: FleetScopeType;

  /** The name, exactly as recorded, edge spaces and all. */
  name: string;

  /** The platform, or null for a Community, which spans all of them. */
  platform: string | null;

  /** The Community holding this, or null for a Community itself. */
  communityName: string | null;

  /** Router link to that Community, or null when there is none to open. */
  communityLink: string[] | null;

  /** The wide picture across the top, or null when there is none. */
  banner: FleetPicture | null;

  /** The square picture beside the name, or null when there is none. */
  emblem: FleetPicture | null;

  /** The state pill, or null when there is nothing to say about state. */
  status: FleetScopeCardStatus | null;

  /** The labelled lines beneath the name. */
  facts: FleetScopeFact[];
}

/** One of the two artwork slots, as the page offers it. */
export interface FleetScopeArtworkSlotVm {
  /** Which picture this is. */
  readonly slot: FleetImageSlot;

  /** What it is called where somebody is offered it. */
  readonly label: string;

  /** What is in the slot now, or null when it is empty. */
  readonly picture: FleetPicture | null;

  /**
   * Whether to offer changing it.
   *
   * Per slot rather than per record, because at a Fleet nobody has
   * registered they are two different answers: an empty slot is open to
   * anybody signed in, and a filled one belongs to whoever filled it.
   */
  readonly mayManage: boolean;
}

/** The artwork controls a scope page offers, and what they act on. */
export interface FleetScopeArtworkVm {
  /** Where an upload for this record is sent. */
  readonly target: FleetArtworkTarget;

  /** The record's name, for the dialogue's heading. */
  readonly scopeName: string;

  /** The banner and the emblem, in that order. */
  readonly slots: readonly FleetScopeArtworkSlotVm[];
}

/**
 * What a scope page can currently show.
 *
 * Absent has a state of its own rather than sharing the failure's. "No such
 * Fleet" and "the directory is down" call for different things from a
 * reader, and a page that said the second when it meant the first would send
 * somebody looking for an outage that is not there.
 */
export type FleetScopePageState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'ERROR'; readonly message: string }
  | FleetScopeReadyState;

/**
 * A scope page with a record to show.
 *
 * Named separately so that a page building one says so in its signature.
 * Returning the whole union would leave every caller narrowing a value that
 * is never anything else.
 */
export interface FleetScopeReadyState {
  readonly kind: 'READY';

  /** The head of the page: what this is, and the facts telling it apart. */
  readonly header: FleetScopeHeaderVm;

  /**
   * Something about the record the reader should know before reading it,
   * where there is anything.
   *
   * Above the record rather than among its facts, because it explains what
   * kind of thing they are looking at rather than stating one more property
   * of it: a Fleet nobody here runs is the case this exists for.
   */
  readonly notice: string | null;

  /** What was written about it, where anything was. */
  readonly description: string | null;

  /**
   * The artwork controls, where the viewer may use any of them.
   *
   * Null rather than a set of disabled controls for somebody who may not
   * change anything: a row of buttons nobody can press is a page telling a
   * reader about a permission they do not have and did not ask about.
   */
  readonly artwork: FleetScopeArtworkVm | null;
}
