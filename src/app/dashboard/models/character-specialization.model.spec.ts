import { describe, expect, it } from '@jest/globals';
import {
  SPECIALIZATION_PRIMARY_MAX_POINTS,
  SPECIALIZATION_QUALIFICATION_POINTS,
  SPECIALIZATION_SECONDARY_MAX_POINTS,
  SPECIALIZATION_UNLOCK_LEVEL,
} from './character-specialization.model';

describe('character-specialization.model', () => {
  it('defines the specialization progression limits', () => {
    expect(SPECIALIZATION_PRIMARY_MAX_POINTS).toBe(30);
    expect(SPECIALIZATION_SECONDARY_MAX_POINTS).toBe(15);
    expect(SPECIALIZATION_QUALIFICATION_POINTS).toBe(10);
    expect(SPECIALIZATION_UNLOCK_LEVEL).toBe(50);
  });
});
