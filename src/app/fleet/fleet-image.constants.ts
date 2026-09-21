/**
 * The two pictures a Community, Fleet or Armada carries.
 *
 * Mirrors the server's slot list. Everything that differs between the wide
 * header and the square badge — the shape, the size a crop must reach, the
 * encoding it is sent as — hangs off this rather than being restated at each
 * place one is set.
 */
export enum FleetImageSlot {
  BANNER = 'BANNER',
  EMBLEM = 'EMBLEM',
}

/** Everything the artwork dialogue needs to know about one slot. */
export interface FleetImageSpec {
  /** What the slot is called where somebody is asked to fill it. */
  readonly label: string;
  /** Why it is there and where it is shown, in one sentence. */
  readonly guidance: string;
  /** The shape the crop is locked to, as width divided by height. */
  readonly aspectRatio: number;
  /** How that shape is described to somebody filling it. */
  readonly aspectLabel: string;
  /** The narrowest crop the server will accept. */
  readonly minimumWidth: number;
  /** The shortest crop the server will accept. */
  readonly minimumHeight: number;
  /** The width at which the largest rendering stops being enlarged. */
  readonly recommendedWidth: number;
  /** The height at which the largest rendering stops being enlarged. */
  readonly recommendedHeight: number;
  /** The encoding the crop is sent as. */
  readonly outputFormat: 'png' | 'jpeg';
  /** The path segment the slot's endpoints live under. */
  readonly endpoint: string;
}

/**
 * The rules each slot is held to, matching the server's.
 *
 * Two sizes, because they answer different questions. A crop that reaches
 * the recommended size is never enlarged anywhere it is shown; below the
 * minimum, even the compact rendering would be upscaled and the server
 * refuses it. Between the two it is accepted with a warning — whoever chose
 * the picture can see it and is better placed than a dialogue to decide
 * whether the softness matters.
 *
 * Stated here so both the warning and the refusal happen while somebody is
 * still looking at the picture, rather than after an upload that was never
 * going to be kept — not so that the browser can be trusted to have checked.
 *
 * The banner is minimum and recommended alike. Unlike a Story banner, which
 * has a smaller variant to fall back on, a Fleet banner is delivered at one
 * size: there is no width at which it is usable but soft.
 */
export const FLEET_IMAGE_SPECS: Record<FleetImageSlot, FleetImageSpec> = {
  [FleetImageSlot.BANNER]: {
    label: 'Banner',
    guidance:
      'The wide header across the top of the page. A quiet image works ' +
      'best: the name and the emblem sit over it.',
    aspectRatio: 5 / 1,
    aspectLabel: '5:1',
    minimumWidth: 2400,
    minimumHeight: 480,
    recommendedWidth: 2400,
    recommendedHeight: 480,
    outputFormat: 'jpeg',
    endpoint: 'banner-image',
  },
  [FleetImageSlot.EMBLEM]: {
    label: 'Emblem',
    guidance:
      'The square badge identifying this in a listing. It is shown small, ' +
      'so a single clear device reads better than a scene.',
    aspectRatio: 1,
    aspectLabel: 'square',
    minimumWidth: 300,
    minimumHeight: 300,
    recommendedWidth: 512,
    recommendedHeight: 512,
    outputFormat: 'png',
    endpoint: 'emblem-image',
  },
};

/** The longest description the server accepts, and the columns hold. */
export const FLEET_IMAGE_ALT_MAX_LENGTH = 300;

/**
 * How a slot's size requirement is put to somebody filling it.
 *
 * The recommended size leads, because it is the one worth aiming at; the
 * minimum follows so that somebody holding a smaller picture knows whether
 * it will be accepted rather than going away to find another.
 *
 * @param slot - The slot being filled.
 * @returns A sentence naming the shape and both sizes.
 */
export function describeFleetImageRequirement(slot: FleetImageSlot): string {
  const spec = FLEET_IMAGE_SPECS[slot];

  if (
    spec.minimumWidth === spec.recommendedWidth &&
    spec.minimumHeight === spec.recommendedHeight
  ) {
    return (
      `${spec.aspectLabel}, ${spec.recommendedWidth} by ` +
      `${spec.recommendedHeight} pixels or larger.`
    );
  }

  return (
    `${spec.aspectLabel}, ideally ${spec.recommendedWidth} by ` +
    `${spec.recommendedHeight} pixels or larger ` +
    `(${spec.minimumWidth} by ${spec.minimumHeight} at the smallest).`
  );
}
