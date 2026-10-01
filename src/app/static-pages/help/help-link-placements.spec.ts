import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

import { findHelpGuide } from './help.data';

/** The app's source folder, which every template path below is relative to. */
const APP = join(__dirname, '..', '..');

/** One help link a template draws: the guide it leads to and what it says. */
interface PlacedLink {
  slug: string;
  label: string;
}

/**
 * Where FC-050 puts a Help link, one per page: each template, and the guide
 * and label its link carries.
 *
 * Pages built on `<app-fleet-page-shell>` set `helpSlug` and `helpLabel` on
 * it; the rest draw `<app-help-link>` themselves. The Community, Fleet and
 * Armada overviews all render through `fleet-scope-view`, so its one link
 * serves all three. Investigate and Former names are shared with Fleet
 * leaders, so they lead to the Fleets guides rather than the admin ones.
 */
const PLACEMENTS: readonly [string, string, string][] = [
  // Communities, Fleets and Armadas; finding a Fleet.
  [
    'fleet/scope/fleet-scope-view/fleet-scope-view.component.html',
    'communities-fleets-and-armadas',
    'Help with Communities, Fleets and Armadas',
  ],
  [
    'fleet/directory/fleets-directory/fleets-directory.component.html',
    'finding-a-fleet',
    'Help with finding a Fleet',
  ],
  [
    'fleet/directory/communities-directory/communities-directory.component.html',
    'finding-a-fleet',
    'Help with finding a Fleet',
  ],
  [
    'fleet/directory/armadas-directory/armadas-directory.component.html',
    'finding-a-fleet',
    'Help with finding a Fleet',
  ],

  // Registering, and changing a record afterwards.
  [
    'fleet/register/community-register/community-register.component.html',
    'registering-a-fleet',
    'Help with registering',
  ],
  [
    'fleet/register/fleet-register/fleet-register.component.html',
    'registering-a-fleet',
    'Help with registering',
  ],
  [
    'fleet/register/armada-register/armada-register.component.html',
    'registering-a-fleet',
    'Help with registering',
  ],
  [
    'fleet/register/standalone-register/standalone-register.component.html',
    'registering-a-fleet',
    'Help with confirming a Fleet',
  ],
  [
    'fleet/governance/scope-settings/scope-settings.component.html',
    'registering-a-fleet',
    'Help with changing settings',
  ],

  // Roles, ownership and closing.
  [
    'fleet/governance/governance-hub/governance-hub.component.html',
    'roles-ownership-and-closing',
    'Help with roles and ownership',
  ],
  [
    'fleet/governance/governance-roles/governance-roles.component.html',
    'roles-ownership-and-closing',
    'Help with roles',
  ],
  [
    'fleet/governance/governance-delegation/governance-delegation.component.html',
    'roles-ownership-and-closing',
    'Help with delegation',
  ],
  [
    'fleet/governance/governance-history/governance-history.component.html',
    'roles-ownership-and-closing',
    'Help with roles and ownership',
  ],
  [
    'fleet/governance/community-ownership/community-ownership.component.html',
    'roles-ownership-and-closing',
    'Help with handing over a Community',
  ],

  // Membership.
  [
    'dashboard/fleets/dashboard-fleets.component.html',
    'your-characters-and-fleets',
    'Help with your Fleets',
  ],
  [
    'fleet/character/character-fleet-panel/character-fleet-panel.component.html',
    'your-characters-and-fleets',
    'Help with your Character’s Fleet',
  ],
  [
    'fleet/recruitment/my-fleet-applications/my-fleet-applications.component.html',
    'applying-to-a-fleet',
    'Help with joining a Fleet',
  ],
  [
    'fleet/recruitment/fleet-apply/fleet-apply.component.html',
    'applying-to-a-fleet',
    'Help with joining a Fleet',
  ],
  [
    'fleet/recruitment/fleet-recruitment-hub/fleet-recruitment-hub.component.html',
    'applying-to-a-fleet',
    'Help with recruitment',
  ],
  [
    'fleet/recruitment/fleet-applications/fleet-applications.component.html',
    'applying-to-a-fleet',
    'Help with recruitment',
  ],
  [
    'fleet/recruitment/fleet-application-detail/fleet-application-detail.component.html',
    'applying-to-a-fleet',
    'Help with recruitment',
  ],
  [
    'fleet/recruitment/fleet-invitations/fleet-invitations.component.html',
    'applying-to-a-fleet',
    'Help with recruitment',
  ],
  [
    'fleet/recruitment/fleet-members/fleet-members.component.html',
    'applying-to-a-fleet',
    'Help with recruitment',
  ],
  [
    'fleet/recruitment/fleet-recruitment-settings/fleet-recruitment-settings.component.html',
    'applying-to-a-fleet',
    'Help with recruitment',
  ],
  [
    'fleet/armadas/armada-history/armada-history.component.html',
    'armadas',
    'Help with Armadas',
  ],
  [
    'fleet/armadas/armada-requests/armada-requests.component.html',
    'armadas',
    'Help with Armadas',
  ],
  [
    'fleet/holdings/fleet-holdings/fleet-holdings.component.html',
    'fleet-holdings',
    'Help with holdings',
  ],

  // News, activity, events and chat.
  [
    'fleet/news/fleet-news-list/fleet-news-list.component.html',
    'fleet-news-and-activity',
    'Help with news',
  ],
  [
    'fleet/news/fleet-news-post/fleet-news-post.component.html',
    'fleet-news-and-activity',
    'Help with news',
  ],
  [
    'fleet/news/fleet-news-editor/fleet-news-editor.component.html',
    'fleet-news-and-activity',
    'Help with news',
  ],
  [
    'fleet/activity/fleet-activity-page/fleet-activity-page.component.html',
    'fleet-news-and-activity',
    'Help with activity',
  ],
  [
    'fleet/events/fleet-event-calendar/fleet-event-calendar.component.html',
    'fleet-events',
    'Help with events',
  ],
  [
    'fleet/events/fleet-event-detail/fleet-event-detail.component.html',
    'fleet-events',
    'Help with events',
  ],
  [
    'fleet/events/fleet-event-occurrence/fleet-event-occurrence.component.html',
    'fleet-events',
    'Help with events',
  ],
  [
    'fleet/events/fleet-event-editor/fleet-event-editor.component.html',
    'fleet-events',
    'Help with events',
  ],
  [
    'fleet/chat/chat-page/chat-page.component.html',
    'fleet-chat',
    'Help with chat',
  ],

  // Rosters.
  [
    'fleet/imports/roster-import/roster-import.component.html',
    'importing-a-roster',
    'Help with importing a roster',
  ],
  [
    'fleet/imports/roster-import-list/roster-import-list.component.html',
    'importing-a-roster',
    'Help with importing a roster',
  ],
  [
    'fleet/imports/roster-import-status/roster-import-status.component.html',
    'importing-a-roster',
    'Help with importing a roster',
  ],
  [
    'fleet/investigate/former-names/fleet-former-names.component.html',
    'importing-a-roster',
    'Help with former names',
  ],
  [
    'fleet/roster/roster-page/roster-page.component.html',
    'roster-history-and-corrections',
    'Help with the roster',
  ],
  [
    'fleet/roster/roster-history/roster-history.component.html',
    'roster-history-and-corrections',
    'Help with the roster history',
  ],
  [
    'fleet/roster/roster-timeline/roster-timeline.component.html',
    'roster-history-and-corrections',
    'Help with the roster history',
  ],
  [
    'fleet/investigate/fleet-investigate/fleet-investigate.component.html',
    'roster-history-and-corrections',
    'Help with correcting the roster',
  ],
  [
    'fleet/investigate/roster-conflicts/roster-conflicts.component.html',
    'roster-history-and-corrections',
    'Help with conflicting exports',
  ],
  [
    'fleet/investigate/rank-order/rank-order.component.html',
    'roster-history-and-corrections',
    'Help with rank order',
  ],
  [
    'fleet/identities/roster-identity-list/roster-identity-list.component.html',
    'roster-history-and-corrections',
    'Help with renames',
  ],
  [
    'fleet/fleet-reports/fleet-reports-page/fleet-reports-page.component.html',
    'fleet-reports',
    'Help with Fleet reports',
  ],

  // Running the site.
  [
    'admin/moderation-admin/report-admin-list.component.html',
    'site-admin-reports-and-holds',
    'Help with reports and holds',
  ],
  [
    'admin/moderation-admin/chat-report-admin-list.component.html',
    'site-admin-reports-and-holds',
    'Help with chat reports',
  ],
  [
    'admin/moderation-admin/moderation-hold-list.component.html',
    'site-admin-reports-and-holds',
    'Help with moderation holds',
  ],
  [
    'admin/moderation-admin/fleet-dispute-search.component.html',
    'site-admin-disputes-and-investigations',
    'Help with Fleet disputes',
  ],
  [
    'fleet/governance/community-dispute/community-dispute.component.html',
    'site-admin-disputes-and-investigations',
    'Help with Fleet disputes',
  ],
  [
    'admin/moderation-admin/fleet-investigation-log.component.html',
    'site-admin-disputes-and-investigations',
    'Help with Fleet investigations',
  ],
  [
    'admin/moderation-admin/roster-erasure-list.component.html',
    'site-admin-roster-erasure',
    'Help with roster erasures',
  ],
  [
    'admin/security-log/security-log.component.html',
    'site-admin-security-log',
    'Help with the Security Log',
  ],
  [
    'admin/scan-diagnostics/scan-diagnostics.component.html',
    'site-admin-scanning',
    'Help with Scan Diagnostics',
  ],
  // The Admin page's one link, on its publication pause (FC-042); the page
  // itself is a set of ways into others, each with a link of its own.
  [
    'admin/publication-pause/publication-pause.component.html',
    'site-admin-scanning',
    'Help with pausing publication',
  ],
];

/** Pages only site admins reach, and so the only ones to link an admin guide. */
const ADMIN_ONLY = new Set([
  'fleet/governance/community-dispute/community-dispute.component.html',
]);

/**
 * Reads one attribute's literal value out of a tag.
 *
 * @param tag - The tag's source.
 * @param name - The attribute.
 * @returns Its value, or undefined when the tag does not set it literally.
 */
const attribute = (tag: string, name: string): string | undefined =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1];

/**
 * Every help link a template draws, whether through `<app-help-link>` or
 * the page shell's `helpSlug`.
 *
 * @param source - The template's source.
 * @returns The links, in template order.
 */
const linksIn = (source: string): PlacedLink[] =>
  Array.from(
    source.matchAll(/<(app-help-link|app-fleet-page-shell)\b[^>]*>/g),
  ).flatMap(([tag, name]): PlacedLink[] => {
    const shell = name === 'app-fleet-page-shell';
    const slug = attribute(tag, shell ? 'helpSlug' : 'slug');
    const label = attribute(tag, shell ? 'helpLabel' : 'label');

    return slug === undefined ? [] : [{ slug, label: label ?? '' }];
  });

/**
 * Every template under a folder.
 *
 * @param folder - Where to start.
 * @returns Their paths.
 */
const templatesUnder = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = join(folder, entry.name);

    if (entry.isDirectory()) {
      return templatesUnder(path);
    }

    return entry.name.endsWith('.html') ? [path] : [];
  });

const read = (path: string): string => readFileSync(join(APP, path), 'utf8');

describe('Help link placements (FC-050)', () => {
  // Steve's rule: one link per page, under its heading, to its own guide.
  it.each(PLACEMENTS)('gives %s one link, to %s', (template, slug, label) => {
    expect(linksIn(read(template))).toEqual([{ slug, label }]);
  });

  it.each(PLACEMENTS)('leads %s to a guide that exists', (_template, slug) => {
    expect(findHelpGuide(slug)).toBeDefined();
  });

  // An admin guide sits in a topic only site admins can open, so a link to
  // one from a page Fleet leaders use would lead them nowhere.
  it.each(PLACEMENTS)(
    'leads %s to a guide its readers can open',
    (template, slug) => {
      const forAdmins =
        template.startsWith('admin/') || ADMIN_ONLY.has(template);

      expect(!!findHelpGuide(slug)!.topic.requiresAdmin).toBe(forAdmins);
    },
  );

  // Catches a link added later with a slug mistyped, anywhere in the app.
  it('never links, anywhere, to a guide that does not exist', () => {
    const missing = templatesUnder(APP).flatMap(path =>
      linksIn(readFileSync(path, 'utf8'))
        .filter(link => findHelpGuide(link.slug) === undefined)
        .map(link => `${relative(APP, path)}: ${link.slug}`),
    );

    expect(missing).toEqual([]);
  });

  it('finds links however the tag is laid out', () => {
    expect(
      linksIn(
        '<app-help-link slug="a" label="A" /><app-fleet-page-shell heading="H">' +
          '<app-fleet-page-shell\n  heading="H"\n  helpSlug="b"\n  helpLabel="B">' +
          '<app-help-link [slug]="x" [label]="y" /><app-help-link slug="c" />',
      ),
    ).toEqual([
      { slug: 'a', label: 'A' },
      { slug: 'b', label: 'B' },
      { slug: 'c', label: '' },
    ]);
  });
});
