import * as Module from './regex-patterns.constants';

describe('regex-patterns.constants (placeholder)', () => {
  it('should load', () => {
    expect(Module).toBeDefined();
  });

  it('should match markdown headings and capture level/text', () => {
    const match = Module.MARKDOWN_HEADING_PATTERN.exec('### Patch Notes');

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('###');
    expect(match?.[2]).toBe('Patch Notes');
  });

  it('should reject headings with excessive title length', () => {
    const longTitle = 'x'.repeat(4097);

    expect(Module.MARKDOWN_HEADING_PATTERN.test(`# ${longTitle}`)).toBe(false);
  });
});
