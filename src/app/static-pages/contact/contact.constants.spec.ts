import { CONTACT_TOPICS } from './contact.constants';

describe('contact.constants', () => {
  it('should export CONTACT_TOPICS with expected topic options', () => {
    expect(CONTACT_TOPICS).toBeDefined();
    expect(Array.isArray(CONTACT_TOPICS)).toBe(true);
    expect(CONTACT_TOPICS.length).toBeGreaterThan(0);
    CONTACT_TOPICS.forEach(option => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(typeof option.value).toBe('string');
      expect(typeof option.label).toBe('string');
    });
  });

  it('should include volunteer, developer, feedback, question, other', () => {
    const values = CONTACT_TOPICS.map(o => o.value);
    expect(values).toContain('volunteer');
    expect(values).toContain('developer');
    expect(values).toContain('feedback');
    expect(values).toContain('question');
    expect(values).toContain('other');
  });
});
