export enum NewsCategory {
  RELEASE_NOTES = 'RELEASE_NOTES',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  GENERAL = 'GENERAL',
}

export enum NewsStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
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
  createdAt: string;
  updatedAt: string;
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
