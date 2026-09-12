export interface StoAccount {
  id: string;
  accountTypeImageUrl?: string;
  handle: string;
  username?: string;
  email?: string;
  notes?: string;
  accountCreatedDate?: string;
  publiclyVisible: boolean;
  lifetimeSubscription: boolean;
  /**
   * When the owner pinned this account to the top of their own list, or null
   * when it is not pinned. Private to the owner; never published to the
   * registry.
   */
  pinnedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  platformId?: string;
  launcherId?: string;
  userId: string;
  characterCount?: number;
  userCharacterCount?: number;
  endeavourTotalNodes?: number;
}

export interface Platform {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Launcher {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PlatformLauncher {
  platformId?: string | null;
  launcherId?: string | null;
  backgroundImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateStoAccountRequest {
  handle: string;
  username?: string;
  email?: string;
  notes?: string;
  accountCreatedDate?: string;
  publiclyVisible: boolean;
  lifetimeSubscription: boolean;
  platformId?: string;
  launcherId?: string;
}

export type UpdateStoAccountRequest = Partial<CreateStoAccountRequest>;
