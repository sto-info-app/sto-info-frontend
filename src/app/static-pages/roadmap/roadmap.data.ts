import {
  RoadmapEntry,
  RoadmapSectionKey,
  RoadmapSectionMeta,
} from './roadmap.models';

export const ROADMAP_SECTION_META: RoadmapSectionMeta[] = [
  {
    key: 'inProgress',
    title: 'In Progress',
    anchorId: 'in-progress',
  },
  {
    key: 'planned',
    title: 'Planned',
    anchorId: 'planned',
  },
  {
    key: 'futureIdeas',
    title: 'Future Ideas',
    anchorId: 'future-ideas',
  },
  {
    key: 'complete',
    title: 'Complete',
    anchorId: 'complete',
  },
];

export const ROADMAP_COMPLETE: RoadmapEntry[] = [
  {
    title: 'Core Platform Launch',
    details: [
      'STO Info is live as a free, community-run app.',
      'Core STO account and character tracking is available.',
      'Platform monitoring added.',
      'Contact and team pages were added.',
      'The visual direction was created using a LCARS-inspired interface.',
    ],
  },
  {
    title: 'Dashboard Insights',
    details: [
      'Character statistics and filtering were introduced on the dashboard.',
    ],
  },
  {
    title: 'Endeavour Tracking',
    details: [
      'A dedicated Endeavour Perks dashboard was added.',
      'Account management now includes Endeavour progress and related improvements.',
    ],
  },
  {
    title: 'News, Banners and Notifications',
    details: [
      'A dedicated news, banners and notifications system was added.',
      'Users can now receive updates and alerts about important events.',
      'Release notes and announcements are now available in-app.',
    ],
  },
  {
    title: 'Reputation Tracking',
    details: [
      'Character reputation tracking was added for all thirteen reputations.',
      'Tier progress (up to Tier 6) can be tracked per character.',
      'A reputation summary shows overall completion at a glance.',
    ],
  },
  {
    title: 'Character Progression',
    details: [
      'Research & Development tracking.',
      'Captain Specialization tracking.',
      'Other character progress improvements.',
    ],
  },
  {
    title: 'Community Info Sharing',
    details: [
      'The Galactic Personnel Registry is now available for public community profile sharing.',
      'Friendships and user blocking were added across the platform.',
      'Member reporting and admin moderation tools for the community area.',
    ],
  },
];

export const ROADMAP_IN_PROGRESS: string[] = [
  'STO Storytime: publish, discover, and track community-created Star Trek Online stories, chapters, characters, and arcs (an out-of-game Foundry).',
  'Custom account and character tracking options.',
];

export const ROADMAP_PLANNED: string[] = [
  'Character fleet tracking.',
  'Fleet-focused tracking and management capabilities.',
  'Expanded account and character insight views.',
  'More quality-of-life improvements across management workflows.',
];

export const ROADMAP_FUTURE_IDEAS: string[] = [
  'Space and Ground builds.',
  'Fleet rosters, news and notifications.',
];

export const ROADMAP_SECTION_EXPANDED_DEFAULTS: Record<
  RoadmapSectionKey,
  boolean
> = {
  complete: true,
  inProgress: true,
  planned: true,
  futureIdeas: true,
};
