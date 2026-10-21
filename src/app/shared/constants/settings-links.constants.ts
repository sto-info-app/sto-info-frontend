/**
 * The tabs of the Settings page, in the order it shows them, each named in
 * its address: `/dashboard/settings?tab=chat`.
 */
export const SETTINGS_TABS = [
  'account',
  'chat',
  'fleet',
  'notifications',
  'custom-tracking',
] as const;

/** One tab of the Settings page. */
export type SettingsTab = (typeof SETTINGS_TABS)[number];

/** The tab the Settings page opens on when its address names none. */
export const DEFAULT_SETTINGS_TAB: SettingsTab = 'account';

/**
 * Where each setting is on the Settings page: the ID of the field or row
 * that holds it, named after a `#` in a link that goes straight to it.
 */
export const SETTINGS_ANCHORS = {
  privacyMode: 'setting-privacy-mode',
  sessionTimeout: 'setting-session-timeout',
  displayTimezone: 'setting-display-timezone',
  registry: 'setting-registry',
  presence: 'setting-presence',
  appearOffline: 'setting-appear-offline',
  typing: 'setting-typing',
  exportTimezone: 'setting-export-timezone',
  mentions: 'setting-mentions',
  replies: 'setting-replies',
  directMessages: 'setting-direct-messages',
  rosterProposals: 'setting-roster-proposals',
  eventReminders: 'setting-event-reminders',
} as const;

/** Where a cog leads: a tab, and the setting on it if there is one. */
export interface SettingsLinkTarget {
  readonly tab: SettingsTab;
  readonly setting?: string;
  /** What the cog is called, to a screen reader and in its tooltip. */
  readonly label: string;
}

/**
 * The cogs around the site, each going to the settings for the place it is
 * in. Written once here, so a cog and the page it leads to cannot disagree
 * about where a setting lives.
 */
export const SETTINGS_LINKS = {
  chat: { tab: 'chat', label: 'Chat settings' },
  notifications: { tab: 'notifications', label: 'Notification settings' },
  fleet: { tab: 'fleet', label: 'Fleet settings' },
  rosterExports: {
    tab: 'fleet',
    setting: SETTINGS_ANCHORS.exportTimezone,
    label: 'Roster import settings',
  },
  eventReminders: {
    tab: 'notifications',
    setting: SETTINGS_ANCHORS.eventReminders,
    label: 'Event reminder settings',
  },
  rosterProposals: {
    tab: 'notifications',
    setting: SETTINGS_ANCHORS.rosterProposals,
    label: 'Roster proposal settings',
  },
  registry: {
    tab: 'account',
    setting: SETTINGS_ANCHORS.registry,
    label: 'Registry visibility settings',
  },
} as const satisfies Record<string, SettingsLinkTarget>;
