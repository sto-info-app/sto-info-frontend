import { Permission } from 'src/app/models/access-control.models';

/**
 * One block of a guide: a heading and the plain-English copy beneath it.
 *
 * A section is deliberately small — a heading, some paragraphs and an optional
 * list — because a help page that needs richer structure than that is usually a
 * page that needs splitting into two guides.
 */
export interface HelpGuideSection {
  /** The section heading, rendered as a second-level heading. */
  heading: string;
  /** Paragraphs shown in order beneath the heading. */
  paragraphs: string[];
  /** Bullet points shown after the paragraphs, when the copy needs a list. */
  points?: string[];
}

/**
 * A link out of a guide to the part of the site it describes.
 *
 * Held as a route constant rather than a URL so a route rename moves the link
 * with it.
 */
export interface HelpGuideLink {
  /** What the link reads as. */
  label: string;
  /** A value from `APP_ROUTES`, without its leading slash. */
  route: string;
}

/**
 * One help guide.
 *
 * Guides are content, not components: they are written here as data and
 * rendered by a single page, so adding one is a matter of writing it rather
 * than building another component and route.
 */
export interface HelpGuide {
  /** The guide's address within the help section, and its identifier. */
  slug: string;
  /** The guide's title, used as its heading and its page title. */
  title: string;
  /** One sentence describing the guide, shown on the help index. */
  summary: string;
  /** The guide itself, in the order it is read. */
  sections: HelpGuideSection[];
  /** Places to go and try what the guide describes. */
  relatedLinks?: HelpGuideLink[];
  /**
   * The permission a reader must hold to be offered this guide.
   *
   * Set on the guide rather than the topic because the jobs it covers are
   * handed out one at a time: somebody trusted with the Spotlight has not
   * necessarily been trusted with the moderation queue, and a guide describing
   * a page they would be turned away from is not help.
   *
   * Absent on every guide anybody may read, which is most of them.
   */
  requiresPermission?: Permission;
}

/**
 * A group of guides about one part of the site.
 *
 * Grouping exists so the help index stays navigable as more of the application
 * is documented: a reader looking for help with Storytime should not have to
 * read past guides about anything else.
 */
export interface HelpTopic {
  /** Identifies the topic. Not shown to readers. */
  id: string;
  /** The topic heading on the help index. */
  title: string;
  /** A sentence introducing what the topic covers. */
  intro: string;
  /**
   * Whether the topic is only offered while Storytime is switched on.
   *
   * Storytime can be turned off entirely, and its route guard sends visitors to
   * the not-found page rather than telling them the feature exists but is
   * unavailable. Help has to agree with that: guides describing a feature
   * nobody can reach would advertise exactly what the switch is there to hide.
   */
  requiresStorytime: boolean;
  /** The guides in this topic, in reading order. */
  guides: HelpGuide[];
}

/**
 * A guide together with the topic it belongs to.
 *
 * Returned by the lookup because the guide page needs both: the guide to show,
 * and the topic to decide whether the reader may see it and what else to offer
 * them next.
 */
export interface HelpGuideLocation {
  topic: HelpTopic;
  guide: HelpGuide;
}
