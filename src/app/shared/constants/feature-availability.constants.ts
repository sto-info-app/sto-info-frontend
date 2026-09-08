/**
 * What to tell a visitor about a feature they have asked for and cannot have.
 *
 * A feature whose master switch lives in `app_setting` has two quite different
 * reasons for being out of reach, and they are worth telling apart. The switch
 * may be off, which is a decision somebody made and which will be reversed; or
 * the backend holding the switch may not be answering, in which case nobody
 * has said anything about the feature at all.
 *
 * Neither is a wrong address, so neither is answered with the not-found page.
 * A visitor told their address is wrong will stop trying; a visitor told the
 * feature is resting will come back.
 *
 * Held centrally so Storytime, Custom Tracking and the help guides word the
 * same two situations the same way, and so a future localisation pass has one
 * place to work from.
 */

/** Why a feature cannot be reached. */
export const FEATURE_UNAVAILABLE_OFFLINE = 'OFFLINE';
export const FEATURE_UNAVAILABLE_DISABLED = 'DISABLED';

export type FeatureUnavailableReason =
  typeof FEATURE_UNAVAILABLE_OFFLINE | typeof FEATURE_UNAVAILABLE_DISABLED;

export const FEATURE_UNAVAILABLE_COPY = {
  /** Heading shown when the backend could not be asked. */
  OFFLINE_TITLE: 'Connection Lost',

  /** Heading shown when the feature is switched off. */
  DISABLED_TITLE: 'Currently Offline',

  /**
   * Says the backend could not be reached.
   *
   * Deliberately silent about the feature's own switch: with the backend
   * unreachable nobody knows what the switch says, and guessing would be the
   * one thing worse than saying nothing.
   *
   * @param featureName - The feature the visitor asked for.
   * @returns The message to show.
   */
  offline(featureName: string): string {
    return (
      `${featureName} cannot be reached at the moment because the site's ` +
      'systems are not answering. Nothing has been lost — please try again ' +
      'shortly.'
    );
  },

  /**
   * Says the feature is switched off.
   *
   * @param featureName - The feature the visitor asked for.
   * @returns The message to show.
   */
  disabled(featureName: string): string {
    return (
      `${featureName} is switched off at the moment. Anything you have ` +
      'already recorded is untouched and will be here when it comes back.'
    );
  },
} as const;
