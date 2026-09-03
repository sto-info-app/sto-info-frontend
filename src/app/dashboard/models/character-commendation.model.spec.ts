import { describe, expect, it } from '@jest/globals';
import {
  COMMENDATION_ALLEGIANCES,
  COMMENDATION_KLINGON_ALLEGIANCE,
  COMMENDATION_MAX_RANK,
  COMMENDATION_RANK_CXP,
  COMMENDATION_UNLOCK_LEVEL,
} from './character-commendation.model';

describe('character-commendation.model', () => {
  it('defines the commendation progression limits', () => {
    expect(COMMENDATION_MAX_RANK).toBe(4);
    expect(COMMENDATION_UNLOCK_LEVEL).toBe(11);
    expect(COMMENDATION_RANK_CXP).toEqual({
      1: 2500,
      2: 15000,
      3: 50000,
      4: 100000,
    });
  });

  it('defines the allegiances that resolve the catalogue', () => {
    expect(COMMENDATION_ALLEGIANCES).toEqual(['Federation', 'Klingon']);
    expect(COMMENDATION_KLINGON_ALLEGIANCE).toBe('Klingon');
  });
});
