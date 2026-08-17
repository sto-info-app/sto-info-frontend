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
 * What the Storytime content policy covers.
 *
 * The categories are the ones the feature actually enforces: a reporter picks
 * from this list and an administrator cites it when removing something, so the
 * three surfaces cannot describe the rules differently.
 *
 * The wording is placeholder pending the final copy. The `code` values are
 * not — they match the reasons the server accepts, and changing one changes
 * what the API is told.
 */
export const CONTENT_POLICY_RULES = [
  {
    code: 'HARASSMENT',
    title: 'Harassment',
    summary:
      'Nothing that targets, threatens or persistently pursues a real person.',
  },
  {
    code: 'HATE_CONTENT',
    title: 'Hate content',
    summary:
      'Nothing that demeans people for who they are. Star Trek is the wrong place for it.',
  },
  {
    code: 'EXPLICIT_CONTENT',
    title: 'Explicit sexual content',
    summary:
      'Sexual content must stay within what your Story’s rating declares, and never involve minors.',
  },
  {
    code: 'GRAPHIC_VIOLENCE',
    title: 'Graphic violence',
    summary:
      'Violence must stay within what your Story’s rating declares. Rate honestly and readers can choose.',
  },
  {
    code: 'PLAGIARISM',
    title: 'Plagiarism',
    summary: 'Post your own writing. Credit anything you have borrowed.',
  },
  {
    code: 'IMPERSONATION',
    title: 'Impersonation',
    summary: 'Do not write as another member, a developer, or the site itself.',
  },
  {
    code: 'PERSONAL_INFORMATION',
    title: 'Personal information',
    summary:
      'Nobody’s real-world details without their agreement — including your own, for your sake.',
  },
  {
    code: 'COPYRIGHT',
    title: 'Copyright',
    summary:
      'Fan work is welcome. Wholesale copying of somebody’s published work is not.',
  },
  {
    code: 'SPAM',
    title: 'Spam',
    summary: 'No advertising, scams or repetition dressed up as a Story.',
  },
  {
    code: 'MALICIOUS_LINK',
    title: 'Malicious links',
    summary: 'No links that lead somewhere harmful.',
  },
  {
    code: 'DECEPTIVE_MEDIA',
    title: 'Deceptive media',
    summary: 'Do not present media as something it is not.',
  },
] as const;

/**
 * How each report reason reads in the moderation queue.
 *
 * Built from the policy so the queue can never describe a category one way
 * while the policy page describes it another.
 */
export const REPORT_REASON_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    CONTENT_POLICY_RULES.map(rule => [rule.code, rule.title]),
  ),
  OTHER: 'Something else',
};

/**
 * The reasons somebody may pick when reporting content.
 *
 * The policy categories plus "something else", which exists because a list
 * that covers everything is a list nobody reads to the end of.
 */
export const REPORT_REASONS = [
  ...CONTENT_POLICY_RULES.map(rule => ({
    code: rule.code,
    label: rule.title,
  })),
  { code: 'OTHER', label: 'Something else' },
];

/**
 * The kinds of content a reader may search, and how each is named.
 *
 * The empty code means "everything", which is the default and the first tab: a
 * reader searching for a name rarely knows whether it belongs to a Story, a
 * Chapter or a Character.
 */
export const SEARCHABLE_KINDS = [
  { code: '', label: 'Everything' },
  { code: 'STORY', label: 'Stories' },
  { code: 'CHAPTER', label: 'Chapters' },
  { code: 'CHARACTER', label: 'Characters' },
  { code: 'ARC', label: 'Arcs' },
] as const;

/**
 * How long to wait after a reader stops scrolling before recording where they
 * are.
 *
 * A scroll fires continuously, so without a pause a reader moving down a long
 * Chapter would send a request per frame. Long enough to collapse a scroll
 * into one write, short enough that closing the tab shortly after reading does
 * not lose the position.
 */
export const PROGRESS_WRITE_DEBOUNCE_MS = 5000;

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
 * How each collaboration invitation status is labelled.
 */
export const COLLABORATION_STATUS_LABELS = {
  INVITED: 'Invited',
  ACCEPTED: 'Collaborating',
  DECLINED: 'Declined',
  REVOKED: 'No longer collaborating',
} as const;

/**
 * The capabilities an invitation may grant, and how each is described.
 *
 * Publishing is deliberately absent: only the owner may publish, so offering a
 * switch that could never be turned on would be worse than saying nothing.
 */
export const COLLABORATOR_CAPABILITIES = [
  { key: 'canEditStory', label: 'Edit the Story’s details' },
  { key: 'canManageChapters', label: 'Write and edit Chapters' },
  { key: 'canManageCharacters', label: 'Manage the cast' },
  { key: 'canManageCrew', label: 'Manage the credits' },
  { key: 'canManageCollaborators', label: 'Invite other collaborators' },
] as const;

/**
 * The capabilities an Arc invitation may grant, and how each is described.
 *
 * Publishing is absent for the same reason it is absent from a Story
 * invitation: deciding an Arc is ready to show the world stays with the
 * curator, so there is no switch to offer.
 */
export const ARC_COLLABORATOR_CAPABILITIES = [
  { key: 'canEditArc', label: 'Edit the Arc’s details' },
  { key: 'canManageStories', label: 'Choose which Stories are in it' },
  { key: 'canManageCollaborators', label: 'Invite other collaborators' },
] as const;

/**
 * How each Arc membership status is labelled.
 *
 * `INVITED` and `REQUESTED` are worded from the curator's side, because that
 * is where the list they appear in lives.
 */
export const ARC_MEMBERSHIP_STATUS_LABELS = {
  REQUESTED: 'Asked to join',
  INVITED: 'Invited',
  APPROVED: 'In the Arc',
  DECLINED: 'Declined',
  REMOVED: 'Removed',
  WITHDRAWN: 'Withdrawn',
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

/**
 * How each completion state is described to readers.
 */
export const COMPLETION_STATE_LABELS = {
  ONGOING: 'Ongoing',
  COMPLETED: 'Complete',
  HIATUS: 'On hiatus',
  CANCELLED: 'Cancelled',
} as const;

/**
 * How each visibility option is described to creators.
 */
export const VISIBILITY_LABELS = {
  PUBLIC: 'Public',
  UNLISTED: 'Unlisted',
  PRIVATE: 'Private',
} as const;

/**
 * What each visibility option actually means, shown alongside the choice so a
 * creator is not left guessing how far their Story travels.
 */
export const VISIBILITY_DESCRIPTIONS = {
  PUBLIC: 'Listed in the archive and readable by anyone.',
  UNLISTED: 'Readable by anyone with the link, but not listed in the archive.',
  PRIVATE: 'Readable only by you.',
} as const;
