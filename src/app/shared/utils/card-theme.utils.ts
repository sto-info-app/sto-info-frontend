import { WHITESPACE_PATTERN } from '../constants/regex-patterns.constants';

const ACCOUNT_BG_ROOT = '/assets/account-types';

/** Background images keyed by the platform theme class. */
const PLATFORM_BG_IMAGES: Record<string, string> = {
  'platform-playstation': `${ACCOUNT_BG_ROOT}/account_type_playstation.jpg`,
  'platform-xbox': `${ACCOUNT_BG_ROOT}/account_type_xbox.jpg`,
  'platform-arc': `${ACCOUNT_BG_ROOT}/account_type_windows_arc.jpg`,
  'platform-epic': `${ACCOUNT_BG_ROOT}/account_type_windows_epic.jpg`,
  'platform-steam': `${ACCOUNT_BG_ROOT}/account_type_windows_steam.jpg`,
};

/** Background images keyed by launcher, for PC accounts. */
const PC_LAUNCHER_BG_IMAGES: Record<string, string> = {
  arc: `${ACCOUNT_BG_ROOT}/account_type_windows_arc.jpg`,
  epic: `${ACCOUNT_BG_ROOT}/account_type_windows_epic.jpg`,
  steam: `${ACCOUNT_BG_ROOT}/account_type_windows_steam.jpg`,
};

/** Platform theme classes keyed by the lower-cased platform name. */
const PLATFORM_CLASSES: Record<string, string> = {
  playstation: 'platform-playstation',
  ps: 'platform-playstation',
  xbox: 'platform-xbox',
  steam: 'platform-steam',
  windows: 'platform-pc',
  pc: 'platform-pc',
  arc: 'platform-arc',
  epic: 'platform-epic',
};

/** Launcher theme classes, only applied to PC accounts. */
const PC_LAUNCHER_CLASSES: Record<string, string> = {
  arc: 'launcher-arc',
  epic: 'launcher-epic',
  steam: 'launcher-steam',
};

/**
 * Maps a platform name onto its account-card theme class.
 *
 * @param platformName - The platform's display name.
 * @returns The theme class, or an empty string when unrecognised.
 */
export function getPlatformClass(platformName?: string | null): string {
  const name = platformName?.trim().toLowerCase() ?? '';
  return PLATFORM_CLASSES[name] ?? '';
}

/**
 * Maps a launcher name onto its account-card theme class.
 *
 * Launcher theming only applies to PC accounts; every other platform carries
 * its own colours.
 *
 * @param platformClass - The resolved platform theme class.
 * @param launcherName - The launcher's display name.
 * @returns The launcher theme class, or an empty string when not applicable.
 */
export function getLauncherClass(
  platformClass: string,
  launcherName?: string | null,
): string {
  if (platformClass !== 'platform-pc') {
    return '';
  }

  const launcher = launcherName?.trim().toLowerCase() ?? '';
  return PC_LAUNCHER_CLASSES[launcher] ?? '';
}

/**
 * Resolves the account card's background image.
 *
 * @param platformClass - The resolved platform theme class.
 * @param launcherName - The launcher's display name.
 * @returns The background image path.
 */
export function getAccountBgImagePath(
  platformClass: string,
  launcherName?: string | null,
): string {
  if (platformClass === 'platform-pc') {
    const launcher = launcherName?.trim().toLowerCase() ?? '';
    return (
      PC_LAUNCHER_BG_IMAGES[launcher] ??
      `${ACCOUNT_BG_ROOT}/account_type_windows_default.jpg`
    );
  }

  return (
    PLATFORM_BG_IMAGES[platformClass] ??
    `${ACCOUNT_BG_ROOT}/account_type_default.jpg`
  );
}

/**
 * Maps a general faction name onto its character-card theme class.
 *
 * @param generalFactionName - The general faction's display name.
 * @returns The theme class, defaulting to `unknown`.
 */
export function getFactionClass(generalFactionName?: string | null): string {
  return (
    generalFactionName?.toLowerCase().replaceAll(WHITESPACE_PATTERN, '-') ||
    'unknown'
  );
}

/**
 * Maps a career class name onto its character-card header theme class.
 *
 * @param className - The career class's display name.
 * @returns The theme class, defaulting to `unknown`.
 */
export function getClassCategory(className?: string | null): string {
  const name = className?.toLowerCase() ?? '';
  if (name.includes('tactical')) return 'tactical';
  if (name.includes('engineering')) return 'engineering';
  if (name.includes('science')) return 'science';
  return 'unknown';
}

/**
 * Maps a sex name onto its Font Awesome icon name.
 *
 * @param sexName - The sex's display name.
 * @returns The Font Awesome icon name.
 */
export function getSexIcon(sexName?: string | null): string {
  const sex = sexName?.toLowerCase() ?? '';
  if (sex === 'male') return 'mars';
  if (sex === 'female') return 'venus';
  return 'circle-question';
}
