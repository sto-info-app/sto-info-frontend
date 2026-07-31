import { describe, expect, it } from '@jest/globals';
import {
  RD_BASE_RARITY,
  RD_MAX_LEVEL,
  RD_QUALITY_MILESTONES,
  RD_UNLOCK_LEVEL,
} from './character-rd.model';

describe('character-rd.model', () => {
  it('defines the R&D progression limits and quality milestones', () => {
    expect(RD_MAX_LEVEL).toBe(20);
    expect(RD_UNLOCK_LEVEL).toBe(15);
    expect(RD_BASE_RARITY).toBe('common');
    expect(RD_QUALITY_MILESTONES).toEqual([
      { level: 5, quality: 'Uncommon', rarity: 'uncommon' },
      { level: 10, quality: 'Rare', rarity: 'rare' },
      { level: 15, quality: 'Very Rare', rarity: 'very-rare' },
      { level: 20, quality: 'Ultra Rare', rarity: 'ultra-rare' },
    ]);
  });
});
