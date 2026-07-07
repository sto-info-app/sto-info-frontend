export interface RoadmapEntry {
  title: string;
  details: string[];
}

export type RoadmapSectionKey =
  'complete' | 'inProgress' | 'planned' | 'futureIdeas';

export interface RoadmapSectionMeta {
  key: RoadmapSectionKey;
  title: string;
  anchorId: string;
}
