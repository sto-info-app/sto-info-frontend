export enum NotificationSeverity {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum NotificationTarget {
  BROADCAST = 'BROADCAST',
  USER = 'USER',
}

export interface Banner {
  id: string;
  severity: NotificationSeverity;
  title: string | null;
  message: string;
  linkUrl: string | null;
  linkLabel: string | null;
  dismissible: boolean;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerRequest {
  severity?: NotificationSeverity;
  title?: string;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
  dismissible?: boolean;
  active?: boolean;
  startsAt?: string;
  endsAt?: string;
}

export type UpdateBannerRequest = Partial<
  Omit<CreateBannerRequest, 'startsAt' | 'endsAt'>
> & {
  startsAt?: string | null;
  endsAt?: string | null;
};

export interface AppNotification {
  id: string;
  target: NotificationTarget;
  userId: string | null;
  severity: NotificationSeverity;
  title: string;
  body: string;
  linkUrl: string | null;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
}

export interface PaginatedInbox {
  items: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export interface InboxQuery {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateNotificationRequest {
  target?: NotificationTarget;
  userId?: string;
  severity?: NotificationSeverity;
  title: string;
  body: string;
  linkUrl?: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface AppState {
  banners: Banner[];
  unreadCount: number;
}

export const NOTIFICATION_SEVERITY_LABELS: Record<
  NotificationSeverity,
  string
> = {
  [NotificationSeverity.INFO]: 'Info',
  [NotificationSeverity.SUCCESS]: 'Success',
  [NotificationSeverity.WARNING]: 'Warning',
  [NotificationSeverity.CRITICAL]: 'Critical',
};

/**
 * One user returned by the admin user-search endpoint.
 */
export interface UserSearchResult {
  id: string;
  username: string;
  /** The member's real name, or null when they have given none. */
  fullName: string | null;
  /** What the account is allowed to do, e.g. `ADMIN`. */
  role: string;
  /** When the member last signed in, or null when they never have. */
  lastLoginAt: string | null;
}

/**
 * A paginated page of user-search results.
 */
export interface UserSearchPage {
  items: UserSearchResult[];
  total: number;
  page: number;
  pageSize: number;
}
