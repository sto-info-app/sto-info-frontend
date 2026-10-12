import { CharacterAdmiraltySummary } from './character-admiralty.model';
import { CharacterCommendationSummary } from './character-commendation.model';
import { CharacterRdSummary } from './character-rd.model';
import { CharacterReputationSummary } from './character-reputation.model';
import { CharacterSpecializationSummary } from './character-specialization.model';

/** The tracker tabs on the character detail page, by their tab id. */
export type CharacterTrackerTab =
  'reputations' | 'rd' | 'specializations' | 'admiralty' | 'commendations';

/** Every tracker's summary for one captain, fetched in a single request. */
export interface CharacterOverviewSummary {
  reputation: CharacterReputationSummary;
  rd: CharacterRdSummary;
  specialization: CharacterSpecializationSummary;
  admiralty: CharacterAdmiraltySummary;
  commendation: CharacterCommendationSummary;
}
