import { FleetScopeCardStatus } from 'src/app/fleet/components/fleet-scope-card/fleet-scope-card.model';
import { FleetTabsVm } from 'src/app/fleet/components/fleet-tabs/fleet-tabs.component';
import { FleetScopeType } from 'src/app/fleet/constants/fleet-scope.constants';
import { FleetPicture } from 'src/app/fleet/fleet-artwork';
import { FleetImageSlot } from 'src/app/fleet/fleet-image.constants';
import { FleetArtworkTarget } from 'src/app/fleet/fleet-image.service';
import { FleetScopeRelationship } from 'src/app/models/fleet.models';

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
 * Where the reader stands to the Community a page belongs to.
 *
 * Carries the membership standing and the following together because the
 * page draws them together: the difference between the two is the thing a
 * reader most often gets wrong, and it is only visible when both are said
 * at once.
 */
export interface FleetFollowVm {
  /** The Community to follow, or null when the scope has none. */
  readonly communityId: string | null;

  /** What this page is about, for the standing sentence: Community, Fleet. */
  readonly scopeNoun: string;

  /** The reader's membership standing at this scope. */
  readonly relationship: FleetScopeRelationship;

  /** Whether they follow the owning Community. */
  readonly isFollowing: boolean;

  /** How many follow it, or null when there is no Community. */
  readonly followerCount: number | null;
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
 * Something the reader may go and do to this record.
 *
 * A link rather than a button, because everything offered here happens on a
 * page of its own: an address somebody can bookmark, share with whoever
 * actually holds the export, and reach with a keyboard.
 *
 * Offered only where the viewer may use it. A row of controls nobody can
 * press tells a reader about a permission they do not have and did not ask
 * about — and on a Fleet page, where anybody may look, most readers are
 * exactly that person.
 */
export interface FleetScopeAction {
  /** What the control says. */
  readonly label: string;

  /** Where it goes. */
  readonly link: string[];

  /** What a screen reader is told, where the label alone is not enough. */
  readonly description: string;
}

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

  /**
   * What the reader may go and do here, which may be nothing.
   *
   * Empty rather than null: there is no difference between a record with no
   * actions and a reader offered none, and a page that drew the two
   * differently would be saying something it cannot know.
   */
  readonly actions: FleetScopeAction[];

  /** What was written about it, where anything was. */
  readonly description: string | null;

  /**
   * The follow control and the reader's standing, where there is a scope
   * with a Community behind it to stand in.
   *
   * Null on a page where following makes no sense at all, rather than a
   * control that explains itself away.
   */
  readonly following: FleetFollowVm | null;

  /**
   * The artwork controls, where the viewer may use any of them.
   *
   * Null rather than a set of disabled controls for somebody who may not
   * change anything: a row of buttons nobody can press is a page telling a
   * reader about a permission they do not have and did not ask about.
   */
  readonly artwork: FleetScopeArtworkVm | null;

  /**
   * The Fleet's section tabs, on a Fleet with a roster to have sections
   * about. Absent or null on a Community or Armada page, and on a Fleet with
   * no roster.
   */
  readonly tabs?: FleetTabsVm | null;
}
