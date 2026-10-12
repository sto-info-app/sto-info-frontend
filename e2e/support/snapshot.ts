import { MemberSnapshot, SnapshotAccount } from './backend';

/** The account in a snapshot with this handle or slug. */
export function accountBySlug(
  shot: MemberSnapshot,
  slug: string,
): SnapshotAccount {
  const account = shot.accounts.find(
    item => item.handleSlug === slug || item.handle === slug,
  );

  if (!account) {
    throw new Error(`Snapshot has no account ${slug}.`);
  }

  return account;
}

/** The publication word the restore command expects. */
export function publication(visible: boolean): 'public' | 'private' {
  return visible ? 'public' : 'private';
}

/** Notes and captain handles, which a case must leave unchanged. */
export function accountShape(account: SnapshotAccount): {
  notes: string | null;
  characters: string[];
} {
  return {
    notes: account.notes,
    characters: account.characters.map(character => character.handle),
  };
}
