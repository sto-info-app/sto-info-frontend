/**
 * The audience a Story is suitable for.
 *
 * None of these gate access. Mature shows a warning banner and a listing icon,
 * and Adults Only a stronger warning, but neither requires an acknowledgement.
 */
export enum ContentRating {
  GENERAL = 'GENERAL',
  MATURE = 'MATURE',
  ADULTS_ONLY = 'ADULTS_ONLY',
}

/**
 * How each content rating is described to readers.
 *
 * The single authoritative mapping, so a rating is never worded one way on a
 * card and another on a warning banner.
 */
export const CONTENT_RATING_LABELS: Readonly<Record<ContentRating, string>> = {
  [ContentRating.GENERAL]: 'General',
  [ContentRating.MATURE]: 'Mature',
  [ContentRating.ADULTS_ONLY]: 'Adults Only',
};

/**
 * The longer explanation shown alongside a rating warning.
 */
export const CONTENT_RATING_DESCRIPTIONS: Readonly<
  Record<ContentRating, string>
> = {
  [ContentRating.GENERAL]:
    'May contain moderate violence, suggestive references or occasional strong language.',
  [ContentRating.MATURE]:
    'Contains intense violence, heavy or explicit themes, substance use, or strong profanity.',
  [ContentRating.ADULTS_ONLY]:
    'Contains explicit sexual content, graphic violence, or extreme elements. Intended for adults only.',
};

/**
 * A language a Story or Chapter may be written in.
 */
export interface StorytimeLanguage {
  /** BCP 47 language tag. */
  code: string;
  /** English name of the language. */
  name: string;
}

/**
 * Which parts of Storytime are currently switched on.
 */
export interface StorytimeFeatureState {
  isEnabled: boolean;
  publicReadEnabled: boolean;
  creationEnabled: boolean;
  youTubeEnabled: boolean;
  spotlightEnabled: boolean;
}

/**
 * Everything the client needs to render Storytime consistently with the server.
 */
export interface StorytimeConfiguration {
  features: StorytimeFeatureState;
  languages: StorytimeLanguage[];
  defaultLanguageCode: string;
  contentRatings: ContentRating[];
}

/**
 * The feature state assumed when the server cannot be reached.
 *
 * Everything off: a client that cannot confirm Storytime is available must not
 * advertise it, because showing routes that then fail is worse than showing
 * nothing.
 */
export const STORYTIME_DISABLED_STATE: StorytimeFeatureState = {
  isEnabled: false,
  publicReadEnabled: false,
  creationEnabled: false,
  youTubeEnabled: false,
  spotlightEnabled: false,
};
