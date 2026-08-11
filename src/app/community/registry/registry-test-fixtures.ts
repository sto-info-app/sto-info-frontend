import {
  PaginatedRegistryProfiles,
  RegistryAccount,
  RegistryAccountSummary,
  RegistryCharacter,
  RegistryCharacterSummary,
  RegistryProfile,
  RegistryProfileSummary,
} from '../models/registry.models';

/**
 * Builds a registry member summary fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A member summary.
 */
export function buildProfileSummary(
  overrides: Partial<RegistryProfileSummary> = {},
): RegistryProfileSummary {
  return {
    username: 'captain.picard',
    profilePicture100: 'https://cdn.example.com/pic/square100',
    profilePicture300: 'https://cdn.example.com/pic/square300',
    joinedAt: '2026-01-14T09:21:00.000Z',
    lastActiveAt: '2026-08-01T12:00:00.000Z',
    playingSince: '2015-03-04T00:00:00.000Z',
    publicAccountCount: 2,
    publicCharacterCount: 11,
    relationship: null,
    ...overrides,
  };
}

/**
 * Builds an account summary fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns An account summary.
 */
export function buildAccountSummary(
  overrides: Partial<RegistryAccountSummary> = {},
): RegistryAccountSummary {
  return {
    handle: 'SteveX#1234',
    slug: 'SteveX~1234',
    platformName: 'Steam',
    launcherName: 'Arc',
    accountTypeImageUrl: 'https://cdn.example.com/bg/public',
    lifetimeSubscription: true,
    accountCreatedDate: '2015-03-04T00:00:00.000Z',
    publicCharacterCount: 4,
    ...overrides,
  };
}

/**
 * Builds a captain summary fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A captain summary.
 */
export function buildCharacterSummary(
  overrides: Partial<RegistryCharacterSummary> = {},
): RegistryCharacterSummary {
  return {
    handle: 'Rex',
    slug: 'Rex@SteveX~1234',
    level: 65,
    rank: {
      title: 'Fleet Admiral',
      iconUrl: null,
      levelRange: 'Level 65',
    },
    species: { name: 'Vulcan', iconUrl: null },
    class: { name: 'Tactical', iconUrl: null },
    sex: { name: 'Male', iconUrl: null },
    faction: { name: 'Starfleet (2409)', iconUrl: null },
    generalFaction: { name: 'Federation', iconUrl: null },
    recruitType: { name: 'Standard', iconUrl: null },
    profilePicture100: 'https://cdn.example.com/char/square100',
    profilePicture300: 'https://cdn.example.com/char/square300',
    ...overrides,
  };
}

/**
 * Builds a member profile fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A member profile.
 */
export function buildProfile(
  overrides: Partial<RegistryProfile> = {},
): RegistryProfile {
  return {
    ...buildProfileSummary(),
    accounts: [buildAccountSummary()],
    ...overrides,
  };
}

/**
 * Builds an account detail fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns An account detail view.
 */
export function buildAccount(
  overrides: Partial<RegistryAccount> = {},
): RegistryAccount {
  return {
    ...buildAccountSummary(),
    characters: [buildCharacterSummary()],
    ...overrides,
  };
}

/**
 * Builds a captain detail fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A captain detail view.
 */
export function buildCharacter(
  overrides: Partial<RegistryCharacter> = {},
): RegistryCharacter {
  return {
    ...buildCharacterSummary(),
    firstName: 'Rex',
    middleName: null,
    lastName: 'Sorek',
    biography: 'A long and storied career.',
    createdDate: '2020-06-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Builds a page of member summaries.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A paginated member listing.
 */
export function buildProfilePage(
  overrides: Partial<PaginatedRegistryProfiles> = {},
): PaginatedRegistryProfiles {
  return {
    items: [buildProfileSummary()],
    total: 1,
    page: 1,
    pageSize: 12,
    ...overrides,
  };
}
