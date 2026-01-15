// Types for the Hanzi Movie Method database

export interface Actor {
  id: string;
  name: string;
  initial: string; // The initial sound this actor represents
  imageUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  tone: number; // 1-5 (5 for neutral tone)
  emoji?: string; // Optional emoji to represent this room
  imageUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Set {
  id: string;
  name: string;
  final: string; // The final sound this set represents
  emoji?: string; // Optional emoji to represent this set
  imageUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Prop {
  id: string;
  name: string;
  component: string; // The character component this prop represents
  imageUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterDefinition {
  pinyin: string;
  definition: string;
}

export interface Character {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  allDefinitions?: CharacterDefinition[]; // All definitions from dictionary, sorted with surnames last
  actorId?: string;
  setId?: string;
  roomId?: string;
  props: string[]; // Array of prop IDs
  movieScene: string; // Description of the movie scene
  keyword?: string; // Primary keyword for the character
  notes?: string;
  learned: boolean;
  reviewCount: number;
  lastReviewed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterWithRelations extends Omit<Character, 'actorId' | 'setId' | 'roomId' | 'props'> {
  actor?: Actor;
  set?: Set;
  room?: Room;
  props: Prop[];
}

export interface CompoundWord {
  id: string;
  characters: string[]; // Array of individual hanzi characters
  word: string; // The full compound word (e.g., "你好")
  pinyin: string; // Full pinyin for the word
  definition: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
