import { PERMISSIONS, Permission } from 'src/app/models/access-control.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

/** One of Storytime's own management pages, and what opens it. */
export interface StorytimeAdminLink {
  /** The permission that lets somebody through to the page. */
  permission: Permission;
  /** What the card reads as. */
  label: string;
  /** What the page is for, in a line. */
  summary: string;
  /** The path segments beneath Storytime. */
  segments: string[];
  /**
   * Which card this is, for styling.
   *
   * A key rather than a class name because two pages show these cards and each
   * names its own — `storytime-landing__card--moderation` on the landing page,
   * `admin-landing__card--moderation` on the Admin page — while the card keeps
   * its colour in both.
   */
  cardKey: string;
}

/**
 * The pages that run Storytime, and what each one needs.
 *
 * Held here rather than written into a template so no page can offer a card the
 * route would then refuse: every page that shows these reads the same
 * permission the guard does. They are listed in the order they are needed —
 * moderation is the one with somebody waiting on it.
 *
 * Shared by the Storytime landing page and the site's Admin page. These jobs
 * are given out one at a time by permission, so both pages filter the list
 * against what the viewer actually holds rather than showing it whole.
 */
export const STORYTIME_ADMIN_LINKS: StorytimeAdminLink[] = [
  {
    permission: PERMISSIONS.STORYTIME_MODERATE,
    label: 'Moderation queue',
    summary: 'Work through reported content and the appeals against removals.',
    segments: ['manage', 'moderation'],
    cardKey: 'moderation',
  },
  {
    permission: PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE,
    label: 'Manage Spotlight',
    summary: 'Choose, schedule and withdraw what Storytime features.',
    segments: ['manage', 'spotlight'],
    cardKey: 'manage-spotlight',
  },
  {
    permission: PERMISSIONS.STORYTIME_TAG_MANAGE,
    label: 'Manage tags',
    summary: 'Keep the shared tag vocabulary creators choose from.',
    segments: ['manage', 'tags'],
    cardKey: 'tags',
  },
];

/**
 * Where a management card sends its reader.
 *
 * @param link - The management page.
 * @returns The router link for it.
 */
export function storytimeAdminRouterLink(link: StorytimeAdminLink): unknown[] {
  return ['/', APP_ROUTES.STORYTIME, ...link.segments];
}
