import {
  PERMISSION_EFFECT_LABELS,
  PERMISSIONS,
  PermissionEffect,
} from './access-control.models';

describe('access-control.models', () => {
  it('should expose expected permission effect enum values', () => {
    expect(PermissionEffect.GRANT).toBe('GRANT');
    expect(PermissionEffect.DENY).toBe('DENY');
  });

  it('should map the effect labels', () => {
    expect(PERMISSION_EFFECT_LABELS).toEqual({
      [PermissionEffect.GRANT]: 'Grant',
      [PermissionEffect.DENY]: 'Deny',
    });
  });

  it('should keep the codes the management pages are gated by', () => {
    expect(PERMISSIONS.STORYTIME_MODERATE).toBe('storytime.moderate');
    expect(PERMISSIONS.STORYTIME_SPOTLIGHT_MANAGE).toBe(
      'storytime.spotlight.manage',
    );
    expect(PERMISSIONS.STORYTIME_TAG_MANAGE).toBe('storytime.tag.manage');
    expect(PERMISSIONS.STORYTIME_CONFIGURE).toBe('storytime.configure');
  });
});
