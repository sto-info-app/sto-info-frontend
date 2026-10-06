/** A site feature with a master switch on the Admin page (FC-045). */
export type FeatureSwitchKey =
  'FLEET_COMMUNITIES' | 'STORYTIME' | 'CUSTOM_TRACKING';

/** One of a feature's capability flags, which the environment sets. */
export interface FeatureSubFlag {
  /** The environment variable that sets it. */
  readonly key: string;
  /** What it lets people do, in words. */
  readonly label: string;
  /**
   * Whether the environment allows it. It takes effect only while the
   * feature is on.
   */
  readonly isEnabled: boolean;
}

/** A feature's master switch, as the server holds it now. */
export interface FeatureSwitchState {
  readonly feature: FeatureSwitchKey;
  /** The feature's name. */
  readonly label: string;
  readonly isEnabled: boolean;
  /** When the switch was last written, as an ISO 8601 instant. */
  readonly changedAt: string | null;
  /**
   * Who last changed it; null when a migration or SQL set it, or their
   * account has gone.
   */
  readonly changedByUsername: string | null;
  readonly subFlags: readonly FeatureSubFlag[];
}
