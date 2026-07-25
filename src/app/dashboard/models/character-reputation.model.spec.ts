import { describe, expect, it } from '@jest/globals';
import {
  REPUTATION_MAX_TIER,
  REPUTATION_TIER_XP,
  REPUTATION_UNLOCK_LEVEL,
} from './character-reputation.model';

describe('character-reputation.model', () => {
  it('defines the reputation progression limits', () => {
    expect(REPUTATION_MAX_TIER).toBe(6);
    expect(REPUTATION_UNLOCK_LEVEL).toBe(50);
    expect(REPUTATION_TIER_XP).toEqual({
      1: 2500,
      2: 10000,
      3: 25000,
      4: 50000,
      5: 100000,
      6: 250000,
    });
  });
});
