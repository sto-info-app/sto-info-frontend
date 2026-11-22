import { RoadmapEntry, RoadmapSectionMeta } from './roadmap.models';

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

/**
 * Builds a finished entry.
 *
 * @param title - What was done.
 * @param details - A line each on what it brought.
 * @returns The entry.
 */
function roadmapEntry(title: string, ...details: string[]): RoadmapEntry {
  return { title, details };
}

export const ROADMAP_COMPLETE: RoadmapEntry[] = [
  roadmapEntry(
    'Core Platform Launch',
    'STO Info is live as a free, community-run app.',
    'Core STO account and character tracking is available.',
    'Platform monitoring added.',
    'Contact and team pages were added.',
    'The visual direction was created using a LCARS-inspired interface.',
  ),
  roadmapEntry(
    'Dashboard Insights',
    'Character statistics and filtering were introduced on the dashboard.',
  ),
  roadmapEntry(
    'Endeavour Tracking',
    'A dedicated Endeavour Perks dashboard was added.',
    'Account management now includes Endeavour progress and related improvements.',
  ),
  roadmapEntry(
    'News, Banners and Notifications',
    'A dedicated news, banners and notifications system was added.',
    'Users can now receive updates and alerts about important events.',
    'Release notes and announcements are now available in-app.',
  ),
  roadmapEntry(
    'Reputation Tracking',
    'Character reputation tracking was added for all thirteen reputations.',
    'Tier progress (up to Tier 6) can be tracked per character.',
    'A reputation summary shows overall completion at a glance.',
  ),
  roadmapEntry(
    'Character Progression',
    'Research & Development tracking.',
    'Captain Specialization tracking.',
    'Other character progress improvements.',
  ),
  roadmapEntry(
    'Community Info Sharing',
    'The Galactic Personnel Registry is now available for public community profile sharing.',
    'Friendships and user blocking were added across the platform.',
    'Member reporting and admin moderation tools for the community area.',
  ),
  roadmapEntry(
    'Storytime and Custom Tracking',
    'STO Storytime: publish, discover, and track community-created Star Trek Online stories, chapters, characters, and arcs (an out-of-game Foundry).',
    'Custom account and character tracking options.',
  ),
  roadmapEntry(
    'Fleet Communities',
    'Characters now record the Fleet they are in.',
    'Fleet Communities, Fleets and Armadas can be registered, found in the Fleet Directory and run through roles, recruitment and holdings.',
    'Fleet roster management was added, with imports, history, reports, news, events and notifications.',
    'Chat was added for Fleet, Armada and Community channels and between friends.',
  ),
];

export const ROADMAP_IN_PROGRESS: string[] = [];

export const ROADMAP_PLANNED: string[] = [
  'Space and Ground builds.',
  'Expanded account and character insight views.',
  'More quality-of-life improvements across management workflows.',
];

export const ROADMAP_FUTURE_IDEAS: string[] = [];
