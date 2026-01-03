export interface StoAccount {
  id: string;
  handle: string;
  username?: string;
  email?: string;
  notes?: string;
  accountCreatedDate?: string;
  publiclyVisible: boolean;
  lifetimeSubscription: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  platformId?: string;
  launcherId?: string;
  userId: string;
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
  platformId: string;
  launcherId: string;
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
