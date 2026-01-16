// Types for the Hanzi Movie Method database

export interface Actor {
  id: string;
  name: string;
  initial: string; // The initial sound this actor represents (HMM format: "b-", "ji-", "Ø-", etc.)
  category?: 'male' | 'female' | 'fictional' | 'world_leader'; // HMM actor category
  emoji?: string; // Optional emoji to represent this actor
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

// Example sentence from Tatoeba database
export interface ExampleSentence {
  id: number;
  simplified: string;
  pinyin: string;
  english: string;
}

// Component stored in its own collection (for deduplication)
export interface Component {
  id: string;
  character: string;  // The component character (e.g., "女", "子")
  pinyin?: string;    // Primary pinyin if available
  definition?: string; // Primary definition if available
  allDefinitions?: CharacterDefinition[]; // All definitions, sorted with surnames/variants last
  createdAt: Date;
  updatedAt: Date;
}

// Legacy inline component format (for migration compatibility)
export interface CharacterComponent {
  character: string;
  pinyin?: string;
  definition?: string;
}

export interface Character {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  allDefinitions?: CharacterDefinition[]; // All definitions from dictionary, sorted with surnames last
  componentIds?: string[]; // References to Component entities
  components?: CharacterComponent[]; // Legacy: inline components (deprecated, for migration)
  exampleSentences?: ExampleSentence[]; // Example sentences from Tatoeba
  actorId?: string;
  setId?: string;
  roomId?: string;
  props: string[]; // Array of prop IDs
  movieScene: string; // Description of the movie scene
  keyword?: string; // Primary keyword for the character
  notes?: string;
  learned: boolean;
  reviewed: boolean; // Whether the character is ready for review sessions
  reviewCount: number;
  lastReviewed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterWithRelations extends Omit<Character, 'actorId' | 'setId' | 'roomId' | 'props' | 'componentIds' | 'components'> {
  actor?: Actor;
  set?: Set;
  room?: Room;
  props: Prop[];
  components: Component[]; // Resolved component entities
}

export interface CompoundWord {
  id: string;
  characters: string[]; // Array of individual hanzi characters
  word: string; // The full compound word (e.g., "你好")
  pinyin: string; // Full pinyin for the word
  definition: string;
  exampleSentences?: ExampleSentence[]; // Example sentences from Tatoeba
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
