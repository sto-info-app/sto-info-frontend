/**
 * One of the places a Storytime work carries artwork.
 *
 * Mirrors the server's slot list. Everything that differs between a Story
 * banner and a Character portrait — the shape it is cropped to, the size a
 * source must reach, the encoding it is sent as — hangs off this rather than
 * being repeated at each editor.
 */
export enum StorytimeImageSlot {
  STORY_BANNER = 'STORY_BANNER',
  STORY_PROFILE = 'STORY_PROFILE',
  CHAPTER_COVER = 'CHAPTER_COVER',
  CHARACTER_PORTRAIT = 'CHARACTER_PORTRAIT',
  ARC_BANNER = 'ARC_BANNER',
  ARC_PROFILE = 'ARC_PROFILE',
  SPOTLIGHT_OVERRIDE = 'SPOTLIGHT_OVERRIDE',
}

/** Everything an editor needs to know about one artwork slot. */
export interface StorytimeImageSpec {
  /** What the slot is called where a creator is asked to fill it. */
  readonly label: string;
  /** Why it is there and where it is shown, in one sentence. */
  readonly guidance: string;
  /** The shape the crop is locked to, as width divided by height. */
  readonly aspectRatio: number;
  /** How that shape is described to a creator. */
  readonly aspectLabel: string;
  /** The narrowest crop the server will accept. */
  readonly minimumWidth: number;
  /** The shortest crop the server will accept. */
  readonly minimumHeight: number;
  /** The encoding the crop is sent as. */
  readonly outputFormat: 'png' | 'jpeg';
  /** The path segment the artwork endpoints live under. */
  readonly endpoint: string;
}

/**
 * The rules each artwork slot is held to.
 *
 * The minimums match the largest Cloudflare variant each slot is delivered
 * through, and the server enforces exactly these numbers. They are stated here
 * so a crop that is too small is refused while the creator is still looking at
 * the picture, rather than after an upload that was never going to be kept —
 * not so that the browser can be trusted to have checked.
 */
export const STORYTIME_IMAGE_SPECS: Record<
  StorytimeImageSlot,
  StorytimeImageSpec
> = {
  [StorytimeImageSlot.STORY_BANNER]: {
    label: 'Story banner',
    guidance:
      'The wide header across the top of the Story page. A quiet image works best: the title sits over it.',
    aspectRatio: 5 / 1,
    aspectLabel: '5:1',
    minimumWidth: 2400,
    minimumHeight: 480,
    outputFormat: 'jpeg',
    endpoint: 'banner-image',
  },
  [StorytimeImageSlot.STORY_PROFILE]: {
    label: 'Story profile image',
    guidance:
      'The square image that identifies the Story in listings, cards and Arc pages. It is shown small, so a single clear subject reads better than a scene.',
    aspectRatio: 1,
    aspectLabel: 'square',
    minimumWidth: 300,
    minimumHeight: 300,
    outputFormat: 'png',
    endpoint: 'profile-image',
  },
  [StorytimeImageSlot.CHAPTER_COVER]: {
    label: 'Chapter cover',
    guidance:
      'Shown at the head of the Chapter, on its card, and as the preview when somebody shares the link.',
    aspectRatio: 16 / 9,
    aspectLabel: '16:9',
    minimumWidth: 1920,
    minimumHeight: 1080,
    outputFormat: 'jpeg',
    endpoint: 'cover-image',
  },
  [StorytimeImageSlot.CHARACTER_PORTRAIT]: {
    label: 'Character portrait',
    guidance:
      'Shown on the Character page and in the cast list. Taller than it is wide, so a head-and-shoulders crop suits it.',
    aspectRatio: 2 / 3,
    aspectLabel: '2:3',
    minimumWidth: 400,
    minimumHeight: 600,
    outputFormat: 'png',
    endpoint: 'portrait-image',
  },
  [StorytimeImageSlot.ARC_BANNER]: {
    label: 'Arc banner',
    guidance:
      'The wide header across the top of the Arc page. A quiet image works best: the title sits over it.',
    aspectRatio: 5 / 1,
    aspectLabel: '5:1',
    minimumWidth: 2400,
    minimumHeight: 480,
    outputFormat: 'jpeg',
    endpoint: 'banner-image',
  },
  [StorytimeImageSlot.ARC_PROFILE]: {
    label: 'Arc profile image',
    guidance:
      'The square image that identifies the Arc in listings and cards. It is shown small, so keep it simple.',
    aspectRatio: 1,
    aspectLabel: 'square',
    minimumWidth: 300,
    minimumHeight: 300,
    outputFormat: 'png',
    endpoint: 'profile-image',
  },
  [StorytimeImageSlot.SPOTLIGHT_OVERRIDE]: {
    label: 'Spotlight artwork',
    guidance:
      'Shown on the Spotlight panel instead of the featured work’s own banner. Leave it empty to use the work’s banner.',
    aspectRatio: 5 / 1,
    aspectLabel: '5:1',
    minimumWidth: 2400,
    minimumHeight: 480,
    outputFormat: 'jpeg',
    endpoint: 'override-image',
  },
};

/** The longest alternative text the server accepts. */
export const STORYTIME_IMAGE_ALT_MAX_LENGTH = 300;

/**
 * How a slot's size requirement is put to a creator.
 *
 * @param slot - The slot being filled.
 * @returns A sentence naming the shape and the smallest usable picture.
 */
export function describeImageRequirement(slot: StorytimeImageSlot): string {
  const spec = STORYTIME_IMAGE_SPECS[slot];

  return `${spec.aspectLabel}, at least ${spec.minimumWidth} by ${spec.minimumHeight} pixels.`;
}
