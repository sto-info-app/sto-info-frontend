import { SettingsTab } from 'src/app/shared/constants/settings-links.constants';

import { PresenceVisibility, UserSettings } from '../models/user.model';

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

/**
 * What the page calls each setting, as its control is labelled.
 *
 * The "Saved" announcement and the error that puts a failed change back both
 * name the setting in the words the reader sees beside it, so neither leaves
 * them wondering which control it meant.
 */
export const SETTING_LABELS: Readonly<Record<keyof UserSettings, string>> = {
  privacyMode: 'Privacy Mode',
  sessionTimeoutMinutes: 'Login inactivity timeout',
  displayTimezone: 'Show dates and times in',
  stoExportTimezone: 'Read Fleet roster exports as',
  presenceVisibility: 'Who can see when I am online',
  appearOffline: 'Appear offline',
  typingIndicatorsEnabled: 'Show when I am typing',
  notifyMention: 'Mentions',
  notifyReply: 'Replies',
  notifyDirectMessage: 'Direct messages',
  notifyRosterAssociation: 'Roster association proposals',
  notifyEventReminder: 'Event reminders',
};

/**
 * What the registry switch is called, on Settings as on the Personnel
 * Record's edit dialog. It belongs to the profile rather than the settings,
 * so it has no entry above.
 */
export const REGISTRY_LABEL = 'Show me in the Galactic Personnel Registry';

/** What each tab of the page says. */
export const SETTINGS_TAB_LABELS: Readonly<Record<SettingsTab, string>> = {
  account: 'Account',
  chat: 'Chat',
  fleet: 'Fleet',
  notifications: 'Notifications',
  'custom-tracking': 'Custom Tracking',
};
