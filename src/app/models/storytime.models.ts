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
  /** Native display name of the language. */
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
  /** Who published it, or null once they no longer have an account. */
  authorUsername: string | null;
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
  /** Which version of the publishing terms was accepted, if any. */
  contentPolicyVersion: string | null;
  /**
   * Whether the accepted terms are the current ones.
   *
   * Decided by the server rather than compared here: the client would have to
   * carry its own copy of the current version to do it, and a stale bundle
   * would then tell a creator they were ready to publish when they were not.
   */
  contentPolicyCurrent: boolean;
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
  sort?: StorySort;
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
  /**
   * Who published the Story, or null once they no longer have an account.
   *
   * Carried on the Chapter for the reason its rating is: a reader who follows
   * a link straight here never passes the Story page.
   */
  authorUsername: string | null;
  contentHtml: string | null;
  /** Resolved from the Chapter or its Story, ready for a lang attribute. */
  languageCode: string;
  /**
   * Inherited from the Story, so the reader can warn before the content.
   *
   * A Chapter reached from a link, a feed or a search result never passes the
   * Story page, which is where the warning would otherwise have been shown.
   */
  contentRating: ContentRating;
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
 * The kinds of Storytime content that can be reported or moderated.
 */
export enum StorytimeTargetType {
  STORY = 'STORY',
  CHAPTER = 'CHAPTER',
  CHARACTER = 'CHARACTER',
  ARC = 'ARC',
  MEDIA = 'MEDIA',
  CREW_CREDIT = 'CREW_CREDIT',
  COMMENT = 'COMMENT',
  SPOTLIGHT = 'SPOTLIGHT',
}

/**
 * Why somebody reported a piece of content.
 *
 * The content policy's own categories: a reporter picks from the same list an
 * administrator cites back to the creator.
 */
export enum StorytimeReportReason {
  HARASSMENT = 'HARASSMENT',
  HATE_CONTENT = 'HATE_CONTENT',
  EXPLICIT_CONTENT = 'EXPLICIT_CONTENT',
  GRAPHIC_VIOLENCE = 'GRAPHIC_VIOLENCE',
  PLAGIARISM = 'PLAGIARISM',
  IMPERSONATION = 'IMPERSONATION',
  PERSONAL_INFORMATION = 'PERSONAL_INFORMATION',
  COPYRIGHT = 'COPYRIGHT',
  SPAM = 'SPAM',
  MALICIOUS_LINK = 'MALICIOUS_LINK',
  DECEPTIVE_MEDIA = 'DECEPTIVE_MEDIA',
  OTHER = 'OTHER',
}

/**
 * Where a Storytime report sits in the moderation queue.
 */
export enum StorytimeReportStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTIONED = 'ACTIONED',
  DISMISSED = 'DISMISSED',
}

/**
 * What an administrator did to a piece of content.
 */
export enum StorytimeModerationAction {
  REMOVED = 'REMOVED',
  RESTORED = 'RESTORED',
  REPORT_RESOLVED = 'REPORT_RESOLVED',
  APPEAL_UPHELD = 'APPEAL_UPHELD',
  APPEAL_REJECTED = 'APPEAL_REJECTED',
}

/**
 * Where a creator's appeal against a removal has got to.
 */
export enum AppealStatus {
  SUBMITTED = 'SUBMITTED',
  UPHELD = 'UPHELD',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * What a reporter is told back.
 *
 * Deliberately thin: what was decided about somebody else's work is the
 * moderation queue's business, not the reporter's.
 */
export interface StorytimeReportReceipt {
  id: string;
  targetType: StorytimeTargetType;
  targetId: string;
  status: StorytimeReportStatus;
  createdAt: string;
}

/**
 * A report as the moderation queue shows it.
 */
export interface StorytimeReport extends StorytimeReportReceipt {
  reporterUserId: string;
  reasonCode: StorytimeReportReason;
  description: string | null;
  assignedToUserId: string | null;
  resolution: string | null;
  resolvedAt: string | null;
}

/**
 * One entry in a piece of content's moderation history.
 */
export interface ModerationActionEntry {
  id: string;
  targetType: StorytimeTargetType;
  targetId: string;
  action: StorytimeModerationAction;
  actorUserId: string;
  reasonCode: string | null;
  message: string | null;
  createdAt: string;
}

/**
 * A creator's appeal against a removal.
 */
export interface ModerationAppeal {
  id: string;
  targetType: StorytimeTargetType;
  targetId: string;
  appellantUserId: string;
  body: string;
  status: AppealStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/**
 * Reports a piece of content.
 */
export interface CreateReportRequest {
  targetType: StorytimeTargetType;
  targetId: string;
  reasonCode: StorytimeReportReason;
  description?: string;
}

/**
 * Removes or restores a piece of content.
 */
export interface ModerateContentRequest {
  targetType: StorytimeTargetType;
  targetId: string;
  reasonCode?: StorytimeReportReason | null;
  message: string;
}

/**
 * Appeals against a removal.
 */
export interface CreateAppealRequest {
  targetType: StorytimeTargetType;
  targetId: string;
  body: string;
}

/**
 * The shelf a tag belongs on.
 */
export enum StorytimeTagCategory {
  FACTION = 'FACTION',
  ERA = 'ERA',
  GENRE = 'GENRE',
  TONE = 'TONE',
  THEME = 'THEME',
  SPECIES = 'SPECIES',
  CONTENT_WARNING = 'CONTENT_WARNING',
  FORMAT = 'FORMAT',
  CONTINUITY = 'CONTINUITY',
}

/**
 * One tag in the Storytime vocabulary.
 *
 * Administrator-managed: creators pick from the list rather than inventing
 * terms, which is what makes a tag filter worth offering.
 */
export interface StorytimeTag {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: StorytimeTagCategory;
  displayOrder: number;
}

/**
 * The fields an administrator may send when adding or changing a tag.
 */
export interface TagRequest {
  name?: string;
  category?: StorytimeTagCategory;
  slug?: string;
  description?: string | null;
  displayOrder?: number;
}

/**
 * How a listing of Stories is ordered.
 *
 * Two different questions: a reader looking for something new wants what was
 * published last, and a reader following work in progress wants what was
 * written in last.
 */
export enum StorySort {
  RECENTLY_PUBLISHED = 'RECENTLY_PUBLISHED',
  RECENTLY_UPDATED = 'RECENTLY_UPDATED',
}

/**
 * One thing search found, whatever kind of thing it is.
 */
export interface SearchHit {
  targetType: StorytimeTargetType;
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  /** The Story it belongs to, for a Chapter or a Character. */
  storySlug: string | null;
}

/**
 * A page of search results.
 */
export interface SearchResults {
  items: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  /** How many of each kind matched, so the filters can show counts. */
  countsByType: Record<string, number>;
}

/**
 * Everything one member has published.
 */
export interface CreatorWork {
  stories: Story[];
  arcs: Arc[];
}

/**
 * What a Spotlight entry features.
 */
export enum SpotlightEntityType {
  STORY = 'STORY',
  ARC = 'ARC',
}

/**
 * An editorial selection highlighting a Story or an Arc.
 *
 * The featured work travels with the entry and may be either a Story or an
 * Arc, never both. It is resolved by the server at read time, so an entry only
 * ever arrives with work that is still there to read.
 */
export interface Spotlight {
  id: string;
  slug: string;
  entityType: SpotlightEntityType;
  headline: string;
  summary: string;
  selectionReason: string | null;
  overrideImageUrl: string | null;
  overrideImageMobileUrl: string | null;
  overrideImageAlt: string | null;
  startsAt: string;
  endsAt: string | null;
  story: Story | null;
  arc: Arc | null;
}

/**
 * A Spotlight entry as an editor manages it.
 */
export interface ManagedSpotlight extends Spotlight {
  storyId: string | null;
  arcId: string | null;
  overrideImageId: string | null;
  displayPriority: number;
  isPublished: boolean;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The fields an editor may send when creating a Spotlight entry.
 */
export interface CreateSpotlightRequest {
  entityType: SpotlightEntityType;
  storyId?: string;
  arcId?: string;
  headline: string;
  summary: string;
  slug?: string;
  /** Null and absent both mean "there is none": the server accepts either. */
  selectionReason?: string | null;
  overrideImageId?: string | null;
  overrideImageAlt?: string | null;
  displayPriority?: number;
  startsAt: string;
  endsAt?: string | null;
}

/**
 * The fields an editor may change on a Spotlight entry.
 *
 * The entity type is absent deliberately: repointing a live entry from a Story
 * to an Arc would change what readers are looking at without saying so.
 */
export type UpdateSpotlightRequest = Partial<
  Omit<CreateSpotlightRequest, 'entityType'>
> & { isPublished?: boolean };

/**
 * Somebody helping curate an Arc.
 *
 * There is no `canPublish`. Only the curator may publish an Arc, so there is
 * nothing to show and nothing to offer.
 */
export interface ArcCollaborator {
  id: string;
  arcId: string;
  userId: string;
  collaborationRole: string | null;
  canEditArc: boolean;
  canManageStories: boolean;
  canManageCollaborators: boolean;
  invitationStatus: CollaborationInvitationStatus;
  invitedByUserId: string;
  invitedAt: string;
  acceptedAt: string | null;
}

/**
 * The capabilities an Arc invitation may grant.
 */
export interface ArcCollaboratorCapabilities {
  canEditArc?: boolean;
  canManageStories?: boolean;
  canManageCollaborators?: boolean;
}

/**
 * An invitation to help curate an Arc.
 */
export interface InviteArcCollaboratorRequest extends ArcCollaboratorCapabilities {
  userId: string;
  collaborationRole?: string;
}

/**
 * How far a reader has got through an Arc.
 *
 * Derived from the reader's progress through the Stories in it, so it is only
 * ever as current as the Arc itself — reordering or adding a Story changes it.
 */
export interface ArcProgress {
  arcId: string;
  totalStories: number;
  completedStories: number;
  percentComplete: number;
  continueStoryId: string | null;
  continueChapterId: string | null;
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

/**
 * What a reader may leave on Storytime content.
 *
 * A reader holds at most one reaction per thing. The number shown is the
 * thumbs up minus the thumbs down.
 */
export enum StorytimeReaction {
  THUMBS_UP = 'THUMBS_UP',
  THUMBS_DOWN = 'THUMBS_DOWN',
}

/**
 * How a thing stands, and what this reader chose.
 *
 * `mine` is always null for a signed-out reader: the server takes the reader
 * from the token, and there is nothing to remember without one.
 */
export interface ReactionSummary {
  targetId: string;
  upVotes: number;
  downVotes: number;
  /** Up minus down, which is the number shown. */
  rating: number;
  mine: StorytimeReaction | null;
}

/**
 * Whether a comment is shown, and who stopped it being shown.
 *
 * Who silenced a comment matters: an author who thought better of it, an owner
 * tidying their own Story, and an administrator enforcing the content policy
 * are three different events, and only the last is a moderation record.
 */
export enum StorytimeCommentStatus {
  VISIBLE = 'VISIBLE',
  DELETED_BY_AUTHOR = 'DELETED_BY_AUTHOR',
  HIDDEN_BY_OWNER = 'HIDDEN_BY_OWNER',
  REMOVED_BY_ADMIN = 'REMOVED_BY_ADMIN',
}

/**
 * A comment as a reader sees it.
 *
 * A silenced comment keeps its place in the thread but not its words: `body`
 * is null unless the comment is visible or the reader wrote it.
 */
export interface StorytimeComment {
  id: string;
  authorUserId: string;
  parentCommentId: string | null;
  body: string | null;
  status: StorytimeCommentStatus;
  editedAt: string | null;
  createdAt: string;
}

/**
 * What a reader sends to post a comment or a reply.
 */
export interface CommentRequest {
  targetType: StorytimeTargetType;
  targetId: string;
  body: string;
  /** The comment being replied to. Replies go one level deep. */
  parentCommentId?: string;
}

/**
 * What somebody may follow.
 */
export enum FollowTargetKind {
  CREATOR = 'CREATOR',
  STORY = 'STORY',
  ARC = 'ARC',
}

/**
 * Whether the reader follows a thing, and how many others do.
 */
export interface FollowState {
  isFollowing: boolean;
  followerCount: number;
}

/**
 * The things that can appear in a reader's feed.
 */
export enum StorytimeActivityType {
  STORY_PUBLISHED = 'STORY_PUBLISHED',
  CHAPTER_PUBLISHED = 'CHAPTER_PUBLISHED',
  STORY_UPDATED = 'STORY_UPDATED',
  STORY_STATUS_CHANGED = 'STORY_STATUS_CHANGED',
  ARC_UPDATED = 'ARC_UPDATED',
  ARC_STORY_ADDED = 'ARC_STORY_ADDED',
  ARC_STORY_REMOVED = 'ARC_STORY_REMOVED',
  SPOTLIGHT_SELECTED = 'SPOTLIGHT_SELECTED',
}

/**
 * One thing that happened, as a feed shows it.
 *
 * Carries addresses rather than identifiers, because a feed entry is only
 * useful as a link. Nothing here is stored: the server resolves it from the
 * content when the feed is read, which is what lets a Story taken down since
 * disappear rather than linger.
 */
export interface FeedEntry {
  id: string;
  activityType: StorytimeActivityType;
  actorUserId: string;
  storyTitle: string | null;
  storySlug: string | null;
  chapterTitle: string | null;
  chapterSlug: string | null;
  arcTitle: string | null;
  arcSlug: string | null;
  occurredAt: string;
}

/**
 * A reading list, without what is on it.
 */
export interface ReadingList {
  id: string;
  ownerUserId: string;
  name: string;
  /** Its address, unique within its owner rather than site-wide. */
  slug: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  updatedAt: string;
}

/**
 * One thing on a reading list.
 *
 * Flattened to the title and address of whatever it points at, so that nothing
 * here has to learn the difference between a Story and an Arc.
 */
export interface ReadingListItem {
  id: string;
  targetType: StorytimeTargetType;
  targetId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  note: string | null;
  orderIndex: number;
}

/**
 * A reading list and what is on it.
 */
export interface ReadingListDetail extends ReadingList {
  items: ReadingListItem[];
}

/**
 * What a reader sends to make or change a reading list.
 */
export interface ReadingListRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}
