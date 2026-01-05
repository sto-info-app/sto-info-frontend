export interface Character {
  id: string;
  accountId: string;
  handle: string; // This is the Captain Name / Unique identifier
  firstName?: string;
  middleName?: string;
  lastName?: string;
  biography?: string;
  notes?: string;
  createdDate?: string;
  generalFactionId: string;
  factionId: string;
  sexId: string;
  classId: string;
  recruitTypeId: string;
  speciesId: string;
  level: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  profilePicture?: string | null;
  profilePicture300?: string | null;
  profilePicture100?: string | null;

  // Optional relations populated by some GET requests
  generalFaction?: GeneralFaction;
  faction?: Faction;
  sex?: Sex;
  class?: CharacterClass;
  recruitType?: RecruitType;
  species?: Species;
  rank?: Rank;
}

export interface Rank {
  title: string;
  iconUrl?: string | null;
}

export interface GeneralFaction {
  id: string;
  name: string;
}

export interface Faction {
  id: string;
  name: string;
  generalFactionId: string;
  iconUrl?: string | null;
}

export interface Sex {
  id: string;
  name: string;
}

export interface CharacterClass {
  id: string;
  name: string;
}

export interface RecruitType {
  id: string;
  name: string;
}

export interface Species {
  id: string;
  name: string;
}

export interface CreateCharacterRequest {
  accountId: string;
  handle: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  biography?: string;
  notes?: string;
  createdDate?: string;
  generalFactionId: string;
  factionId: string;
  sexId: string;
  classId: string;
  recruitTypeId: string;
  speciesId: string;
  level: number;
}

export type UpdateCharacterRequest = Partial<CreateCharacterRequest>;
