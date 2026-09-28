/** One track of a holding, where the Fleet has it now (FC-023). */
export interface FleetHoldingTrack {
  /** Stable code, such as STARBASE_MILITARY. */
  readonly code: string;
  /** Its name in game. */
  readonly name: string;
  /** Whether it is a department, rather than the holding itself. */
  readonly isDepartment: boolean;
  /** Its highest tier. The lowest is 0. */
  readonly maxTier: number;
  /** Its tier now: 0 until one is recorded. */
  readonly tier: number;
  /** When it was last recorded, or null when it never has been. */
  readonly updatedAt: string | null;
}

/** One holding, with its own track first and then its departments. */
export interface FleetHolding {
  /** Stable code, such as STARBASE. */
  readonly code: string;
  /** Its name in game. */
  readonly name: string;
  /** The STO Wiki page its tiers were read from. */
  readonly sourceUrl: string;
  /** The day that page was last edited, as YYYY-MM-DD. */
  readonly sourceEditedOn: string;
  readonly tracks: readonly FleetHoldingTrack[];
}

/** A Fleet's holdings, for whoever may see the Fleet. */
export interface FleetHoldings {
  /** The catalogue version the tiers come from. */
  readonly catalogueVersion: number;
  /** Whether the reader may record tiers here. */
  readonly mayRecord: boolean;
  readonly holdings: readonly FleetHolding[];
}

/** One track to set. */
export interface FleetHoldingTierInput {
  readonly track: string;
  readonly tier: number;
}

/** Records the tiers of one holding's tracks. */
export interface RecordFleetHoldingRequest {
  /** The tracks to set. Tracks left out stay as they are. */
  readonly tiers: readonly FleetHoldingTierInput[];
  /** Why, for the record. Optional. */
  readonly reason?: string;
}

/** One track a change moved. */
export interface FleetHoldingMove {
  readonly track: string;
  readonly trackName: string;
  readonly isDepartment: boolean;
  /** Its tier before. */
  readonly from: number;
  /** Its tier after. */
  readonly to: number;
}

/** One save of one holding. */
export interface FleetHoldingChange {
  readonly id: string;
  readonly holdingCode: string;
  readonly holdingName: string;
  readonly recordedAt: string;
  /**
   * Who recorded it: shown to the Fleet's members alone, and null to anybody
   * else, or once their account has gone.
   */
  readonly recordedBy: string | null;
  readonly reason: string | null;
  /** The holding's own track first, then its departments. */
  readonly moves: readonly FleetHoldingMove[];
}

/** A page of a Fleet's holdings history, newest first. */
export interface FleetHoldingHistoryPage {
  readonly items: readonly FleetHoldingChange[];
  /** Whether the reader is shown who recorded each change. */
  readonly recordersShown: boolean;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}
