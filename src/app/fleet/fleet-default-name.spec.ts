import { defaultCommunityName } from './fleet-default-name';

describe('defaultCommunityName', () => {
  it('should offer the username plus Community, possessively', () => {
    expect(defaultCommunityName('Steve')).toBe("Steve's Community");
  });

  // Modern British convention for a name, and a username may not be a name
  // at all — guessing which of the two forms it wants needs knowledge the
  // field does not have.
  it('should add an apostrophe-s even to a username ending in s', () => {
    expect(defaultCommunityName('Charles')).toBe("Charles's Community");
  });

  it('should keep a username that is not a name at all', () => {
    expect(defaultCommunityName('xX_ds9_Xx')).toBe("xX_ds9_Xx's Community");
  });

  it('should ignore the space around a username', () => {
    expect(defaultCommunityName('  Steve  ')).toBe("Steve's Community");
  });

  // Nothing to build a name from is an empty field rather than a name
  // beginning with an apostrophe.
  it.each([[null], [''], ['   ']])(
    'should offer nothing when the username is %p',
    username => {
      expect(defaultCommunityName(username)).toBe('');
    },
  );
});
