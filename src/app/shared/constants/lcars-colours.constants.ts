/**
 * LCARS colours for code that needs a colour as a value rather than a class:
 * an SVG chart's segment fills, or an accent worked out per catalogue item.
 * ---
 * `src/styles/_lcars-variables.scss` stays the single place a colour is
 * defined. Each entry here mirrors one of its Sass variables, named in the
 * comment beside it, and `lcars-colours.constants.spec.ts` fails if the two
 * ever disagree, so a palette change cannot leave the code behind. Read a
 * runtime `--lcars-*` property instead wherever the colour is applied by CSS.
 */
export const LCARS_COLOURS = {
  /** `$a11y-white` - pure white, the ink on a dark accent. */
  a11yWhite: '#fff',
  /** `$lcars-black` - the page's near-black, the ink on a light accent. */
  black: '#0d0d0d',
  /** `$lcars-perano` */
  perano: '#9cf',
  /** `$lcars-bluey` */
  bluey: '#78f',
  /** `$lcars-orange` */
  orange: '#f70',
  /** `$lcars-green` */
  green: '#3c9',
  /** `$lcars-violet` */
  violet: '#94f',
  /** `$lcars-gold` */
  gold: '#fa0',
  /** `$lcars-cool` */
  cool: '#58f',
  /** `$lcars-tangerine` */
  tangerine: '#f83',
  /** `$lcars-chart-aqua` - the pale aqua the smart chart cycles through. */
  chartAqua: '#aff',
  /** `$lcars-sunflower` */
  sunflower: '#fc6',
} as const;

/** The Sass variable each {@link LCARS_COLOURS} entry mirrors. */
export const LCARS_COLOUR_VARIABLES: Readonly<
  Record<keyof typeof LCARS_COLOURS, string>
> = {
  a11yWhite: 'a11y-white',
  black: 'lcars-black',
  perano: 'lcars-perano',
  bluey: 'lcars-bluey',
  orange: 'lcars-orange',
  green: 'lcars-green',
  violet: 'lcars-violet',
  gold: 'lcars-gold',
  cool: 'lcars-cool',
  tangerine: 'lcars-tangerine',
  chartAqua: 'lcars-chart-aqua',
  sunflower: 'lcars-sunflower',
};
