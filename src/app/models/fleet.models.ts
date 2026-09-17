/**
 * Which parts of Fleet Community are currently switched on.
 */
export interface FleetFeatureState {
  isEnabled: boolean;
  registrationEnabled: boolean;
  importsEnabled: boolean;
  chatEnabled: boolean;
}

/**
 * The published access and retention figures, as the server states them.
 *
 * Served rather than held in client code so that the numbers a user reads are
 * the ones the server enforces. A client with its own copy would go on saying
 * "the last four hours" after the server stopped meaning it.
 */
export interface FleetPolicy {
  chatMemberHistoryHours: number;
  chatTranscriptHistoryDays: number;
  customChannelLimit: number;
  chatRetentionDays: number;
  importSourceRetentionDays: number;
}

/**
 * What the client needs to render Fleet Community consistently with the server.
 */
export interface FleetConfiguration {
  features: FleetFeatureState;
  policy: FleetPolicy;
}

/**
 * The feature state assumed before the server has answered, or when it cannot.
 *
 * Everything off. A Fleet control that appeared and then vanished would be
 * worse than one that arrives a moment late, and a client that assumed the
 * feature was on would offer a page the server will refuse.
 */
export const FLEET_FEATURES_DISABLED: FleetFeatureState = {
  isEnabled: false,
  registrationEnabled: false,
  importsEnabled: false,
  chatEnabled: false,
};
