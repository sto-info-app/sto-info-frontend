/**
 * Who the journeys sign in as.
 *
 * A seeded demonstration member rather than one created here: it already has
 * several STO accounts and characters, which is what most of these journeys
 * need and what would otherwise have to be built by duplicating the seeding
 * migration's knowledge of factions, species and classes.
 *
 * The password is never stored in this repository. It is the seed password the
 * backend was given, and it reaches the harness through the environment.
 */

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is not set. The end-to-end journeys sign in as a real member; see e2e/README.md for how to supply it.`,
    );
  }

  return value;
}

export const member = {
  get email(): string {
    return process.env['E2E_EMAIL'] ?? 'demo-user-014@example.com';
  },

  get username(): string {
    return process.env['E2E_USERNAME'] ?? 'demo-user-014';
  },

  get password(): string {
    return required('E2E_PASSWORD');
  },

  /** An STO account of theirs that is itself marked publicly visible. */
  get publicAccount(): string {
    return process.env['E2E_PUBLIC_ACCOUNT'] ?? 'demo-014-01';
  },

  /** One that is not, which is what makes the account gate testable. */
  get privateAccount(): string {
    return process.env['E2E_PRIVATE_ACCOUNT'] ?? 'demo-014-02';
  },
};

/** Where an anonymous visitor would look for one of their accounts. */
export function publicAccountPath(accountSlug: string): string {
  return `/community/registry/profiles/${member.username}/${accountSlug}`;
}
