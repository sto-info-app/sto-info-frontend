import { HelpFeatures } from './help.models';

/** Every switch Help waits on, on. */
export const ALL_HELP_FEATURES_ON: HelpFeatures = {
  STORYTIME: 'ENABLED',
  FLEET: 'ENABLED',
  CHAT: 'ENABLED',
};

/**
 * The switches, all on but for those given.
 *
 * @param overrides The switches that differ.
 * @returns The switches.
 */
export const helpFeaturesWith = (
  overrides: Partial<HelpFeatures>,
): HelpFeatures => ({ ...ALL_HELP_FEATURES_ON, ...overrides });

/**
 * The labels the Settings form shows, which its Help guides must use word for
 * word (FC-049). The Settings page's spec checks each is on the page and the
 * Help data's spec checks each is in the guides, so renaming a control
 * without its guide fails one of them.
 */
export const SETTINGS_FORM_LABELS: readonly string[] = [
  'Privacy Mode',
  'Login inactivity timeout',
  'Show dates and times in',
  'Automatically',
  'Read Fleet roster exports as',
  'Ask me each time',
  'Who can see when I am online',
  'Appear offline',
  'Show when I am typing',
  'Mentions',
  'Replies',
  'Direct messages',
  'Roster association proposals',
  'Event reminders',
  'Save',
  'Configure Custom Tracking',
];
