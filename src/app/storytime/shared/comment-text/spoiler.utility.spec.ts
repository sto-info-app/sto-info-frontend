import { SPOILER_HINT, SPOILER_MARKER, splitSpoilers } from './spoiler.utility';

describe('splitSpoilers', () => {
  it('leaves a comment with no spoilers as one ordinary piece', () => {
    expect(splitSpoilers('A fine chapter.')).toEqual([
      { text: 'A fine chapter.', isSpoiler: false },
    ]);
  });

  it('gives nothing back for an empty comment', () => {
    expect(splitSpoilers('')).toEqual([]);
  });

  it('cuts a spoiler out of the words around it, without its bars', () => {
    expect(splitSpoilers('I did not see ||the twist|| coming.')).toEqual([
      { text: 'I did not see ', isSpoiler: false },
      { text: 'the twist', isSpoiler: true },
      { text: ' coming.', isSpoiler: false },
    ]);
  });

  it('keeps two spoilers in one sentence apart', () => {
    expect(splitSpoilers('||Kirk|| and ||Spock||')).toEqual([
      { text: 'Kirk', isSpoiler: true },
      { text: ' and ', isSpoiler: false },
      { text: 'Spock', isSpoiler: true },
    ]);
  });

  it('lets a spoiler run across lines', () => {
    expect(splitSpoilers('||one\ntwo||')).toEqual([
      { text: 'one\ntwo', isSpoiler: true },
    ]);
  });

  it('keeps the spaces inside a spoiler exactly as typed', () => {
    expect(splitSpoilers('|| he lives ||')).toEqual([
      { text: ' he lives ', isSpoiler: true },
    ]);
  });

  it('leaves bars that are never closed as the text they are', () => {
    expect(splitSpoilers('It was || all a dream')).toEqual([
      { text: 'It was || all a dream', isSpoiler: false },
    ]);
  });

  it('leaves bars around nothing but spaces as typed, in one piece', () => {
    expect(splitSpoilers('Before ||   || after ||x||')).toEqual([
      { text: 'Before ||   || after ', isSpoiler: false },
      { text: 'x', isSpoiler: true },
    ]);
  });

  it('leaves four bars in a row as typed', () => {
    expect(splitSpoilers('a |||| b')).toEqual([
      { text: 'a |||| b', isSpoiler: false },
    ]);
  });

  it('quotes the marker in the hint as it is typed', () => {
    expect(SPOILER_HINT).toContain(
      `${SPOILER_MARKER}like this${SPOILER_MARKER}`,
    );
  });
});
