import { deletionConfirmation } from './custom-tracking-deletion-message.utility';

describe('deletionConfirmation', () => {
  const impact = (tabs: number, fields: number, values: number) => ({
    tabs,
    fields,
    values,
  });

  const messageFor = (
    kind: string,
    name: string,
    tabs: number,
    fields: number,
    values: number,
  ): string =>
    deletionConfirmation(kind, name, impact(tabs, fields, values)).message;

  it('names what is being deleted', () => {
    const confirmation = deletionConfirmation(
      'section',
      'Ship collection',
      impact(0, 0, 0),
    );

    expect(confirmation.title).toBe('Delete section');
    expect(confirmation.confirmText).toBe('Delete');
    expect(confirmation.cancelText).toBe('Cancel');
    expect(confirmation.message).toContain('Ship collection');
  });

  // "Delete this section" and "delete this section, four tabs, nineteen fields
  // and sixty-three answers" are different decisions.
  it('counts everything that would go with it', () => {
    expect(messageFor('section', 'Ships', 4, 19, 63)).toContain(
      'This also deletes 4 tabs, 19 fields and 63 recorded answers.',
    );
  });

  it('counts one of something without pluralising it', () => {
    expect(messageFor('tab', 'Cruisers', 1, 1, 1)).toContain(
      'This also deletes 1 tab, 1 field and 1 recorded answer.',
    );
  });

  it('leaves out what there is none of', () => {
    expect(messageFor('tab', 'Cruisers', 0, 7, 21)).toContain(
      'This also deletes 7 fields and 21 recorded answers.',
    );
  });

  it('says just the one thing where only one kind would go', () => {
    expect(messageFor('field', 'Class', 0, 0, 19)).toContain(
      'This also deletes 19 recorded answers.',
    );
  });

  // Otherwise a confirmation that lists nothing reads as though the counting
  // failed rather than as though there is nothing to count.
  it('says plainly when nothing else would go', () => {
    expect(messageFor('field', 'Class', 0, 0, 0)).toContain(
      'no answers have been recorded against it yet',
    );
  });

  // The retention window is what makes a deletion recoverable by asking rather
  // than lost outright, and it belongs in the sentence that asks.
  it('says how long a deletion is kept', () => {
    expect(messageFor('section', 'Ships', 1, 1, 1)).toContain('180 days');
  });

  // Angular sanitises what it renders, so this is not what stands between the
  // page and a script — it is what stops a name tearing the sentence in half.
  it('escapes a name that would otherwise break the markup', () => {
    const message = messageFor('field', '<b>Class</b> & co', 0, 0, 0);

    expect(message).toContain('&lt;b&gt;Class&lt;/b&gt; &amp; co');
    expect(message).not.toContain('<b>Class</b>');
  });
});
