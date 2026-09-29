/** What an image estate run does (FC-040). */
export enum ImageEstateRunKind {
  COPY = 'COPY',
  UNDO = 'UNDO',
  RETIRE = 'RETIRE',
}

/** Where a run is. */
export enum ImageEstateRunState {
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

/** How each kind of run is named on the page. */
export const IMAGE_ESTATE_RUN_LABELS: Readonly<
  Record<ImageEstateRunKind, string>
> = {
  [ImageEstateRunKind.COPY]: 'Copy to private',
  [ImageEstateRunKind.UNDO]: 'Undo copies',
  [ImageEstateRunKind.RETIRE]: 'Retire old copies',
};

/** How each state of a run reads. */
export const IMAGE_ESTATE_STATE_LABELS: Readonly<
  Record<ImageEstateRunState, string>
> = {
  [ImageEstateRunState.RUNNING]: 'Running',
  [ImageEstateRunState.PAUSED]: 'Paused',
  [ImageEstateRunState.DONE]: 'Finished',
  [ImageEstateRunState.FAILED]: 'Stopped by an error',
};

/** One run: a copy, an undo or a retirement. */
export interface ImageEstateRun {
  readonly id: string;
  readonly kind: ImageEstateRunKind;
  readonly state: ImageEstateRunState;
  /** registered, copied, undone, retired and failed, as far as they go. */
  readonly counts: Readonly<Record<string, number>>;
  readonly lastError: string | null;
  readonly createdAt: string;
  readonly finishedAt: string | null;
}

/** One column's references, counted. */
export interface ImageReferenceCount {
  readonly table: string;
  readonly column: string;
  readonly rows: number;
  readonly registered: number;
  readonly r2: number;
}

/** Cloudflare's listing for this environment, against the registry. */
export interface ImageCloudflareCount {
  readonly listed: number;
  readonly private: number;
  readonly public: number;
  readonly orphans: number;
  readonly orphanIds: readonly string[];
  readonly awaitingRetirement: number;
  readonly missing: number;
  readonly missingAssetIds: readonly string[];
  readonly elsewhere: number;
}

/** What an inventory found. */
export interface ImageInventoryReport {
  readonly references: readonly ImageReferenceCount[];
  readonly registry: readonly {
    readonly kind: string;
    readonly state: string;
    readonly storage: string;
    readonly deliveryPrivate: boolean;
    readonly count: number;
  }[];
  readonly steps: Readonly<Record<string, number>>;
  /** Null when Cloudflare's listing could not be read. */
  readonly cloudflare: ImageCloudflareCount | null;
}

/** One inventory. */
export interface ImageInventory {
  readonly id: string;
  readonly state: 'RUNNING' | 'DONE' | 'FAILED';
  readonly report: ImageInventoryReport | null;
  readonly error: string | null;
  readonly createdAt: string;
  readonly finishedAt: string | null;
}

/** Where the image estate stands. */
export interface ImageEstateStatus {
  /** Whether addresses are signed, which a copy needs. */
  readonly signingEnabled: boolean;
  /** Published pictures still public. */
  readonly remaining: number;
  /** Each picture copy, by state. */
  readonly steps: Readonly<Record<string, number>>;
  readonly run: ImageEstateRun | null;
  readonly inventory: ImageInventory | null;
}
