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
];

export const ROADMAP_IN_PROGRESS: string[] = [
  'Add character R&D tracking.',
  'Add character specialization tracking.',
  'Add character fleet tracking.',
];

export const ROADMAP_PLANNED: string[] = [
  'Public-facing sharing of account and character data.',
  'Fleet-focused tracking and management capabilities.',
  'Expanded account and character insight views.',
  'More quality-of-life improvements across management workflows.',
];

export const ROADMAP_FUTURE_IDEAS: string[] = [
  'Space and Ground builds.',
  'Custom account and character tracking options.',
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
