import {
  CustomTrackingEmptyMode,
  CustomTrackingFieldType,
  CustomTrackingImageAnswer,
  CustomTrackingPublicChoice,
} from 'src/app/models/custom-tracking.models';

/**
 * One field as a detail page draws it.
 *
 * Deliberately one shape for both audiences. An owner reading their own page
 * and a visitor reading a public one are asking the same question — what does
 * this field say — and the answers to the questions that differ, which empty
 * rule applies and which fields exist at all, have already been settled by the
 * time anything gets here. Two shapes would have meant two renderers, and the
 * one exercised less would be the one that drifted.
 *
 * What differs is only where the shape is built from: the public projection
 * arrives in it already, and the owner's record is folded into it. Neither
 * path can widen what the other shows, because a field that reached this point
 * is a field somebody is entitled to see.
 */
export interface CustomTrackingDisplayField {
  id: string;
  fieldType: CustomTrackingFieldType;
  name: string;
  description: string | null;
  configuration: Record<string, unknown>;
  /** The rule that applies to this reader, already resolved. */
  emptyMode: CustomTrackingEmptyMode;
  emptyPlaceholder: string | null;
  value: Record<string, unknown> | null;
  chosen: CustomTrackingPublicChoice[];
  image: CustomTrackingImageAnswer | null;
  /**
   * Whether anything is recorded at all.
   *
   * Carried rather than inferred from `value`, because several types answer
   * with no fragment of their own: a chosen option, a picture and a set of
   * tags all live outside it, and a page that read absence from the fragment
   * would call every one of them unanswered.
   */
  answered: boolean;
}

/** One tab as a detail page draws it. */
export interface CustomTrackingDisplayTab {
  id: string;
  name: string;
  description: string | null;
  fields: CustomTrackingDisplayField[];
}

/** One section as a detail page draws it. */
export interface CustomTrackingDisplaySection {
  id: string;
  name: string;
  description: string | null;
  tabs: CustomTrackingDisplayTab[];
}
