import {
  NEWS_CATEGORY_ICONS,
  NEWS_CATEGORY_LABELS,
  NewsCategory,
  NewsStatus,
} from './news.models';

describe('news.models', () => {
  it('should expose expected news category enum values', () => {
    expect(NewsCategory.RELEASE_NOTES).toBe('RELEASE_NOTES');
    expect(NewsCategory.ANNOUNCEMENT).toBe('ANNOUNCEMENT');
    expect(NewsCategory.GENERAL).toBe('GENERAL');
  });

  it('should expose expected news status enum values', () => {
    expect(NewsStatus.DRAFT).toBe('DRAFT');
    expect(NewsStatus.PUBLISHED).toBe('PUBLISHED');
  });

  it('should map category labels and icons for all categories', () => {
    expect(NEWS_CATEGORY_LABELS).toEqual({
      [NewsCategory.RELEASE_NOTES]: 'Release notes',
      [NewsCategory.ANNOUNCEMENT]: 'Announcement',
      [NewsCategory.GENERAL]: 'General',
    });

    expect(NEWS_CATEGORY_ICONS).toEqual({
      [NewsCategory.RELEASE_NOTES]: 'fa-code-branch',
      [NewsCategory.ANNOUNCEMENT]: 'fa-bullhorn',
      [NewsCategory.GENERAL]: 'fa-newspaper',
    });
  });
});
