import { ModeratedUser } from '../../models/moderation.models';
import {
  isMemberNamedByEmail,
  memberDisplayName,
  memberRoleLabel,
  memberRoleModifier,
} from './member-role.utils';

/**
 * Builds a member fixture.
 *
 * @param overrides - Fields to override on the fixture.
 * @returns A member-shaped test fixture.
 */
function buildMember(overrides: Partial<ModeratedUser> = {}): ModeratedUser {
  return {
    id: 'member-1',
    email: 'member@example.com',
    username: 'member',
    role: 'USER',
    isAccountDisabled: false,
    disabledAt: null,
    disabledReason: null,
    lastLoginAt: null,
    createdAt: '2026-01-14T09:21:00.000Z',
    openReportCount: 0,
    ...overrides,
  };
}

describe('Member Role Utils', () => {
  describe('memberDisplayName', () => {
    it('names a member by their username', () => {
      expect(memberDisplayName(buildMember())).toBe('member');
    });

    it('falls back to the email when a member never set a username', () => {
      expect(memberDisplayName(buildMember({ username: null }))).toBe(
        'member@example.com',
      );
    });
  });

  describe('isMemberNamedByEmail', () => {
    it('is true only when the account has no username', () => {
      expect(isMemberNamedByEmail(buildMember({ username: null }))).toBe(true);
      expect(isMemberNamedByEmail(buildMember())).toBe(false);
    });
  });

  describe('memberRoleModifier', () => {
    it('maps the roles the API recognises', () => {
      expect(memberRoleModifier(buildMember({ role: 'ADMIN' }))).toBe('admin');
      expect(memberRoleModifier(buildMember({ role: 'USER' }))).toBe('user');
      expect(
        memberRoleModifier(buildMember({ role: 'STORYTIME_CURATOR' })),
      ).toBe('storytime-curator');
    });

    it('reads a role in any casing', () => {
      expect(memberRoleModifier(buildMember({ role: 'admin' }))).toBe('admin');
    });

    it('falls back to neutral for a role it does not know', () => {
      expect(memberRoleModifier(buildMember({ role: 'ARCHIVIST' }))).toBe(
        'other',
      );
      expect(memberRoleModifier(buildMember({ role: '' }))).toBe('other');
    });
  });

  describe('memberRoleLabel', () => {
    it('upper-cases the role and spells underscores as spaces', () => {
      expect(memberRoleLabel(buildMember({ role: 'admin' }))).toBe('ADMIN');
      expect(memberRoleLabel(buildMember({ role: 'storytime_curator' }))).toBe(
        'STORYTIME CURATOR',
      );
    });

    it('labels an account with no role at all', () => {
      expect(memberRoleLabel(buildMember({ role: '' }))).toBe('UNKNOWN');
    });
  });
});
