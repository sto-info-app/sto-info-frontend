import { sixPartGuide } from './help-six-part-guide';

describe('sixPartGuide', () => {
  it('lays the six parts out as sections in reading order', () => {
    const guide = sixPartGuide({
      slug: 'a-guide',
      title: 'A guide',
      summary: 'What the guide covers.',
      whatItIsFor: ['Purpose.'],
      whoCanUseIt: ['Anybody.'],
      whereToFindIt: ['The side bar.'],
      how: {
        'How to begin': ['First.', 'Second.'],
        'How to finish': ['Last.'],
      },
      whoCanSeeIt: ['Everybody.'],
      whenSomethingGoesWrong: ['Try again.'],
      relatedLinks: [{ label: 'Somewhere', route: 'somewhere' }],
    });

    expect(guide).toEqual({
      slug: 'a-guide',
      title: 'A guide',
      summary: 'What the guide covers.',
      sections: [
        { heading: 'What it is for', paragraphs: ['Purpose.'] },
        { heading: 'Who can use it', paragraphs: ['Anybody.'] },
        { heading: 'Where to find it', paragraphs: ['The side bar.'] },
        { heading: 'How to begin', paragraphs: ['First.', 'Second.'] },
        { heading: 'How to finish', paragraphs: ['Last.'] },
        { heading: 'Who can see it', paragraphs: ['Everybody.'] },
        { heading: 'When something goes wrong', paragraphs: ['Try again.'] },
      ],
      relatedLinks: [{ label: 'Somewhere', route: 'somewhere' }],
    });
  });

  it('keeps the points and switch of a part written as a section', () => {
    const guide = sixPartGuide({
      slug: 'a-guide',
      title: 'A guide',
      summary: 'What the guide covers.',
      requiresFeature: 'FLEET',
      whatItIsFor: { paragraphs: ['Three kinds:'], points: ['One.', 'Two.'] },
      whoCanUseIt: ['Anybody.'],
      whereToFindIt: ['The side bar.'],
      how: {
        'How chat fits in': {
          paragraphs: ['Chat.'],
          requiresFeature: 'CHAT',
        },
      },
      whoCanSeeIt: ['Everybody.'],
      whenSomethingGoesWrong: {
        paragraphs: ['One of these:'],
        points: ['A.', 'B.'],
      },
    });

    expect(guide.requiresFeature).toBe('FLEET');
    expect(guide).not.toHaveProperty('relatedLinks');
    expect(guide.sections[0]).toStrictEqual({
      heading: 'What it is for',
      paragraphs: ['Three kinds:'],
      points: ['One.', 'Two.'],
    });
    expect(guide.sections[3]).toStrictEqual({
      heading: 'How chat fits in',
      paragraphs: ['Chat.'],
      requiresFeature: 'CHAT',
    });
    expect(guide.sections[5]).toStrictEqual({
      heading: 'When something goes wrong',
      paragraphs: ['One of these:'],
      points: ['A.', 'B.'],
    });
  });
});
