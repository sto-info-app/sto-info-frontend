export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  lastPasswordReset?: Date;
  isAccountDisabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  profile?: UserProfile;
}

export interface UserProfile {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  profilePicture300?: string | null;
  publiclyVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface UserProfileUpdateResult {
  affected: number;
  userProfileData: UserProfile | null;
}

/**
 * Who may see that a user is online.
 *
 * Hiding is not a value here. A user who wants to disappear for an afternoon
 * sets `appearOffline` instead, so the audience they chose is still there when
 * they come back.
 */
export type PresenceVisibility = 'EVERYONE' | 'FRIENDS' | 'FLEETS_AND_ARMADAS';

/**
 * Every account setting, as the settings page reads them.
 *
 * `displayTimezone` is null when dates should follow the viewer's own device,
 * which is the default. `stoExportTimezone` is null until the user has chosen
 * one; it is deliberately never guessed, because reading a roster export in the
 * wrong zone shifts every date in it by hours.
 */
export interface UserSettings {
  privacyMode: boolean;
  sessionTimeoutMinutes: number;
  displayTimezone: string | null;
  stoExportTimezone: string | null;
  presenceVisibility: PresenceVisibility;
  appearOffline: boolean;
  typingIndicatorsEnabled: boolean;
  notifyMention: boolean;
  notifyReply: boolean;
  notifyDirectMessage: boolean;
  notifyRosterAssociation: boolean;
  notifyEventReminder: boolean;
}

/**
 * A change to the account settings.
 *
 * Only privacy mode is required; an omitted field leaves the stored value
 * alone, which is what lets an older client keep working rather than quietly
 * resetting settings it has never heard of.
 */
export type UserSettingsUpdate = Partial<UserSettings> &
  Pick<UserSettings, 'privacyMode'>;
