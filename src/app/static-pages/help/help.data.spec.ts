import { REPORT_REASON_LABELS } from 'src/app/models/moderation.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

import helpGuideSlugs from './help-guide-slugs.json';
import { CONTENT_POLICY_RULES } from 'src/app/storytime/storytime.constants';
import { HELP_TOPICS, findHelpGuide } from './help.data';
import { HelpGuide } from './help.models';

/**
 * Every guide in the section, whatever topic it sits in.
 *
 * @returns The guides, flattened.
 */
const allGuides = (): HelpGuide[] => HELP_TOPICS.flatMap(topic => topic.guides);

describe('help data', () => {
  it('should offer at least one topic with guides in it', () => {
    expect(HELP_TOPICS.length).toBeGreaterThan(0);
    HELP_TOPICS.forEach(topic => {
      expect(topic.guides.length).toBeGreaterThan(0);
    });
  });

  // A slug is a guide's address. Two guides sharing one would make the second
  // unreachable, and nothing else would complain about it.
  it('should give every guide a slug of its own', () => {
    const slugs = allGuides().map(guide => guide.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('should give every guide a title, a summary and some content', () => {
    allGuides().forEach(guide => {
      expect(guide.title.length).toBeGreaterThan(0);
      expect(guide.summary.length).toBeGreaterThan(0);
      expect(guide.sections.length).toBeGreaterThan(0);

      guide.sections.forEach(section => {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.paragraphs.length).toBeGreaterThan(0);
      });
    });
  });

  // A guide that points somewhere the application does not route to sends a
  // reader to the not-found page from the very page meant to help them.
  it('should only link to routes the application defines', () => {
    const knownRoutes: string[] = Object.values(APP_ROUTES);

    allGuides().forEach(guide => {
      (guide.relatedLinks ?? []).forEach(link => {
        expect(knownRoutes).toContain(link.route);
      });
    });
  });

  // A related link with a parameter in it would be offered as a literal
  // ':storySlug' address.
  it('should only link to routes that need no parameters', () => {
    allGuides().forEach(guide => {
      (guide.relatedLinks ?? []).forEach(link => {
        expect(link.route).not.toContain(':');
      });
    });
  });

  // The build writes one sitemap entry per guide from that manifest. Nothing
  // else would notice a guide added, renamed or dropped without it: the
  // sitemap would simply be wrong, and quietly.
  it('should match the slug manifest the sitemap is built from', () => {
    expect(helpGuideSlugs.slugs).toEqual(allGuides().map(guide => guide.slug));
  });

  describe('findHelpGuide', () => {
    it('should find a guide by its slug, with the topic it belongs to', () => {
      const [topic] = HELP_TOPICS;
      const [guide] = topic.guides;

      expect(findHelpGuide(guide.slug)).toEqual({ topic, guide });
    });

    it('should find nothing for a slug that names no guide', () => {
      expect(findHelpGuide('not-a-guide')).toBeUndefined();
    });

    it('should find nothing when the address carried no slug', () => {
      expect(findHelpGuide(null)).toBeUndefined();
    });
  });

  describe('the Community topic', () => {
    const communityTopic = HELP_TOPICS.find(topic => topic.id === 'community');

    it('should be present', () => {
      expect(communityTopic).toBeDefined();
    });

    // The registry is always there, so its help is too. Gating it would hide
    // the guides that explain a feature every member can already use.
    it('should not wait on any feature switch', () => {
      expect(communityTopic?.requiresStorytime).toBe(false);
    });

    it('should cover the registry, friends and blocking', () => {
      const slugs = communityTopic?.guides.map(guide => guide.slug) ?? [];

      expect(slugs).toContain('the-galactic-personnel-registry');
      expect(slugs).toContain('listing-your-own-record');
      expect(slugs).toContain('finding-and-adding-friends');
      expect(slugs).toContain('blocking-and-reporting');
    });

    // The three-level opt-in is the thing members get wrong, and getting it
    // wrong means showing more than they meant to.
    it('should explain that visibility is opt-in at every level', () => {
      const copy = communityTopic?.guides
        .flatMap(guide => guide.sections)
        .flatMap(section => [...section.paragraphs, ...(section.points ?? [])])
        .join(' ');

      expect(copy).toContain('Nobody is listed by default');
      expect(copy).toContain('all of them have to agree');
      expect(copy).toContain('Your real name, your email address');
    });

    // A reporter picks from the list the dialog offers, so the help has to
    // offer the same one.
    it('should list the report reasons the form offers', () => {
      const points = communityTopic?.guides
        .flatMap(guide => guide.sections)
        .flatMap(section => section.points ?? []);

      Object.values(REPORT_REASON_LABELS).forEach(label => {
        expect(points).toContain(label);
      });
    });
  });

  describe('the Storytime topic', () => {
    const storytimeTopic = HELP_TOPICS.find(topic => topic.id === 'storytime');

    it('should be present', () => {
      expect(storytimeTopic).toBeDefined();
    });

    // Storytime can be switched off entirely, and is meant to look like a
    // feature that does not exist while it is. Guides describing it have to
    // wait on the same switch.
    it('should wait on the Storytime feature switch', () => {
      expect(storytimeTopic?.requiresStorytime).toBe(true);
    });

    it('should explain reading and writing, not just one of them', () => {
      const slugs = storytimeTopic?.guides.map(guide => guide.slug) ?? [];

      expect(slugs).toContain('finding-something-to-read');
      expect(slugs).toContain('writing-your-first-story');
    });

    // The ratings are a promise to readers, so the guides have to carry the
    // same wording the Story pages do rather than a paraphrase of it.
    it('should explain the content ratings in the site’s own words', () => {
      const ratingCopy = storytimeTopic?.guides
        .flatMap(guide => guide.sections)
        .flatMap(section => section.points ?? [])
        .join(' ');

      expect(ratingCopy).toContain('Adults Only');
      expect(ratingCopy).toContain('Intended for adults only.');
    });

    // An earlier version of this guide listed seven rules from memory and
    // stayed listing seven after the policy grew, which is how a help page
    // ends up telling somebody a prohibited thing is allowed.
    it.each(CONTENT_POLICY_RULES.map(rule => rule.title))(
      'should name the %s rule the policy names',
      title => {
        const policyCopy = storytimeTopic?.guides
          .flatMap(guide => guide.sections)
          .flatMap(section => section.points ?? [])
          .join(' ');

        expect(policyCopy).toContain(title);
      },
    );
  });
});
