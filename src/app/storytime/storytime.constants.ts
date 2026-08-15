/**
 * User-facing Storytime copy.
 *
 * Held centrally rather than inline in templates so that a term is worded the
 * same everywhere it appears, and so a future localisation pass has one place
 * to work from. The application has no i18n today; this is the groundwork for
 * adding it without rewriting every template.
 *
 * British English throughout, matching the rest of the site.
 */
export const STORYTIME_COPY = {
  /** The feature's name. Never abbreviated or pluralised. */
  FEATURE_NAME: 'Storytime',
  LANDING_TITLE: 'STO Storytime',
  LANDING_INTRO:
    'A permanent home for Star Trek Online fan stories, written and shared by the community.',
  LANDING_EMPTY:
    'There are no published Stories yet. Check back soon, or write the first one.',
  FAN_CONTENT_NOTICE:
    'Stories are unofficial fan-created content. STO Info is not affiliated with or endorsed by CBS Studios, Paramount or Cryptic Studios. Star Trek and related marks belong to their respective owners.',
} as const;

/**
 * How each reader-facing Story status is labelled.
 *
 * The single authoritative mapping, so a status never reads one way in a
 * library filter and another on a Story page. Raw enum values are never shown
 * to readers.
 */
export const READER_STORY_STATUS_LABELS = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
  ABANDONED: 'Abandoned',
} as const;

/**
 * How each reader-facing Chapter status is labelled.
 */
export const READER_CHAPTER_STATUS_LABELS = {
  UNREAD: 'Unread',
  IN_PROGRESS: 'In progress',
  READ: 'Read',
} as const;

/**
 * How a creator's own publication states are labelled.
 */
export const PUBLICATION_STATUS_LABELS = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  UNPUBLISHED: 'Unpublished',
  ARCHIVED: 'Archived',
} as const;
