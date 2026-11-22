import {
  FleetScopeRole,
  ScopeCapabilityEffect,
  ScopeGovernanceAction,
  ScopeGovernanceActionKind,
} from 'src/app/models/fleet-governance.models';

import {
  capabilityNamer,
  describeGovernanceAction,
  nameOf,
} from './governance.utils';

/**
 * Builds a change.
 *
 * @param overrides - Fields to override.
 * @returns The change.
 */
function change(
  overrides: Partial<ScopeGovernanceAction> = {},
): ScopeGovernanceAction {
  return {
    id: 'action-1',
    action: ScopeGovernanceActionKind.ROLE_ASSIGNED,
    actorName: 'Owner',
    asSiteAdmin: false,
    subjectName: 'Kira',
    role: null,
    capability: null,
    clearedEffect: null,
    reason: null,
    automatic: false,
    createdAt: '2026-09-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('governance utils', () => {
  describe('nameOf', () => {
    it('gives a username back, and describes its absence', () => {
      expect(nameOf('Kira')).toBe('Kira');
      expect(nameOf(null)).toBe('An account with no username');
    });
  });

  describe('capabilityNamer', () => {
    it('names a code the scope offers, and gives any other back', () => {
      const name = capabilityNamer([
        { code: 'news.write', name: 'Write news', description: '' },
      ]);

      expect(name('news.write')).toBe('Write news');
      expect(name('retired.capability')).toBe('retired.capability');
    });
  });

  describe('describeGovernanceAction', () => {
    const named = (code: string): string => `<${code}>`;

    // FC-039: what ended by itself, because of something else, says so and
    // names nobody as having done it.
    it.each<[Partial<ScopeGovernanceAction>, string]>([
      [
        {
          action: ScopeGovernanceActionKind.ROLE_WITHDRAWN,
          role: FleetScopeRole.OFFICER,
        },
        'Kira’s role as an Officer ended.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_CLEARED,
          capability: 'news.write',
          clearedEffect: ScopeCapabilityEffect.GRANT,
        },
        'Kira’s grant of “<news.write>” ended.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_CLEARED,
          capability: 'news.write',
          clearedEffect: ScopeCapabilityEffect.DENY,
        },
        'The denial of “<news.write>” to Kira ended.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_CLEARED,
          subjectName: null,
          role: FleetScopeRole.OFFICER,
          capability: 'news.write',
        },
        '“<news.write>” for every Officer ended.',
      ],
    ])('says what ended by itself: %j', (overrides, sentence) => {
      expect(
        describeGovernanceAction(
          change({ ...overrides, actorName: null, automatic: true }),
          named,
        ),
      ).toBe(sentence);
    });

    it.each<[Partial<ScopeGovernanceAction>, string]>([
      [{ role: FleetScopeRole.ADMIN }, 'Owner made Kira an Admin.'],
      [{ role: FleetScopeRole.OFFICER }, 'Owner made Kira an Officer.'],
      [{ role: FleetScopeRole.OWNER }, 'Owner made Kira the Owner.'],
      [
        {
          action: ScopeGovernanceActionKind.ROLE_WITHDRAWN,
          role: FleetScopeRole.ADMIN,
        },
        'Owner withdrew Kira’s role as an Admin.',
      ],
      [
        { action: ScopeGovernanceActionKind.ROLE_WITHDRAWN },
        'Owner withdrew Kira’s role as a Member.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_GRANTED,
          subjectName: null,
          role: FleetScopeRole.OFFICER,
          capability: 'news.write',
        },
        'Owner gave every Officer “<news.write>”.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_GRANTED,
          capability: 'news.write',
        },
        'Owner granted “<news.write>” to Kira.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_GRANTED,
          subjectName: null,
          capability: 'news.write',
        },
        'Owner granted “<news.write>” to An account with no username.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_DENIED,
          capability: 'news.write',
        },
        'Owner denied “<news.write>” to Kira.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_CLEARED,
          subjectName: null,
          role: FleetScopeRole.OFFICER,
          capability: 'news.write',
        },
        'Owner took “<news.write>” from every Officer.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_CLEARED,
          capability: 'news.write',
          clearedEffect: ScopeCapabilityEffect.DENY,
        },
        'Owner lifted the denial of “<news.write>” to Kira.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.CAPABILITY_CLEARED,
          capability: 'news.write',
          clearedEffect: ScopeCapabilityEffect.GRANT,
        },
        'Owner took “<news.write>” from Kira.',
      ],
      [
        { action: ScopeGovernanceActionKind.OWNERSHIP_OFFERED },
        'Owner offered ownership to Kira.',
      ],
      [
        { action: ScopeGovernanceActionKind.OWNERSHIP_ACCEPTED },
        'Owner accepted ownership from Kira.',
      ],
      [
        { action: ScopeGovernanceActionKind.OWNERSHIP_DECLINED },
        'Owner declined the offer of ownership.',
      ],
      [
        { action: ScopeGovernanceActionKind.OWNERSHIP_CANCELLED },
        'Owner cancelled the offer of ownership to Kira.',
      ],
      [
        {
          action: ScopeGovernanceActionKind.OWNERSHIP_REASSIGNED,
          asSiteAdmin: true,
        },
        'A site administrator made Kira the Owner.',
      ],
      [
        { action: ScopeGovernanceActionKind.CLOSED, actorName: null },
        'An account with no username closed it.',
      ],
      [
        { action: ScopeGovernanceActionKind.SUSPENDED, asSiteAdmin: true },
        'A site administrator suspended it: nothing here may change until it is reinstated.',
      ],
      [
        { action: ScopeGovernanceActionKind.REINSTATED, asSiteAdmin: true },
        'A site administrator lifted its suspension.',
      ],
    ])('describes %p', (overrides, sentence) => {
      expect(describeGovernanceAction(change(overrides), named)).toBe(sentence);
    });
  });
});
