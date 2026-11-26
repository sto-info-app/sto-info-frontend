import roadmap from './roadmap.json';
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

// The entries themselves are kept in roadmap.json: one object a finished
// piece of work (a title and a line each on what it brought) under
// "complete", and one line an item under the other three sections.

export const ROADMAP_COMPLETE: RoadmapEntry[] = roadmap.complete;

export const ROADMAP_IN_PROGRESS: string[] = roadmap.inProgress;

export const ROADMAP_PLANNED: string[] = roadmap.planned;

export const ROADMAP_FUTURE_IDEAS: string[] = roadmap.futureIdeas;
