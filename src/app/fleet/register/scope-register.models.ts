import { Platform } from 'src/app/dashboard/models/sto-account.model';
import { FleetCommunity } from 'src/app/models/fleet.models';

/** Everything a child registration form needs before it can ask anything. */
export interface ScopeRegisterContext {
  /** The Community the record will belong to. */
  community: FleetCommunity;

  /** The platforms the catalogue knows about, for the picker. */
  platforms: Platform[];
}

/**
 * What a child registration page can currently show.
 *
 * Absent has a state of its own. A Community that does not answer to the
 * address is a different thing from one the server could not be asked
 * about, and a page that said the second when it meant the first would
 * send somebody looking for an outage that is not there.
 */
export type ScopeRegisterState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'ERROR'; readonly message: string }
  | { readonly kind: 'READY'; readonly context: ScopeRegisterContext };

/**
 * One record that already answers to the name being registered.
 *
 * Built by each page rather than shared with the server's shape, because a
 * Fleet has a freshness line and an Armada has none, and the warning is
 * read rather than processed.
 */
export interface ScopeDuplicateVm {
  /** Stable identity for list tracking. */
  id: string;

  /** The name it answers to, exactly as recorded. */
  name: string;

  /** Whose record it is, already written out. */
  heldBy: string;

  /** The platform it is recorded on. */
  platform: string;

  /**
   * How current the record is, where that can be said.
   *
   * Null for an Armada: nothing imports a roster for one, so there is
   * nothing to be fresh, and an empty line would imply there was.
   */
  freshness: string | null;

  /** Its lifecycle state, where it is not simply operating. */
  lifecycle: string | null;
}
