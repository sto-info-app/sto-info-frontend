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
