import { readFileSync } from 'fs';
import { join } from 'path';

import {
  LCARS_COLOUR_VARIABLES,
  LCARS_COLOURS,
} from './lcars-colours.constants';

// The Sass file every colour is defined in. The constants only mirror it.
const VARIABLES = readFileSync(
  join(__dirname, '..', '..', '..', 'styles', '_lcars-variables.scss'),
  'utf8',
);

/** The literal a Sass variable is set to, following any alias. */
function sassValue(name: string): string | undefined {
  const match = new RegExp(`^\\$${name}:\\s*([^;]+);`, 'm').exec(VARIABLES);
  const value = match?.[1].trim();
  return value?.startsWith('$') ? sassValue(value.slice(1)) : value;
}

describe('LCARS_COLOURS', () => {
  it('names a Sass variable for every colour', () => {
    expect(Object.keys(LCARS_COLOUR_VARIABLES).sort()).toEqual(
      Object.keys(LCARS_COLOURS).sort(),
    );
  });

  it.each(Object.entries(LCARS_COLOURS))(
    'gives %s the value its Sass variable defines',
    (key, colour) => {
      const variable =
        LCARS_COLOUR_VARIABLES[key as keyof typeof LCARS_COLOURS];
      expect(sassValue(variable)).toBe(colour);
    },
  );

  it('finds nothing for a variable the Sass file does not define', () => {
    expect(sassValue('lcars-not-a-colour')).toBeUndefined();
  });
});
