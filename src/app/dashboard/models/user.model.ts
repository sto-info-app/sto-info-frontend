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
  profilePicture?: string;
  publiclyVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface UserProfileUpdateResult {
  affected: number;
  userProfileData: UserProfile | null;
}
