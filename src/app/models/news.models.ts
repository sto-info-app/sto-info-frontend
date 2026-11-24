export enum NewsCategory {
  RELEASE_NOTES = 'RELEASE_NOTES',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  GENERAL = 'GENERAL',
}

export enum NewsStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

/**
 * A cover's addresses, by the size it is drawn at: a news card, or the head
 * of the post's own page. Built by the API, never by the browser.
 */
export interface NewsCoverUrls {
  cover640x360: string;
  cover1920x1080: string;
}

export interface NewsPost {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  category: NewsCategory;
  status: NewsStatus;
  publishedAt: string | null;
  authorId: string | null;
  /** Delivery reference of its cover, or null (sc-1447). */
  coverImageId: string | null;
  /** What the cover shows, or null. */
  coverImageAlt: string | null;
  /** The cover's addresses, by size, or null when it has none. */
  coverImageUrls: NewsCoverUrls | null;
  createdAt: string;
  updatedAt: string;
}

/** Enough of a neighbouring post to link to it by name. */
export interface NewsNeighbour {
  slug: string;
  title: string;
}

/**
 * A published post as the public reads it, with the posts either side of it
 * in the site's news: previous is the older, next the newer.
 */
export interface PublishedNewsPost extends NewsPost {
  previous: NewsNeighbour | null;
  next: NewsNeighbour | null;
}

export interface PaginatedNews {
  items: NewsPost[];
  total: number;
  page: number;
  pageSize: number;
  /** Number of published posts per category, independent of the active filter. */
  categoryCounts?: Partial<Record<NewsCategory, number>>;
}

export interface NewsQuery {
  category?: NewsCategory;
  page?: number;
  pageSize?: number;
}

export interface CreateNewsPostRequest {
  title: string;
  slug?: string;
  summary?: string;
  body: string;
  category?: NewsCategory;
  status?: NewsStatus;
}

export type UpdateNewsPostRequest = Partial<CreateNewsPostRequest>;

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  [NewsCategory.RELEASE_NOTES]: 'Release notes',
  [NewsCategory.ANNOUNCEMENT]: 'Announcement',
  [NewsCategory.GENERAL]: 'General',
};

/** Font Awesome icon per category, shared by the public and admin news cards. */
export const NEWS_CATEGORY_ICONS: Record<NewsCategory, string> = {
  [NewsCategory.RELEASE_NOTES]: 'fa-code-branch',
  [NewsCategory.ANNOUNCEMENT]: 'fa-bullhorn',
  [NewsCategory.GENERAL]: 'fa-newspaper',
};
