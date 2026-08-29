import { StorytimeTargetType } from 'src/app/models/storytime.models';
import { targetTypeSegment } from './target-type.utility';

describe('targetTypeSegment', () => {
  it('writes the kind of content in lower case', () => {
    expect(targetTypeSegment(StorytimeTargetType.STORY)).toBe('story');
  });

  it('keeps the underscore in a two-word kind', () => {
    expect(targetTypeSegment(StorytimeTargetType.CREW_CREDIT)).toBe(
      'crew_credit',
    );
  });

  // Every kind has to survive the trip, because the server reads the segment
  // back into this same vocabulary.
  it.each(Object.values(StorytimeTargetType))('round-trips %s', targetType => {
    expect(targetTypeSegment(targetType).toUpperCase()).toBe(targetType);
  });
});
