/**
 * Where each actor's signed-in session is kept.
 *
 * One file per actor, under the gitignored reports directory. A second
 * browser must not write the same file while the first is still reading it,
 * so the name includes the actor and not a single shared session.
 */

export function storageStateFor(code: string): string {
  if (!/^[A-Z]+$/.test(code)) {
    throw new Error(`Actor code "${code}" cannot name a storage file.`);
  }

  return `reports/playwright/auth/${code}.json`;
}

/** The demonstration member. Custom Tracking journeys sign in as them. */
export const MEMBER_STORAGE_STATE = storageStateFor('M');
