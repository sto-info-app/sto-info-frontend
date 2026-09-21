import { FLEET_RECRUITMENT_PILLS } from 'src/app/fleet/fleet-card.builders';
import { FleetRecruitmentState } from 'src/app/models/fleet.models';

/** One choice in a filter control, and what the reader sees. */
export interface FleetFilterOption<T extends string> {
  /** The value written into the query string. */
  value: T;

  /** What the reader picks. */
  label: string;
}

/**
 * The order the recruitment postures are offered in.
 *
 * Open to closed, because that is the order somebody looking for a Fleet to
 * join cares about them in, and the enum's own order is an implementation
 * detail nobody outside the database has agreed to.
 */
const RECRUITMENT_ORDER: readonly FleetRecruitmentState[] = [
  FleetRecruitmentState.OPEN,
  FleetRecruitmentState.APPLICATION,
  FleetRecruitmentState.INVITE_ONLY,
  FleetRecruitmentState.CLOSED,
];

/**
 * The recruitment postures a listing can be narrowed to.
 *
 * Labelled from the card's pill rather than from the registration form's
 * wording. A form asks how people should join and is answered "By
 * application"; a filter is a reader pointing at what the cards say, so
 * picking "Applications open" should return cards reading "Applications
 * open". Taken from the pills themselves so the two cannot drift apart.
 */
export const FLEET_RECRUITMENT_FILTER_OPTIONS: readonly FleetFilterOption<FleetRecruitmentState>[] =
  RECRUITMENT_ORDER.map(value => ({
    value,
    label: FLEET_RECRUITMENT_PILLS[value].label,
  }));

/**
 * Reads a recruitment filter, refusing anything nobody offered.
 *
 * @param value - The raw query-string value.
 * @returns The posture to narrow to, or undefined for no narrowing.
 */
export function recruitmentFilterOf(
  value: string | null,
): FleetRecruitmentState | undefined {
  return RECRUITMENT_ORDER.includes(value as FleetRecruitmentState)
    ? (value as FleetRecruitmentState)
    : undefined;
}

/**
 * What a reader can ask about a Fleet's roster.
 *
 * One question rather than two. The server takes `withRoster` and
 * `freshWithinDays` separately and refuses them combined — "never imported"
 * and "imported this month" cannot both be true — so asking them as one
 * closed set of choices makes the contradiction unrepresentable rather than
 * something a reader has to be told about after the fact.
 *
 * It is also the question as somebody actually has it: how recently, if at
 * all, has anybody checked who is in this Fleet.
 */
export enum FleetRosterFilter {
  /**
   * No narrowing, written as nothing at all so that choosing it drops the
   * parameter rather than writing a question into the URL that asks nothing.
   */
  ANY = '',
  /** Fleets nobody has ever imported a roster for. */
  NEVER = 'NEVER',
  /** Fleets a roster has been imported for at some point. */
  EVER = 'EVER',
  /** Imported within the last thirty days. */
  DAYS_30 = 'DAYS_30',
  /** Imported within the last ninety days. */
  DAYS_90 = 'DAYS_90',
  /** Imported within the last year, which is the longest window there is. */
  DAYS_365 = 'DAYS_365',
}

/** What the roster control asks the server for. */
export interface FleetRosterQuery {
  /** Whether a roster has ever been imported. */
  withRoster?: boolean;

  /** How recently the newest effective import must be. */
  freshWithinDays?: number;
}

/**
 * The roster choices, widest first.
 *
 * "Never imported" sits beside the windows rather than being hidden away,
 * because it is the half somebody filling in the site's gaps is looking for:
 * the Fleets nobody has checked at all.
 */
export const FLEET_ROSTER_OPTIONS: readonly FleetFilterOption<FleetRosterFilter>[] =
  [
    { value: FleetRosterFilter.ANY, label: 'Any' },
    { value: FleetRosterFilter.NEVER, label: 'Never imported' },
    { value: FleetRosterFilter.EVER, label: 'Imported at some point' },
    { value: FleetRosterFilter.DAYS_30, label: 'Imported in the last 30 days' },
    { value: FleetRosterFilter.DAYS_90, label: 'Imported in the last 90 days' },
    { value: FleetRosterFilter.DAYS_365, label: 'Imported in the last year' },
  ];

/**
 * What each choice asks for.
 *
 * A window sends no `withRoster`: the server treats a freshness window as
 * implying a roster exists, and sending both would be saying the same thing
 * twice in a way that only has a wrong version.
 */
const ROSTER_QUERIES: Readonly<Record<FleetRosterFilter, FleetRosterQuery>> = {
  [FleetRosterFilter.ANY]: {},
  [FleetRosterFilter.NEVER]: { withRoster: false },
  [FleetRosterFilter.EVER]: { withRoster: true },
  [FleetRosterFilter.DAYS_30]: { freshWithinDays: 30 },
  [FleetRosterFilter.DAYS_90]: { freshWithinDays: 90 },
  [FleetRosterFilter.DAYS_365]: { freshWithinDays: 365 },
};

/**
 * Reads the roster filter out of the query string.
 *
 * Anything else reads as no narrowing. The choices are a closed set nobody
 * has to guess at, so a value that is not one of them is somebody's typing
 * rather than a question, and the listing answers the one they meant.
 *
 * @param value - The raw query-string value.
 * @returns The choice the control should show.
 */
export function rosterFilterOf(value: string | null): FleetRosterFilter {
  const asked = value ?? '';

  return Object.hasOwn(ROSTER_QUERIES, asked)
    ? (asked as FleetRosterFilter)
    : FleetRosterFilter.ANY;
}

/**
 * Turns the roster filter into the parameters the server takes.
 *
 * @param value - The raw query-string value.
 * @returns The parameters to send, which is nothing at all for "Any".
 */
export function rosterQueryOf(value: string | null): FleetRosterQuery {
  return ROSTER_QUERIES[rosterFilterOf(value)];
}
