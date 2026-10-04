import {
  CUSTOM_TRACKING_CATEGORY_LABELS,
  CUSTOM_TRACKING_EMPTY_MODE_CHOICES,
} from 'src/app/dashboard/settings/custom-tracking/definitions/custom-tracking-field-settings.constants';
import { REPORT_REASON_LABELS } from 'src/app/models/moderation.models';
import { APP_ROUTES } from 'src/app/shared/constants/app-routing.constants';

import helpGuideSlugs from './help-guide-slugs.json';
import { PERMISSIONS } from 'src/app/models/access-control.models';
import { CONTENT_POLICY_RULES } from 'src/app/storytime/storytime.constants';
import {
  HELP_FEATURE_NAMES,
  HELP_TOPICS,
  blockingFeature,
  unreachableFeature,
  findHelpGuide,
  findHelpTopic,
  HELP_HIDDEN_WHEN_OFF,
  isFeatureOffered,
  isGuidePermitted,
  isTopicPermitted,
  visibleHelpTopics,
  switchedOffFeature,
  switchedOffNote,
  visibleSections,
} from './help.data';
import { HelpGuide } from './help.models';
import {
  ALL_HELP_FEATURES_ON,
  SETTINGS_FORM_LABELS,
  helpFeaturesWith,
} from './help.testing';

/**
 * Every guide in the section, whatever topic it sits in.
 *
 * @returns The guides, flattened.
 */
const allGuides = (): HelpGuide[] => HELP_TOPICS.flatMap(topic => topic.guides);

/**
 * The guides anybody may read.
 *
 * @returns The guides that ask for no permission, outside the site
 *   administrators' topic (FC-050).
 */
const publicGuides = (): HelpGuide[] =>
  HELP_TOPICS.filter(topic => !topic.requiresAdmin)
    .flatMap(topic => topic.guides)
    .filter(guide => !guide.requiresPermission);

/** Somebody holding nothing at all. */
const noPermissions: ReadonlySet<string> = new Set<string>();

const ALL_ON = ALL_HELP_FEATURES_ON;
const featuresWith = helpFeaturesWith;

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
  //
  // Only the guides anybody may read belong in it. A guide behind a permission
  // answers a crawler with the not-found page, so listing it would advertise
  // an address that does not work for the public it is being advertised to.
  it('should match the slug manifest the sitemap is built from', () => {
    expect(helpGuideSlugs.slugs).toEqual(
      publicGuides().map(guide => guide.slug),
    );
  });

  // FC-048: a section's page is listed when anybody may open it, which is
  // when it holds at least one guide asking for no permission.
  it('should list every section anybody may open in the manifest, in order', () => {
    expect(helpGuideSlugs.topics).toEqual(
      HELP_TOPICS.filter(
        topic =>
          !topic.requiresAdmin &&
          topic.guides.some(guide => !guide.requiresPermission),
      ).map(topic => topic.id),
    );
  });

  // A section's address is /help/topics/<id>. Two parts where a guide's has
  // one, so neither can answer for the other, but a guide called "topics"
  // would still read as the start of a section's address.
  it('should keep section addresses and guide addresses apart', () => {
    HELP_TOPICS.forEach(topic => {
      expect(topic.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });
    expect(new Set(HELP_TOPICS.map(topic => topic.id)).size).toBe(
      HELP_TOPICS.length,
    );
    expect(allGuides().map(guide => guide.slug)).not.toContain('topics');
  });

  it('should keep the guides behind a permission out of the sitemap', () => {
    allGuides()
      .filter(guide => guide.requiresPermission)
      .forEach(guide => {
        expect(helpGuideSlugs.slugs).not.toContain(guide.slug);
      });
  });

  describe('findHelpTopic', () => {
    it('should find a section by its id', () => {
      expect(findHelpTopic('community')).toBe(HELP_TOPICS[0]);
    });

    it('should find nothing for an id that names no section, or none', () => {
      expect(findHelpTopic('no-such-section')).toBeUndefined();
      expect(findHelpTopic(null)).toBeUndefined();
    });
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
      expect(communityTopic?.requiresFeature).toBeUndefined();
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

  describe('the Custom Tracking topic', () => {
    const customTrackingTopic = HELP_TOPICS.find(
      topic => topic.id === 'custom-tracking',
    );

    /** Every word of the topic, headings aside. */
    const copy = (): string =>
      (customTrackingTopic?.guides ?? [])
        .flatMap(guide => guide.sections)
        .flatMap(section => [...section.paragraphs, ...(section.points ?? [])])
        .join(' ');

    it('should be present', () => {
      expect(customTrackingTopic).toBeDefined();
    });

    // Custom Tracking is offered from Settings whether or not it is switched
    // on, and its own page says which. There is nothing for gating the guides
    // to keep quiet, and a reader who cannot open the page is exactly who the
    // guides are for.
    it('should not wait on any feature switch', () => {
      expect(customTrackingTopic?.requiresFeature).toBeUndefined();
    });

    it('should cover building, filling in and publishing', () => {
      const slugs = customTrackingTopic?.guides.map(guide => guide.slug) ?? [];

      expect(slugs).toContain('what-custom-tracking-is');
      expect(slugs).toContain('building-what-you-track');
      expect(slugs).toContain('filling-in-your-records');
      expect(slugs).toContain('who-can-see-what-you-track');
    });

    // The guide sends somebody to a picker that groups its kinds under these
    // headings. Naming a group differently would leave them looking for one
    // the picker does not offer.
    it.each(Object.values(CUSTOM_TRACKING_CATEGORY_LABELS))(
      'should name the %s grouping the field picker offers',
      label => {
        expect(copy()).toContain(label);
      },
    );

    // Three choices in a menu, described in the menu's own words for the same
    // reason.
    it.each(CUSTOM_TRACKING_EMPTY_MODE_CHOICES.map(choice => choice.label))(
      'should offer the %s choice the field form offers',
      label => {
        expect(copy()).toContain(label);
      },
    );

    // The chain is the thing people get wrong, and getting it wrong means
    // publishing something they meant to keep to themselves. The retention
    // window is the other, because it is the only window in which a deletion
    // can still be put right.
    it('should explain the visibility chain and the retention window', () => {
      expect(copy()).toContain('all of these are public at the same time');
      expect(copy()).toContain('kept for 180 days');
    });
  });

  describe('the Running Storytime topic', () => {
    const adminTopic = HELP_TOPICS.find(
      topic => topic.id === 'storytime-admin',
    );

    it('should be present', () => {
      expect(adminTopic).toBeDefined();
    });

    // The guides describe Storytime pages, so they go when Storytime does.
    it('should wait on the Storytime feature switch', () => {
      expect(adminTopic?.requiresFeature).toBe('STORYTIME');
    });

    // One guide per job, each behind the permission that opens the page it
    // describes. Gating the topic as a whole would offer a curator the
    // moderation guide, and moderating is not what they were given.
    it.each([
      ['moderating-storytime', PERMISSIONS.STORYTIME_MODERATE],
      ['curating-the-spotlight', PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE],
      ['managing-storytime-tags', PERMISSIONS.STORYTIME_TAG_MANAGE],
    ])('should put %s behind %s', (slug, permission) => {
      const guide = adminTopic?.guides.find(
        candidate => candidate.slug === slug,
      );

      expect(guide).toBeDefined();
      expect(guide?.requiresPermission).toBe(permission);
    });

    it('should leave no guide in it readable by everybody', () => {
      adminTopic?.guides.forEach(guide => {
        expect(guide.requiresPermission).toBeDefined();
      });
    });
  });

  describe('isGuidePermitted', () => {
    it('should permit a guide that asks for nothing', () => {
      const [guide] = publicGuides();

      expect(isGuidePermitted(guide, noPermissions)).toBe(true);
    });

    it('should refuse a guide whose permission is not held', () => {
      const guide = findHelpGuide('moderating-storytime')?.guide;

      expect(guide).toBeDefined();
      expect(isGuidePermitted(guide as HelpGuide, noPermissions)).toBe(false);
    });

    it('should permit a guide whose permission is held', () => {
      const guide = findHelpGuide('moderating-storytime')?.guide;

      expect(
        isGuidePermitted(
          guide as HelpGuide,
          new Set([PERMISSIONS.STORYTIME_MODERATE]),
        ),
      ).toBe(true);
    });
  });

  describe('isTopicPermitted', () => {
    const adminTopic = { ...HELP_TOPICS[0], requiresAdmin: true };

    it('should offer a topic for site administrators only to one', () => {
      expect(isTopicPermitted(adminTopic, false)).toBe(false);
      expect(isTopicPermitted(adminTopic, true)).toBe(true);
    });

    it('should offer any other topic to everybody', () => {
      expect(isTopicPermitted(HELP_TOPICS[0], false)).toBe(true);
    });
  });

  describe('visibleHelpTopics', () => {
    it('should drop the Storytime topics while the feature is off', () => {
      const ids = visibleHelpTopics(
        featuresWith({ STORYTIME: 'DISABLED' }),
        noPermissions,
      ).map(topic => topic.id);

      expect(ids).toEqual([
        'community',
        'fleets',
        'custom-tracking',
        'settings',
      ]);
    });

    // FC-050: Fleet Community's guides stay while it is off, so they can
    // still be found; their pages say it is off.
    it('should keep the guides about Fleet Community while it is off', () => {
      const settings = visibleHelpTopics(
        featuresWith({ FLEET: 'DISABLED', CHAT: 'DISABLED' }),
        noPermissions,
      ).find(topic => topic.id === 'settings');

      expect(settings?.guides.map(guide => guide.slug)).toContain(
        'fleet-settings',
      );
    });

    // A switch that could not be read has said nothing about the feature.
    it('should keep every topic while no switch can be read', () => {
      const ids = visibleHelpTopics(
        featuresWith({
          STORYTIME: 'UNAVAILABLE',
          FLEET: 'UNAVAILABLE',
          CHAT: 'UNAVAILABLE',
        }),
        noPermissions,
      ).map(topic => topic.id);

      expect(ids).toEqual([
        'community',
        'fleets',
        'custom-tracking',
        'storytime',
        'settings',
      ]);
    });

    // A heading with nothing under it tells a reader there is something here
    // they are not being shown, which is the opposite of what gating it is for.
    it('should drop a topic once every guide in it has been filtered away', () => {
      const ids = visibleHelpTopics(ALL_ON, noPermissions).map(
        topic => topic.id,
      );

      expect(ids).toContain('storytime');
      expect(ids).not.toContain('storytime-admin');
    });

    it('should offer only the guides the reader holds the permission for', () => {
      const topics = visibleHelpTopics(
        ALL_ON,
        new Set([PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE]),
      );
      const adminTopic = topics.find(topic => topic.id === 'storytime-admin');

      expect(adminTopic?.guides.map(guide => guide.slug)).toEqual([
        'curating-the-spotlight',
      ]);
    });

    it('should leave the public topics alone whatever the reader holds', () => {
      const topics = visibleHelpTopics(ALL_ON, noPermissions);
      const community = topics.find(topic => topic.id === 'community');

      expect(community?.guides.length).toBe(
        HELP_TOPICS.find(topic => topic.id === 'community')?.guides.length,
      );
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
      expect(storytimeTopic?.requiresFeature).toBe('STORYTIME');
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

  describe('feature switches (FC-049)', () => {
    // Steve's decision of 30 September 2026 (FC-050): only Storytime's help
    // goes with it; Fleet Community's and its chat's stay, noted.
    it('should hide only Storytime’s help while it is off', () => {
      expect(HELP_HIDDEN_WHEN_OFF).toEqual({
        STORYTIME: true,
        FLEET: false,
        CHAT: false,
      });
    });

    it('should offer help about a feature unless it is off and hidden with it', () => {
      expect(isFeatureOffered(undefined, featuresWith({}))).toBe(true);
      expect(isFeatureOffered('STORYTIME', featuresWith({}))).toBe(true);
      expect(
        isFeatureOffered(
          'STORYTIME',
          featuresWith({ STORYTIME: 'UNAVAILABLE' }),
        ),
      ).toBe(true);
      expect(
        isFeatureOffered('STORYTIME', featuresWith({ STORYTIME: 'DISABLED' })),
      ).toBe(false);
      expect(
        isFeatureOffered('FLEET', featuresWith({ FLEET: 'DISABLED' })),
      ).toBe(true);
    });

    // A page waits on its topic's switch first, then its guide's; only one
    // that is on lets it through, since unknown is not the same as on. A
    // switch whose help stays blocks nothing.
    it('should name the first switch keeping a page from being read', () => {
      expect(blockingFeature(ALL_ON, undefined, 'STORYTIME')).toBeNull();
      expect(
        blockingFeature(
          featuresWith({ STORYTIME: 'DISABLED', FLEET: 'DISABLED' }),
          'FLEET',
          'STORYTIME',
        ),
      ).toBe('STORYTIME');
      expect(
        blockingFeature(featuresWith({ CHAT: 'DISABLED' }), undefined, 'CHAT'),
      ).toBeNull();
      expect(blockingFeature(ALL_ON)).toBeNull();
    });

    // FC-044, Steve's decision of 2 October 2026: transient unavailability
    // must not hide useful help (plan section 5).
    it('should keep a page whose switch could not be asked, and name it for a notice', () => {
      const unknown = featuresWith({ STORYTIME: 'UNAVAILABLE' });

      expect(blockingFeature(unknown, 'STORYTIME')).toBeNull();
      expect(unreachableFeature(unknown, undefined, 'STORYTIME')).toBe(
        'STORYTIME',
      );
      expect(
        unreachableFeature(
          featuresWith({ FLEET: 'UNAVAILABLE', CHAT: 'UNAVAILABLE' }),
          'FLEET',
          'CHAT',
        ),
      ).toBe('FLEET');
      expect(
        unreachableFeature(
          featuresWith({ STORYTIME: 'DISABLED' }),
          'STORYTIME',
        ),
      ).toBeNull();
      expect(unreachableFeature(ALL_ON, 'FLEET')).toBeNull();
    });

    it('should name the first switch off whose help stays', () => {
      expect(
        switchedOffFeature(
          featuresWith({ STORYTIME: 'DISABLED', CHAT: 'DISABLED' }),
          'STORYTIME',
          undefined,
          'CHAT',
        ),
      ).toBe('CHAT');
      // A switch that could not be read has said nothing.
      expect(
        switchedOffFeature(featuresWith({ FLEET: 'UNAVAILABLE' }), 'FLEET'),
      ).toBeNull();
      expect(switchedOffFeature(ALL_ON, 'FLEET', 'CHAT')).toBeNull();
    });

    it.each([
      ['topic', 'Its guides stay here'],
      ['guide', 'This guide stays here'],
      ['section', 'what this part describes'],
    ] as const)('should say a feature is off over a %s', (part, words) => {
      const note = switchedOffNote('FLEET', part);

      expect(note).toContain('Fleet Community is switched off at the moment');
      expect(note).toContain(words);
    });

    it('should keep the parts of a guide about a feature whose help stays', () => {
      const guide = findHelpGuide('fleet-settings')!.guide;

      expect(
        visibleSections(guide, featuresWith({ CHAT: 'DISABLED' })),
      ).toEqual(guide.sections);
      expect(visibleSections(guide, ALL_ON)).toEqual(guide.sections);
    });

    it('should name every switch for the notice saying it is off', () => {
      expect(HELP_FEATURE_NAMES).toEqual({
        STORYTIME: 'Storytime',
        FLEET: 'Fleet Community',
        CHAT: 'Fleet chat',
      });
    });
  });

  describe('the STO Info settings topic', () => {
    const settingsTopic = HELP_TOPICS.find(topic => topic.id === 'settings');

    /**
     * Everything the settings guides say, as one string.
     *
     * @returns The text.
     */
    const settingsText = (): string =>
      (settingsTopic?.guides ?? [])
        .flatMap(guide => [
          guide.title,
          guide.summary,
          ...guide.sections.flatMap(section => [
            section.heading,
            ...section.paragraphs,
            ...(section.points ?? []),
          ]),
        ])
        .join(' ');

    // Steve's order of 29 September 2026: Fleets second, settings after STO
    // Storytime, before the guides almost nobody is shown, and Running the
    // site last (FC-050).
    it('should come after STO Storytime and before Running Storytime', () => {
      expect(HELP_TOPICS.map(topic => topic.id)).toEqual([
        'community',
        'fleets',
        'custom-tracking',
        'storytime',
        'settings',
        'storytime-admin',
        'site-admin',
      ]);
    });

    it('should not wait on any switch as a whole, nor on any permission', () => {
      expect(settingsTopic?.requiresFeature).toBeUndefined();
      settingsTopic?.guides.forEach(guide => {
        expect(guide.requiresPermission).toBeUndefined();
      });
    });

    // One guide for the page, then one per panel in the order the page shows
    // them.
    it('should give the page and each of its panels a guide', () => {
      expect(settingsTopic?.guides.map(guide => guide.slug)).toEqual([
        'your-settings',
        'privacy-mode',
        'staying-signed-in',
        'dates-and-times',
        'fleet-settings',
        'what-you-are-notified-about',
      ]);
    });

    // The page shows its Fleet and chat controls only while those features
    // are on, and the guides to them follow the same switches.
    it('should wait on Fleet Community for the Fleet controls, and chat for chat’s', () => {
      const guides = settingsTopic?.guides ?? [];
      const byFeature = (feature: string | undefined) =>
        guides.filter(guide => guide.requiresFeature === feature);

      expect(byFeature('FLEET').map(guide => guide.slug)).toEqual([
        'fleet-settings',
        'what-you-are-notified-about',
      ]);
      expect(
        guides.flatMap(guide =>
          guide.sections
            .filter(section => section.requiresFeature === 'CHAT')
            .map(section => section.heading),
        ),
      ).toEqual([
        'Who can see when I am online',
        'Appear offline',
        'Show when I am typing',
        'Mentions, replies and direct messages',
      ]);
      expect(
        findHelpGuide('dates-and-times')?.guide.sections[1].requiresFeature,
      ).toBe('FLEET');
    });

    // AC: instructions use the form's own words. The Settings page's spec
    // checks the same list is on the page, so a renamed control fails one or
    // the other.
    it.each(SETTINGS_FORM_LABELS)('should use the form’s label “%s”', label => {
      expect(settingsText()).toContain(label);
    });

    // Privacy Mode is screen masking, and nothing to do with who may see
    // what. A reader who takes it for either has misunderstood it.
    it('should explain Privacy Mode as a blur on the reader’s own screen', () => {
      const text = findHelpGuide('privacy-mode')!
        .guide.sections.flatMap(section => section.paragraphs)
        .join(' ');

      expect(text).toContain('on your own screen');
      expect(text).toContain('It changes nothing anybody else sees.');
      expect(text).toContain('It is a blur, not a removal.');
    });

    it('should tell settings apart from the STO accounts recorded in the game', () => {
      expect(settingsText()).toContain('Settings are not your STO accounts');
    });

    it('should lead every guide back to Settings', () => {
      settingsTopic?.guides.forEach(guide => {
        expect(guide.relatedLinks?.[0]).toEqual({
          label: 'Your settings',
          route: APP_ROUTES.STO_DASHBOARD_SETTINGS,
        });
      });
    });

    it('should offer the inactivity timeout’s choices as the form does', () => {
      expect(settingsText()).toContain(
        '1 hour, 4 hours (the default), 8 hours',
      );
    });
  });
});
