import { formatDate } from '@angular/common';
import {
  AccountCardDetail,
  AccountCardVm,
} from 'src/app/shared/components/account-card/account-card.model';
import { CharacterCardVm } from 'src/app/shared/components/character-card/character-card.model';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';
import {
  getAccountBgImagePath,
  getClassCategory,
  getFactionClass,
  getLauncherClass,
  getPlatformClass,
  getSexIcon,
} from 'src/app/shared/utils/card-theme.utils';
import {
  RegistryAccountSummary,
  RegistryCharacterSummary,
} from '../models/registry.models';

/**
 * Builds the router link to a registry member's profile.
 *
 * Segments are returned raw, never pre-encoded: `routerLink` percent-encodes
 * each segment itself, so encoding here would double-encode characters such as
 * the `@` in a captain's full handle (`%40` becoming `%2540`).
 *
 * @param username - The member's profile username.
 * @returns The profile router link segments.
 */
export function buildRegistryProfileLink(username: string): string[] {
  return [`/${APP_ROUTES.COMMUNITY_REGISTRY_PROFILES}`, username];
}

/**
 * Builds the router link to a publicly visible STO account.
 *
 * @param username - The owning member's profile username.
 * @param accountSlug - The account's URL slug.
 * @returns The account router link segments.
 */
export function buildRegistryAccountLink(
  username: string,
  accountSlug: string,
): string[] {
  return [...buildRegistryProfileLink(username), accountSlug];
}

/**
 * Builds the router link to a publicly visible captain.
 *
 * @param username - The owning member's profile username.
 * @param accountSlug - The owning account's URL slug.
 * @param characterSlug - The captain's URL slug.
 * @returns The captain router link segments.
 */
export function buildRegistryCharacterLink(
  username: string,
  accountSlug: string,
  characterSlug: string,
): string[] {
  return [...buildRegistryAccountLink(username, accountSlug), characterSlug];
}

/**
 * Maps a public account summary onto the shared account card model.
 *
 * The registry is read-only, so the card carries no actions, and the endeavour
 * badge is omitted because endeavour progress is never published.
 *
 * @param account - The public account summary.
 * @param username - The owning member's profile username.
 * @returns The card presentation model.
 */
export function buildRegistryAccountCard(
  account: RegistryAccountSummary,
  username: string,
): AccountCardVm {
  const platformClass = getPlatformClass(account.platformName);

  return {
    id: account.slug,
    handle: account.handle,
    link: buildRegistryAccountLink(username, account.slug),
    themeClass: [
      platformClass,
      getLauncherClass(platformClass, account.launcherName),
    ]
      .filter(Boolean)
      .join(' '),
    bgImagePath:
      account.accountTypeImageUrl?.trim() ||
      getAccountBgImagePath(platformClass, account.launcherName),
    lifetimeSubscription: account.lifetimeSubscription,
    characterCount: account.publicCharacterCount,
    // Platform and launcher are shown as visible, labelled rows below, so the
    // screen-reader-only announcement would just repeat them.
    platformName: null,
    launcherName: null,
    details: buildRegistryAccountDetails(account),
    endeavour: null,
    actions: [],
  };
}

/**
 * Builds the public detail rows shown in a registry account card's body.
 *
 * Every row is labelled visibly: unlike the dashboard's cards — where the
 * viewer already knows what their own username, email and notes are — a visitor
 * has no context for a bare value such as a date.
 *
 * @param account - The public account summary.
 * @returns The detail rows for the card.
 */
function buildRegistryAccountDetails(
  account: RegistryAccountSummary,
): AccountCardDetail[] {
  const details: AccountCardDetail[] = [];

  if (account.platformName) {
    details.push({
      icon: 'fas fa-desktop',
      text: account.platformName,
      label: 'Platform',
      showLabel: true,
    });
  }

  if (account.launcherName) {
    details.push({
      icon: 'fas fa-rocket-launch',
      text: account.launcherName,
      label: 'Launcher',
      showLabel: true,
    });
  }

  if (account.accountCreatedDate) {
    details.push({
      icon: 'fas fa-calendar',
      // Matches the `date: 'longDate'` pipe used across the rest of the app.
      text: formatDate(account.accountCreatedDate, 'longDate', 'en-US'),
      label: 'Playing Since',
      showLabel: true,
      variant: 'secondary',
    });
  }

  details.push({
    icon: 'fas fa-star',
    text: account.lifetimeSubscription ? 'Yes' : 'No',
    label: 'Lifetime Subscription',
    showLabel: true,
    variant: 'secondary',
  });

  return details;
}

/**
 * Maps a public captain summary onto the shared captain card model.
 *
 * @param character - The public captain summary.
 * @param username - The owning member's profile username.
 * @param accountSlug - The owning account's URL slug.
 * @returns The card presentation model.
 */
export function buildRegistryCharacterCard(
  character: RegistryCharacterSummary,
  username: string,
  accountSlug: string,
): CharacterCardVm {
  return {
    id: character.slug,
    handle: character.handle,
    level: character.level,
    link: buildRegistryCharacterLink(username, accountSlug, character.slug),
    factionClass: getFactionClass(character.generalFaction?.name),
    classCategory: getClassCategory(character.class?.name),
    sexIcon: getSexIcon(character.sex?.name),
    imageUrl: character.profilePicture100 ?? character.profilePicture300,
    speciesName: character.species?.name ?? null,
    rankTitle: character.rank?.title ?? null,
    rankIconUrl: character.rank?.iconUrl ?? null,
    factionName: character.faction?.name ?? null,
    factionIconUrl: character.faction?.iconUrl ?? null,
    recruitTypeName: character.recruitType?.name ?? null,
    recruitTypeIconUrl: character.recruitType?.iconUrl ?? null,
    actions: [],
  };
}
