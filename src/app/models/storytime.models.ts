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

/**
 * Where a creator has got to with a Chapter.
 */
export enum ChapterStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * A Chapter summarised for a list.
 */
export interface ChapterSummary {
  id: string;
  slug: string;
  title: string;
  synopsis: string | null;
  orderIndex: number;
  wordCount: number;
  estimatedReadingMinutes: number | null;
  coverImageThumbnailUrl: string | null;
  coverImageAlt: string | null;
  publishedAt: string | null;
}

/**
 * A Chapter as a reader sees it, with its body.
 */
export interface Chapter extends ChapterSummary {
  storyId: string;
  contentHtml: string | null;
  /** Resolved from the Chapter or its Story, ready for a lang attribute. */
  languageCode: string;
  coverImageUrl: string | null;
  rating: number;
}

/**
 * A Chapter as its creator manages it.
 */
export interface ManagedChapter extends Chapter {
  status: ChapterStatus;
  contentSource: string;
  /**
   * The language the creator set on this Chapter, or null when it follows the
   * Story. Distinct from languageCode, which is the resolved value a reader
   * sees — binding an editor to that would silently pin an inherited language.
   */
  ownLanguageCode: string | null;
  scheduledPublishAt: string | null;
  version: number;
  moderationStatus: StorytimeModerationStatus;
  moderationMessage: string | null;
}

/**
 * A neighbouring Chapter, for previous/next navigation.
 */
export interface ChapterLink {
  slug: string;
  title: string;
}

/**
 * A Chapter with the links either side of it.
 */
export interface ChapterWithNavigation {
  chapter: Chapter;
  previous: ChapterLink | null;
  next: ChapterLink | null;
}

/**
 * Publication lifecycle of an Arc.
 */
export enum ArcStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Where a Story sits in an Arc's inclusion workflow.
 *
 * Only `APPROVED` counts. Which of `INVITED` and `REQUESTED` a row holds says
 * who still has to agree: an invitation waits on the Story's owner, a request
 * waits on the Arc's curator.
 */
export enum ArcMembershipStatus {
  REQUESTED = 'REQUESTED',
  INVITED = 'INVITED',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  REMOVED = 'REMOVED',
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * An Arc as readers see it.
 */
export interface Arc {
  id: string;
  slug: string;
  title: string;
  ownerUserId: string;
  shortDescription: string | null;
  descriptionHtml: string | null;
  languageCode: string;
  bannerImageUrl: string | null;
  bannerImageAlt: string | null;
  profileImageUrl: string | null;
  profileImageAlt: string | null;
  rating: number;
  publishedAt: string | null;
}

/**
 * An Arc as its curator manages it.
 */
export interface ManagedArc extends Arc {
  status: ArcStatus;
  visibility: StorytimeVisibility;
  description: string | null;
  bannerImageId: string | null;
  profileImageId: string | null;
  version: number;
}

/**
 * A Story's place in an Arc.
 *
 * The Story may be absent: a membership can name one that is not published
 * yet, or one since made private, and dropping the row would leave a curator
 * unable to see or undo what they agreed to.
 */
export interface ArcMembership {
  id: string;
  arcId: string;
  storyId: string;
  orderIndex: number;
  membershipStatus: ArcMembershipStatus;
  introductoryNote: string | null;
  story: Story | null;
}

/**
 * An Arc and the Stories a reader can follow through it.
 */
export interface ArcWithStories {
  arc: Arc;
  stories: ArcMembership[];
}

/**
 * The fields a curator may send when creating or editing an Arc.
 */
export interface ArcRequest {
  title?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  visibility?: StorytimeVisibility;
  languageCode?: string;
  bannerImageId?: string;
  bannerImageAlt?: string;
  profileImageId?: string;
  profileImageAlt?: string;
  /** Sent on update so a stale edit is refused rather than overwriting. */
  version?: number;
}

/**
 * Where an embedded video lives.
 */
export enum MediaProvider {
  YOUTUBE = 'YOUTUBE',
}

/**
 * A video embedded in a Chapter.
 *
 * The embed URL and thumbnail are built by the server from stored identifiers,
 * so nothing a creator typed is ever loaded as a URL. The reader page shows
 * the still and only loads the embed when somebody asks for it.
 */
export interface ChapterMedia {
  id: string;
  chapterId: string;
  provider: MediaProvider;
  externalId: string;
  embedUrl: string;
  thumbnailUrl: string;
  title: string | null;
  caption: string | null;
  startSeconds: number | null;
  endSeconds: number | null;
  isPrimary: boolean;
  orderIndex: number;
}

/**
 * The fields a creator may send when adding a video.
 */
export interface AddChapterMediaRequest {
  url: string;
  startSeconds?: number;
  endSeconds?: number;
  title?: string;
  caption?: string;
  isPrimary?: boolean;
}

/**
 * Where a collaboration invitation has got to.
 *
 * Only `ACCEPTED` grants anything: an invitation nobody has answered lets its
 * holder do nothing at all.
 */
export enum CollaborationInvitationStatus {
  INVITED = 'INVITED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  REVOKED = 'REVOKED',
}

/**
 * Somebody helping write a Story.
 *
 * There is no `canPublish`. Only the owner may publish, so there is nothing to
 * show and nothing to offer.
 */
export interface Collaborator {
  id: string;
  storyId: string;
  userId: string;
  collaborationRole: string | null;
  canEditStory: boolean;
  canManageChapters: boolean;
  canManageCharacters: boolean;
  canManageCrew: boolean;
  canManageCollaborators: boolean;
  invitationStatus: CollaborationInvitationStatus;
  invitedByUserId: string;
  invitedAt: string;
  acceptedAt: string | null;
}

/**
 * The capabilities an invitation may grant.
 *
 * Named centrally so the editor, the list and the request all agree on what
 * there is to grant.
 */
export interface CollaboratorCapabilities {
  canEditStory?: boolean;
  canManageChapters?: boolean;
  canManageCharacters?: boolean;
  canManageCrew?: boolean;
  canManageCollaborators?: boolean;
}

/**
 * An invitation to collaborate on a Story.
 */
export interface InviteCollaboratorRequest extends CollaboratorCapabilities {
  userId: string;
  collaborationRole?: string;
}

/**
 * A role somebody may be credited in.
 */
export interface CrewRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
}

/**
 * What a credit attaches to.
 */
export enum CrewCreditScope {
  STORY = 'STORY',
  CHAPTER = 'CHAPTER',
  CHARACTER = 'CHARACTER',
}

/**
 * A credit as it appears in a credits roll.
 */
export interface CrewCredit {
  id: string;
  storyId: string;
  chapterId: string | null;
  characterId: string | null;
  userId: string;
  scope: CrewCreditScope;
  role: CrewRole | null;
  /** How the credit reads — its own wording, or the role name. */
  displayLabel: string;
  notes: string | null;
  orderIndex: number;
}

/**
 * The fields a creator may send when adding a credit.
 */
export interface CrewCreditRequest {
  userId: string;
  roleId: string;
  chapterId?: string;
  characterId?: string;
  creditLabel?: string;
  notes?: string;
}

/**
 * A Character as readers see them.
 */
export interface Character {
  id: string;
  storyId: string;
  slug: string;
  name: string;
  shortBio: string | null;
  biographyHtml: string | null;
  portraitImageUrl: string | null;
  portraitImageThumbnailUrl: string | null;
  portraitImageAlt: string | null;
  species: string | null;
  faction: string | null;
  rank: string | null;
  occupation: string | null;
  affiliation: string | null;
  shipAssignment: string | null;
  traits: string[] | null;
  isPrimary: boolean;
  displayOrder: number;
}

/**
 * A Character as their creator manages them.
 */
export interface ManagedCharacter extends Character {
  biographySource: string;
  portraitImageId: string | null;
  version: number;
  moderationStatus: StorytimeModerationStatus;
  moderationMessage: string | null;
}

/**
 * The fields a creator may send when creating or editing a Character.
 */
export interface CharacterRequest {
  name?: string;
  slug?: string;
  shortBio?: string;
  biographySource?: string;
  portraitImageId?: string;
  portraitImageAlt?: string;
  species?: string;
  faction?: string;
  rank?: string;
  occupation?: string;
  affiliation?: string;
  shipAssignment?: string;
  traits?: string[];
  isPrimary?: boolean;
  /** Sent on update so a stale edit is refused rather than overwriting. */
  version?: number;
}

/**
 * A Chapter a Character appears in, as a reader can reach it.
 */
export interface CharacterAppearanceLink {
  chapterId: string;
  chapterSlug: string;
  chapterTitle: string;
  isPrimary: boolean;
}

/**
 * A Character and the Chapters a reader can find them in.
 *
 * Only readable Chapters are listed, so a Character whose appearances are all
 * in unpublished Chapters shows an empty list rather than titles nobody can
 * open yet.
 */
export interface CharacterWithAppearances {
  character: Character;
  appearsIn: CharacterAppearanceLink[];
}

/**
 * One Character appearing in a Chapter, as their creator records it.
 */
export interface ChapterAppearance {
  chapterId: string;
  appearanceOrder: number;
  isPrimary: boolean;
  appearanceNotes: string | null;
  /** Null when the row refers to a Character that has since been deleted. */
  character: Character | null;
}

/**
 * The cast a creator is assigning to a Chapter.
 *
 * The whole list is sent rather than individual additions and removals: the
 * editor shows the cast as a set of ticks, so what saving means is "these, and
 * only these". An empty list is a valid answer, and clears it.
 */
export interface AppearanceRequest {
  characterId: string;
  appearanceNotes?: string;
  isPrimary?: boolean;
}

/**
 * Where a reader has got to with a Story.
 *
 * On hold and abandoned are deliberate choices. The server derives the others
 * from what has been read, and never overwrites a deliberate one.
 */
export enum ReaderStoryStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  ABANDONED = 'ABANDONED',
}

/**
 * The statuses a reader may choose for themselves.
 *
 * Deliberately excludes the derived ones: a reader marks a Story finished
 * through the complete action, and starts it by reading it.
 */
export const DELIBERATE_READER_STATUSES: readonly ReaderStoryStatus[] = [
  ReaderStoryStatus.ON_HOLD,
  ReaderStoryStatus.ABANDONED,
];

/**
 * A reader's progress through one Story.
 */
export interface StoryProgress {
  storyId: string;
  status: ReaderStoryStatus;
  totalChapters: number;
  readChapters: number;
  percentComplete: number;
  /** Chapters published since the reader was last up to date. */
  newChapterCount: number;
  /** The first Chapter they have not finished, or null when there is none. */
  continueChapterId: string | null;
  lastReadChapterId: string | null;
  lastReadAt: string | null;
  completedAt: string | null;
}

/**
 * One Story in a reader's library, with the progress that put it there.
 *
 * The Story may be absent: one made private, removed or deleted since the
 * reader started it still belongs in their library as something they read,
 * rather than vanishing from their own history.
 */
export interface LibraryEntry {
  progress: StoryProgress;
  story: Story | null;
}

/**
 * Where a reader has got to with a Chapter.
 */
export enum ReaderChapterStatus {
  UNREAD = 'UNREAD',
  IN_PROGRESS = 'IN_PROGRESS',
  READ = 'READ',
}

/**
 * A reader's progress through one Chapter.
 *
 * A reader who has never opened the Chapter gets one of these too, with
 * nothing recorded: having no progress is an ordinary state rather than a
 * missing resource.
 */
export interface ChapterProgress {
  chapterId: string;
  status: ReaderChapterStatus;
  progressPercent: number | null;
  /** The block anchor to resume at, such as `b12`. */
  blockId: string | null;
  lastReadAt: string | null;
}

/**
 * A reported reading position.
 *
 * Both fields are optional so a reader page that tracks only the anchor, or
 * only the percentage, may send just that.
 */
export interface ChapterProgressUpdate {
  progressPercent?: number;
  /** A block anchor as stamped on the rendered content, such as `b12`. */
  blockId?: string;
}

/**
 * The fields a creator may send when creating or editing a Chapter.
 */
export interface ChapterRequest {
  title?: string;
  slug?: string;
  synopsis?: string;
  contentSource?: string;
  languageCode?: string;
  coverImageId?: string;
  coverImageAlt?: string;
  /** Sent on update so a stale edit is refused rather than overwriting. */
  version?: number;
}
