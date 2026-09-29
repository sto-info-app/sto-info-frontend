/** Who a Community's, a Fleet's or an Armada's post is published to (FC-027). */
export type FleetNewsAudience = 'PUBLIC' | 'COMMUNITY' | 'FLEET_MEMBERS';

/** Whether a post is published yet. */
export type FleetNewsStatus = 'DRAFT' | 'PUBLISHED';

/** Who wrote a post. */
export interface FleetNewsAuthor {
  /** Their STO Info username. */
  readonly username: string;
  /** Whether their registry profile is one the reader may open. */
  readonly linksToProfile: boolean;
}

/** A post as a listing shows it, without its body. */
export interface FleetNewsPostSummary {
  readonly id: string;
  /** Its address within its scope, which never changes. */
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly status: FleetNewsStatus;
  readonly audience: FleetNewsAudience;
  /** When it was published, or null for a draft. */
  readonly publishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Delivery reference of its cover, or null. */
  readonly coverImageId: string | null;
  readonly coverImageAlt: string | null;
  /** Its cover's signed address, or null (FC-040). */
  readonly coverImageUrl: string | null;
  /** Its author, or null when nobody can be named. */
  readonly author: FleetNewsAuthor | null;
}

/** A post in full. */
export interface FleetNewsPost extends FleetNewsPostSummary {
  /** The post, in Markdown. */
  readonly body: string;
}

/** One post, and what its reader may do. */
export interface FleetNewsPostView {
  readonly post: FleetNewsPost;
  /** Whether the reader holds news.write at the scope. */
  readonly mayWrite: boolean;
  /** Whether the scope is open, so its news may change. */
  readonly isOpen: boolean;
}

/** A page of a scope's posts. */
export interface FleetNewsPage {
  readonly items: readonly FleetNewsPostSummary[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  /** Whether the reader holds news.write at the scope. */
  readonly mayWrite: boolean;
  /** Whether the scope is open, so its news may change. */
  readonly isOpen: boolean;
}

/** Which of a scope's posts to list. */
export interface FleetNewsQuery {
  readonly page?: number;
  readonly pageSize?: number;
  /** Words to find in the title or the summary. */
  readonly q?: string;
  /** Published, the default, or drafts for news writers. */
  readonly status?: FleetNewsStatus;
}

/** A post being written or changed. */
export interface FleetNewsDraft {
  readonly title: string;
  /** Empty or null clears it. */
  readonly summary: string | null;
  readonly body: string;
  readonly audience: FleetNewsAudience;
}
