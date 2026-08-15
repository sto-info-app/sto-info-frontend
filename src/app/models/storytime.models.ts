/**
 * The audience a Story is suitable for.
 *
 * None of these gate access. Mature shows a warning banner and a listing icon,
 * and Adults Only a stronger warning, but neither requires an acknowledgement.
 */
export enum ContentRating {
  GENERAL = 'GENERAL',
  MATURE = 'MATURE',
  ADULTS_ONLY = 'ADULTS_ONLY',
}

/**
 * How each content rating is described to readers.
 *
 * The single authoritative mapping, so a rating is never worded one way on a
 * card and another on a warning banner.
 */
export const CONTENT_RATING_LABELS: Readonly<Record<ContentRating, string>> = {
  [ContentRating.GENERAL]: 'General',
  [ContentRating.MATURE]: 'Mature',
  [ContentRating.ADULTS_ONLY]: 'Adults Only',
};

/**
 * The longer explanation shown alongside a rating warning.
 */
export const CONTENT_RATING_DESCRIPTIONS: Readonly<
  Record<ContentRating, string>
> = {
  [ContentRating.GENERAL]:
    'May contain moderate violence, suggestive references or occasional strong language.',
  [ContentRating.MATURE]:
    'Contains intense violence, heavy or explicit themes, substance use, or strong profanity.',
  [ContentRating.ADULTS_ONLY]:
    'Contains explicit sexual content, graphic violence, or extreme elements. Intended for adults only.',
};

/**
 * A language a Story or Chapter may be written in.
 */
export interface StorytimeLanguage {
  /** BCP 47 language tag. */
  code: string;
  /** English name of the language. */
  name: string;
}

/**
 * Which parts of Storytime are currently switched on.
 */
export interface StorytimeFeatureState {
  isEnabled: boolean;
  publicReadEnabled: boolean;
  creationEnabled: boolean;
  youTubeEnabled: boolean;
  spotlightEnabled: boolean;
}

/**
 * Everything the client needs to render Storytime consistently with the server.
 */
export interface StorytimeConfiguration {
  features: StorytimeFeatureState;
  languages: StorytimeLanguage[];
  defaultLanguageCode: string;
  contentRatings: ContentRating[];
}

/**
 * The feature state assumed when the server cannot be reached.
 *
 * Everything off: a client that cannot confirm Storytime is available must not
 * advertise it, because showing routes that then fail is worse than showing
 * nothing.
 */
export const STORYTIME_DISABLED_STATE: StorytimeFeatureState = {
  isEnabled: false,
  publicReadEnabled: false,
  creationEnabled: false,
  youTubeEnabled: false,
  spotlightEnabled: false,
};

/**
 * How finished a creator considers a whole Story.
 */
export enum CompletionState {
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  HIATUS = 'HIATUS',
  CANCELLED = 'CANCELLED',
}

/**
 * Where a creator has got to with a Story.
 */
export enum StoryStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Who may reach a Story once it is published.
 */
export enum StorytimeVisibility {
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
  PRIVATE = 'PRIVATE',
}

/**
 * Whether an administrator has removed a Story.
 */
export enum StorytimeModerationStatus {
  ACTIVE = 'ACTIVE',
  REMOVED = 'REMOVED',
}

/**
 * A Story as readers see it.
 */
export interface Story {
  id: string;
  slug: string;
  title: string;
  ownerUserId: string;
  shortDescription: string | null;
  descriptionHtml: string | null;
  completionState: CompletionState;
  contentRating: ContentRating;
  languageCode: string;
  bannerImageUrl: string | null;
  bannerImageMobileUrl: string | null;
  bannerImageAlt: string | null;
  profileImageUrl: string | null;
  profileImageThumbnailUrl: string | null;
  profileImageAlt: string | null;
  publishedChapterCount: number;
  rating: number;
  publishedAt: string | null;
  lastContentUpdateAt: string | null;
}

/**
 * A Story as its owner manages it.
 */
export interface ManagedStory extends Story {
  status: StoryStatus;
  visibility: StorytimeVisibility;
  ownerOrderIndex: number;
  description: string | null;
  version: number;
  moderationStatus: StorytimeModerationStatus;
  moderationMessage: string | null;
  contentPolicyAcceptedAt: string | null;
}

/**
 * A page of publicly readable Stories.
 */
export interface PaginatedStories {
  items: Story[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Filters for the public Story listing.
 */
export interface StoryQuery {
  page?: number;
  pageSize?: number;
  contentRating?: ContentRating;
  languageCode?: string;
  completionState?: CompletionState;
  ownerUserId?: string;
}

/**
 * The fields a creator may send when creating or editing a Story.
 */
export interface StoryRequest {
  title?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  visibility?: StorytimeVisibility;
  completionState?: CompletionState;
  contentRating?: ContentRating;
  languageCode?: string;
  bannerImageId?: string;
  bannerImageAlt?: string;
  profileImageId?: string;
  profileImageAlt?: string;
  /** Sent on update so a stale edit is rejected rather than overwriting. */
  version?: number;
}
