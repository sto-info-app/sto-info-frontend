/** The scope an activity item happened in (FC-029). */
export interface FleetActivityScope {
  readonly kind: 'COMMUNITY' | 'FLEET' | 'ARMADA';
  readonly name: string;
  /** Its page on the site. */
  readonly path: string;
}

/** One thing that happened, as the reader may see it now. */
export interface FleetActivityItem {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: string;
  /** What happened, as a sentence. */
  readonly sentence: string;
  /** Where to read more on the site, or null. */
  readonly path: string | null;
  readonly scope: FleetActivityScope;
}

/** A page of a feed, newest first. */
export interface FleetActivityPage {
  readonly items: readonly FleetActivityItem[];
  /** Where the next page starts, or null at the end. */
  readonly next: string | null;
}
