import { FLEETS_TOPIC } from './help-fleets.data';
import { SITE_ADMIN_TOPIC } from './help-site-admin.data';
import { HELP_TOPICS, visibleHelpTopics } from './help.data';
import { HelpGuide } from './help.models';
import { ALL_HELP_FEATURES_ON, helpFeaturesWith } from './help.testing';

/** The headings every FC-050 guide opens and closes with, in order. */
const OPENING = ['What it is for', 'Who can use it', 'Where to find it'];
const CLOSING = ['Who can see it', 'When something goes wrong'];

/**
 * Every word of a guide a reader sees.
 *
 * @param guide The guide.
 * @returns Its title, summary, headings, paragraphs and points.
 */
const wordsOf = (guide: HelpGuide): string[] => [
  guide.title,
  guide.summary,
  ...guide.sections.flatMap(section => [
    section.heading,
    ...section.paragraphs,
    ...(section.points ?? []),
  ]),
];

describe.each([
  ['Fleets', FLEETS_TOPIC],
  ['Running the site', SITE_ADMIN_TOPIC],
])('the %s topic (FC-050)', (_title, topic) => {
  // One shape for every guide, so a reader who has found their way round one
  // can find their way round the next.
  it.each(topic.guides.map(guide => [guide.slug, guide] as const))(
    'gives %s the six parts in order',
    (_slug, guide) => {
      const headings = guide.sections.map(section => section.heading);

      expect(headings.slice(0, 3)).toEqual(OPENING);
      expect(headings.slice(-2)).toEqual(CLOSING);
      expect(headings.length).toBeGreaterThan(OPENING.length + CLOSING.length);
      headings.slice(3, -2).forEach(heading => {
        expect(heading).toMatch(/^How /);
      });
    },
  );

  // A straight quote or apostrophe in prose is a typing slip, and a different
  // character from the one every other guide uses.
  it.each(topic.guides.map(guide => [guide.slug, guide] as const))(
    'writes %s with curly quotes and apostrophes',
    (_slug, guide) => {
      wordsOf(guide).forEach(text => {
        expect(text).not.toMatch(/['"]/);
      });
    },
  );

  // A help link is one per page, and each page links to one guide.
  it('gives every guide a related link out to the site', () => {
    topic.guides.forEach(guide => {
      expect(guide.relatedLinks?.length).toBeGreaterThan(0);
    });
  });
});

describe('the Fleets topic (FC-050)', () => {
  // Steve's decisions of 29 and 30 September 2026: second on the Help home,
  // waiting on Fleet Community as a whole, and listed while it is off.
  it('should be second, and wait on Fleet Community as a whole', () => {
    expect(HELP_TOPICS[1]).toBe(FLEETS_TOPIC);
    expect(FLEETS_TOPIC.requiresFeature).toBe('FLEET');
    FLEETS_TOPIC.guides.forEach(guide => {
      expect(guide.requiresFeature).not.toBe('FLEET');
      expect(guide.requiresPermission).toBeUndefined();
    });
  });

  it('should stay listed while Fleet Community is switched off', () => {
    const ids = visibleHelpTopics(
      helpFeaturesWith({ FLEET: 'DISABLED', CHAT: 'DISABLED' }),
      new Set<string>(),
    ).map(topic => topic.id);

    expect(ids).toContain('fleets');
  });

  // The chat guide, and the chat parts of the others, wait on chat, so their
  // pages say when it is off.
  it('should mark what is about chat as waiting on it', () => {
    const chat = FLEETS_TOPIC.guides.find(guide => guide.slug === 'fleet-chat');

    expect(chat?.requiresFeature).toBe('CHAT');
    expect(
      FLEETS_TOPIC.guides.some(guide =>
        guide.sections.some(section => section.requiresFeature === 'CHAT'),
      ),
    ).toBe(true);
  });
});

describe('the Running the site topic (FC-050)', () => {
  it('should be last, and for site administrators alone', () => {
    expect(HELP_TOPICS[HELP_TOPICS.length - 1]).toBe(SITE_ADMIN_TOPIC);
    expect(SITE_ADMIN_TOPIC.requiresAdmin).toBe(true);
  });

  it('should be offered to a site administrator and nobody else', () => {
    const idsFor = (isAdmin: boolean) =>
      visibleHelpTopics(ALL_HELP_FEATURES_ON, new Set<string>(), isAdmin).map(
        topic => topic.id,
      );

    expect(idsFor(true)).toContain('site-admin');
    expect(idsFor(false)).not.toContain('site-admin');
  });

  // A guide notes a switch only where its pages really stop working while it
  // is off: the dispute page does; Chat Reports and Moderation Holds do not.
  it('should wait on Fleet Community only for the dispute guide', () => {
    expect(
      SITE_ADMIN_TOPIC.guides
        .filter(guide => guide.requiresFeature !== undefined)
        .map(guide => [guide.slug, guide.requiresFeature]),
    ).toEqual([['site-admin-disputes-and-investigations', 'FLEET']]);
  });
});
