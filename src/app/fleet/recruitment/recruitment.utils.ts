import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

import { SwitcherAccount } from 'src/app/dashboard/models/account-switcher.model';

/** One of the reader's Characters, as a recruitment picker offers it. */
export interface RecruitmentCharacterOption {
  readonly id: string;
  /** Name@handle, as the game and every roster write it. */
  readonly label: string;
}

/** The refusals whose message the server writes for the person refused. */
const EXPLAINED_REFUSALS: readonly number[] = [
  HttpStatusCode.BadRequest,
  HttpStatusCode.Forbidden,
  HttpStatusCode.NotFound,
  HttpStatusCode.Conflict,
];

/**
 * The reader's Characters that could stand for them in a Fleet on one
 * platform.
 *
 * Only the platform is checked here, because it is the one thing the list
 * knows: level and faction are the server's to check, and its refusal says
 * which was short.
 *
 * @param accounts - The reader's accounts, each with its Characters.
 * @param platformName - The Fleet's platform.
 * @returns The Characters, in the order the accounts list them.
 */
export function recruitmentCharactersOf(
  accounts: readonly SwitcherAccount[],
  platformName: string,
): RecruitmentCharacterOption[] {
  return accounts
    .filter(account => account.platformName === platformName)
    .flatMap(account =>
      account.characters.map(character => ({
        id: character.id,
        label: `${character.handle}@${account.handle}`,
      })),
    );
}

/**
 * Says why a recruitment request was refused.
 *
 * The server's sentence where it wrote one for the person refused — a
 * requirement not met, a form that changed, somebody already a member — and
 * the caller's own words for anything else, such as a server that did not
 * answer.
 *
 * @param error - What came back.
 * @param fallback - What to say otherwise.
 * @returns The sentence to show.
 */
export function recruitmentRefusalOf(error: unknown, fallback: string): string {
  if (
    !(error instanceof HttpErrorResponse) ||
    !EXPLAINED_REFUSALS.includes(error.status)
  ) {
    return fallback;
  }

  const message: unknown = (error.error as { message?: unknown } | null)
    ?.message;

  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (
    Array.isArray(message) &&
    message.length > 0 &&
    message.every(part => typeof part === 'string')
  ) {
    return message.join(' ');
  }

  return fallback;
}
