import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * How long a name the server will hold may be, and how the forms say so.
 *
 * The server measures in codepoints rather than UTF-16 units, so `'𝕬'` is
 * one character rather than two. `Validators.maxLength` and the `maxlength`
 * attribute both count units, and on their own would refuse a name the
 * server accepts — or, set to the server's figure, silently halve the budget
 * for anything outside the basic plane.
 */

/**
 * The longest exact in-game Fleet or Armada name, in codepoints.
 *
 * The server's `EXACT_GAME_NAME_MAX_CODEPOINTS` (ADR-0003). Measured without
 * trimming, because an edge space is stored and displayed and so has to fit
 * in the same budget as any other character.
 */
export const EXACT_GAME_NAME_MAX_CODEPOINTS = 64;

/**
 * The longest Community name, in codepoints once trimmed.
 *
 * The server trims a Community name before measuring it, and so does the
 * form before sending it, so the spaces at either end cost nothing here.
 */
export const COMMUNITY_NAME_MAX_CODEPOINTS = 120;

/**
 * The longest search a directory accepts.
 *
 * The server's `MAX_DIRECTORY_SEARCH_LENGTH`: the longest name any scope
 * holds, which is a Community's, so every name can be searched for in full.
 * The server counts a character outside the basic plane as one and the
 * box's `maxlength` counts it as two, so the box never sends a term the
 * server refuses. A name written mostly in such characters can be cut short
 * in the box, but a search matches any part of a name, and the part that
 * fits still finds it.
 */
export const DIRECTORY_SEARCH_MAX_LENGTH = COMMUNITY_NAME_MAX_CODEPOINTS;

/** The key a name over its budget is reported under. */
export const MAX_CODEPOINTS_ERROR = 'maxCodepoints';

/** Shown beside an in-game name that is over the server's budget. */
export const EXACT_GAME_NAME_TOO_LONG =
  `A name can be at most ${EXACT_GAME_NAME_MAX_CODEPOINTS} characters, ` +
  'counting any spaces at either end.';

/** Shown beside a Community name that is over the server's budget. */
export const COMMUNITY_NAME_TOO_LONG = `A Community name can be at most ${COMMUNITY_NAME_MAX_CODEPOINTS} characters.`;

/**
 * Counts a string in codepoints rather than UTF-16 units, as the server does.
 *
 * @param value - The string to measure.
 * @returns The number of Unicode codepoints.
 */
export function countCodepoints(value: string): number {
  return [...value].length;
}

/**
 * The `maxlength` to put on an input whose rule is a codepoint budget.
 *
 * The attribute counts UTF-16 units and cannot be told otherwise, so it is a
 * ceiling rather than the rule: room for one character more than the budget
 * even if every one of them is astral. That way anything the browser has to
 * clip is still too long, and the validator says so, rather than an exact
 * name being quietly shortened into a different one that passes.
 *
 * @param maxCodepoints - The budget the validator enforces.
 * @returns The attribute's value.
 */
export function inputCeilingFor(maxCodepoints: number): number {
  return (maxCodepoints + 1) * 2;
}

/**
 * Refuses a value longer than a codepoint budget.
 *
 * An empty value passes, so `Validators.required` stays the one that says a
 * name is missing.
 *
 * @param max - The most codepoints allowed.
 * @param trim - Whether to measure the value trimmed, for a field the server
 *   trims before it measures.
 * @returns The validator.
 */
export function maxCodepointsValidator(max: number, trim = false): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;

    if (typeof value !== 'string') {
      return null;
    }

    const actual = countCodepoints(trim ? value.trim() : value);

    return actual > max ? { [MAX_CODEPOINTS_ERROR]: { max, actual } } : null;
  };
}
