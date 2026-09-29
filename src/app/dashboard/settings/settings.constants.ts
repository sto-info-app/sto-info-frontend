import { PresenceVisibility } from '../models/user.model';

/**
 * The presence audiences, and how the page describes each one.
 *
 * Here rather than in the component so the Settings help (FC-049) quotes the
 * same labels the form shows.
 */
export const PRESENCE_OPTIONS: readonly {
  value: PresenceVisibility;
  label: string;
}[] = [
  { value: 'EVERYONE', label: 'Everyone' },
  { value: 'FRIENDS', label: 'Friends only' },
  { value: 'FLEETS_AND_ARMADAS', label: 'My Fleets and Armadas' },
];
