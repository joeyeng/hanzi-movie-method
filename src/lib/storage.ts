// Local storage utilities for persisting data
import { Actor, Room, Set, Prop, Character, CompoundWord, Component, CharacterDefinition } from '@/types';

const STORAGE_KEYS = {
  actors: 'hmm-actors',
  rooms: 'hmm-rooms',
  sets: 'hmm-sets',
  props: 'hmm-props',
  characters: 'hmm-characters',
  compounds: 'hmm-compounds',
  components: 'hmm-components',
};

// Generic storage functions
function getItem<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setItem<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// Actors
export function getActors(): Actor[] {
  return getItem<Actor>(STORAGE_KEYS.actors);
}

export function saveActors(actors: Actor[]): void {
  setItem(STORAGE_KEYS.actors, actors);
}

export function addActor(actor: Omit<Actor, 'id' | 'createdAt' | 'updatedAt'>): Actor {
  const actors = getActors();
  const newActor: Actor = {
    ...actor,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  actors.push(newActor);
  saveActors(actors);
  return newActor;
}

export function updateActor(id: string, updates: Partial<Actor>): Actor | null {
  const actors = getActors();
  const index = actors.findIndex(a => a.id === id);
  if (index === -1) return null;
  actors[index] = { ...actors[index], ...updates, updatedAt: new Date() };
  saveActors(actors);
  return actors[index];
}

export function deleteActor(id: string): boolean {
  const actors = getActors();
  const filtered = actors.filter(a => a.id !== id);
  if (filtered.length === actors.length) return false;
  saveActors(filtered);
  return true;
}

// Rooms (tone-based locations within sets)
export function getRooms(): Room[] {
  return getItem<Room>(STORAGE_KEYS.rooms);
}

export function saveRooms(rooms: Room[]): void {
  setItem(STORAGE_KEYS.rooms, rooms);
}

export function addRoom(room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>): Room {
  const rooms = getRooms();
  const newRoom: Room = {
    ...room,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  rooms.push(newRoom);
  saveRooms(rooms);
  return newRoom;
}

export function updateRoom(id: string, updates: Partial<Room>): Room | null {
  const rooms = getRooms();
  const index = rooms.findIndex(r => r.id === id);
  if (index === -1) return null;
  rooms[index] = { ...rooms[index], ...updates, updatedAt: new Date() };
  saveRooms(rooms);
  return rooms[index];
}

export function deleteRoom(id: string): boolean {
  const rooms = getRooms();
  const filtered = rooms.filter(r => r.id !== id);
  if (filtered.length === rooms.length) return false;
  saveRooms(filtered);
  return true;
}

// Sets
export function getSets(): Set[] {
  return getItem<Set>(STORAGE_KEYS.sets);
}

export function saveSets(sets: Set[]): void {
  setItem(STORAGE_KEYS.sets, sets);
}

export function addSet(set: Omit<Set, 'id' | 'createdAt' | 'updatedAt'>): Set {
  const sets = getSets();
  const newSet: Set = {
    ...set,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  sets.push(newSet);
  saveSets(sets);
  return newSet;
}

export function updateSet(id: string, updates: Partial<Set>): Set | null {
  const sets = getSets();
  const index = sets.findIndex(s => s.id === id);
  if (index === -1) return null;
  sets[index] = { ...sets[index], ...updates, updatedAt: new Date() };
  saveSets(sets);
  return sets[index];
}

export function deleteSet(id: string): boolean {
  const sets = getSets();
  const filtered = sets.filter(s => s.id !== id);
  if (filtered.length === sets.length) return false;
  saveSets(filtered);
  return true;
}

// Props
export function getProps(): Prop[] {
  return getItem<Prop>(STORAGE_KEYS.props);
}

export function saveProps(props: Prop[]): void {
  setItem(STORAGE_KEYS.props, props);
}

export function addProp(prop: Omit<Prop, 'id' | 'createdAt' | 'updatedAt'>): Prop {
  const props = getProps();
  const newProp: Prop = {
    ...prop,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  props.push(newProp);
  saveProps(props);
  return newProp;
}

export function updateProp(id: string, updates: Partial<Prop>): Prop | null {
  const props = getProps();
  const index = props.findIndex(p => p.id === id);
  if (index === -1) return null;
  props[index] = { ...props[index], ...updates, updatedAt: new Date() };
  saveProps(props);
  return props[index];
}

export function deleteProp(id: string): boolean {
  const props = getProps();
  const filtered = props.filter(p => p.id !== id);
  if (filtered.length === props.length) return false;
  saveProps(filtered);
  return true;
}

// Characters
export function getCharacters(): Character[] {
  return getItem<Character>(STORAGE_KEYS.characters);
}

export function saveCharacters(characters: Character[]): void {
  setItem(STORAGE_KEYS.characters, characters);
}

export function addCharacter(character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'learned' | 'reviewed'>): Character {
  const characters = getCharacters();
  const newCharacter: Character = {
    ...character,
    id: crypto.randomUUID(),
    learned: false,
    reviewed: false,
    reviewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  characters.push(newCharacter);
  saveCharacters(characters);
  return newCharacter;
}

export function updateCharacter(id: string, updates: Partial<Character>): Character | null {
  const characters = getCharacters();
  const index = characters.findIndex(c => c.id === id);
  if (index === -1) return null;
  characters[index] = { ...characters[index], ...updates, updatedAt: new Date() };
  saveCharacters(characters);
  return characters[index];
}

export function deleteCharacter(id: string): boolean {
  const characters = getCharacters();
  const filtered = characters.filter(c => c.id !== id);
  if (filtered.length === characters.length) return false;
  saveCharacters(filtered);
  return true;
}

export function markCharacterReviewed(id: string): Character | null {
  const characters = getCharacters();
  const index = characters.findIndex(c => c.id === id);
  if (index === -1) return null;
  characters[index] = {
    ...characters[index],
    reviewCount: characters[index].reviewCount + 1,
    lastReviewed: new Date(),
    updatedAt: new Date(),
  };
  saveCharacters(characters);
  return characters[index];
}

export function toggleCharacterLearned(id: string): Character | null {
  const characters = getCharacters();
  const index = characters.findIndex(c => c.id === id);
  if (index === -1) return null;
  characters[index] = {
    ...characters[index],
    learned: !characters[index].learned,
    updatedAt: new Date(),
  };
  saveCharacters(characters);
  return characters[index];
}

export function toggleCharacterReviewed(id: string): Character | null {
  const characters = getCharacters();
  const index = characters.findIndex(c => c.id === id);
  if (index === -1) return null;
  characters[index] = {
    ...characters[index],
    reviewed: !characters[index].reviewed,
    updatedAt: new Date(),
  };
  saveCharacters(characters);
  return characters[index];
}

// Compound Words
export function getCompounds(): CompoundWord[] {
  return getItem<CompoundWord>(STORAGE_KEYS.compounds);
}

export function saveCompounds(compounds: CompoundWord[]): void {
  setItem(STORAGE_KEYS.compounds, compounds);
}

export function addCompound(compound: Omit<CompoundWord, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'learned' | 'reviewed'>): CompoundWord {
  const compounds = getCompounds();
  const newCompound: CompoundWord = {
    ...compound,
    id: crypto.randomUUID(),
    learned: false,
    reviewed: false,
    reviewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  compounds.push(newCompound);
  saveCompounds(compounds);
  return newCompound;
}

export function updateCompound(id: string, updates: Partial<CompoundWord>): CompoundWord | null {
  const compounds = getCompounds();
  const index = compounds.findIndex(c => c.id === id);
  if (index === -1) return null;
  compounds[index] = { ...compounds[index], ...updates, updatedAt: new Date() };
  saveCompounds(compounds);
  return compounds[index];
}

export function deleteCompound(id: string): boolean {
  const compounds = getCompounds();
  const filtered = compounds.filter(c => c.id !== id);
  if (filtered.length === compounds.length) return false;
  saveCompounds(filtered);
  return true;
}

export function toggleCompoundLearned(id: string): CompoundWord | null {
  const compounds = getCompounds();
  const index = compounds.findIndex(c => c.id === id);
  if (index === -1) return null;
  compounds[index] = {
    ...compounds[index],
    learned: !compounds[index].learned,
    updatedAt: new Date(),
  };
  saveCompounds(compounds);
  return compounds[index];
}

export function toggleCompoundReviewed(id: string): CompoundWord | null {
  const compounds = getCompounds();
  const index = compounds.findIndex(c => c.id === id);
  if (index === -1) return null;
  compounds[index] = {
    ...compounds[index],
    reviewed: !compounds[index].reviewed,
    updatedAt: new Date(),
  };
  saveCompounds(compounds);
  return compounds[index];
}

export function markCompoundReviewed(id: string): CompoundWord | null {
  const compounds = getCompounds();
  const index = compounds.findIndex(c => c.id === id);
  if (index === -1) return null;
  compounds[index] = {
    ...compounds[index],
    reviewCount: (compounds[index].reviewCount || 0) + 1,
    lastReviewed: new Date(),
    updatedAt: new Date(),
  };
  saveCompounds(compounds);
  return compounds[index];
}

// Components (character radicals/sub-characters)
export function getComponents(): Component[] {
  return getItem<Component>(STORAGE_KEYS.components);
}

export function saveComponents(components: Component[]): void {
  setItem(STORAGE_KEYS.components, components);
}

export function addComponent(component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>): Component {
  const components = getComponents();
  const newComponent: Component = {
    ...component,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  components.push(newComponent);
  saveComponents(components);
  return newComponent;
}

export function findComponentByCharacter(char: string): Component | undefined {
  const components = getComponents();
  return components.find(c => c.character === char);
}

export function findOrCreateComponent(char: string, pinyin?: string, definition?: string, allDefinitions?: CharacterDefinition[]): Component {
  const existing = findComponentByCharacter(char);
  if (existing) {
    // Update if we have better data (allDefinitions or missing pinyin/definition)
    if ((allDefinitions && (!existing.allDefinitions || existing.allDefinitions.length === 0)) ||
        (pinyin && !existing.pinyin) || 
        (definition && !existing.definition)) {
      return updateComponent(existing.id, { 
        pinyin: pinyin || existing.pinyin, 
        definition: definition || existing.definition,
        allDefinitions: allDefinitions || existing.allDefinitions
      }) || existing;
    }
    return existing;
  }
  return addComponent({ character: char, pinyin, definition, allDefinitions });
}

export function updateComponent(id: string, updates: Partial<Component>): Component | null {
  const components = getComponents();
  const index = components.findIndex(c => c.id === id);
  if (index === -1) return null;
  components[index] = { ...components[index], ...updates, updatedAt: new Date() };
  saveComponents(components);
  return components[index];
}

export function deleteComponent(id: string): boolean {
  const components = getComponents();
  const filtered = components.filter(c => c.id !== id);
  if (filtered.length === components.length) return false;
  saveComponents(filtered);
  return true;
}

// ==================== HMM WORD ASSOCIATIONS ====================
// These link corpus words to HMM data (actors, rooms, sets, movie scenes)
// Stored separately from the old Character type to work with the offline database

export interface WordHmmData {
  word: string;           // The Chinese word (key)
  actorId?: string;       // Reference to actor
  roomId?: string;        // Reference to room  
  setId?: string;         // Reference to set
  propIds?: string[];     // Reference to props
  movieScene?: string;    // Custom movie scene description
  notes?: string;         // User notes
  updatedAt: Date;
}

const WORD_HMM_KEY = 'hmm-word-associations';

export function getWordHmmData(): Map<string, WordHmmData> {
  if (typeof window === 'undefined') return new Map();
  const data = localStorage.getItem(WORD_HMM_KEY);
  if (!data) return new Map();
  try {
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export function saveWordHmmData(data: Map<string, WordHmmData>): void {
  if (typeof window === 'undefined') return;
  const obj = Object.fromEntries(data);
  localStorage.setItem(WORD_HMM_KEY, JSON.stringify(obj));
}

export function getWordHmm(word: string): WordHmmData | undefined {
  const data = getWordHmmData();
  return data.get(word);
}

export function setWordHmm(word: string, hmm: Partial<Omit<WordHmmData, 'word' | 'updatedAt'>>): WordHmmData {
  const data = getWordHmmData();
  const existing = data.get(word);
  const updated: WordHmmData = {
    word,
    actorId: hmm.actorId ?? existing?.actorId,
    roomId: hmm.roomId ?? existing?.roomId,
    setId: hmm.setId ?? existing?.setId,
    propIds: hmm.propIds ?? existing?.propIds,
    movieScene: hmm.movieScene ?? existing?.movieScene,
    notes: hmm.notes ?? existing?.notes,
    updatedAt: new Date(),
  };
  data.set(word, updated);
  saveWordHmmData(data);
  return updated;
}

export function deleteWordHmm(word: string): boolean {
  const data = getWordHmmData();
  if (!data.has(word)) return false;
  data.delete(word);
  saveWordHmmData(data);
  return true;
}

export function getWordsWithHmmData(): string[] {
  const data = getWordHmmData();
  return Array.from(data.keys());
}

// ==================== CORPUS WORD LEARNING STATE ====================
// Tracks learned/reviewed status for words from the offline database (corpus)
// This is separate from the Character type which is for manually imported characters

export interface CorpusWordState {
  word: string;
  learned: boolean;
  reviewed: boolean;        // Whether it's in the review queue
  reviewCount: number;
  lastReviewed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CORPUS_LEARNING_KEY = 'hmm-corpus-learning';

export function getCorpusLearningData(): Map<string, CorpusWordState> {
  if (typeof window === 'undefined') return new Map();
  const data = localStorage.getItem(CORPUS_LEARNING_KEY);
  if (!data) return new Map();
  try {
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export function saveCorpusLearningData(data: Map<string, CorpusWordState>): void {
  if (typeof window === 'undefined') return;
  const obj = Object.fromEntries(data);
  localStorage.setItem(CORPUS_LEARNING_KEY, JSON.stringify(obj));
}

export function getCorpusWordState(word: string): CorpusWordState | undefined {
  const data = getCorpusLearningData();
  return data.get(word);
}

export function setCorpusWordLearned(word: string, learned: boolean): CorpusWordState {
  const data = getCorpusLearningData();
  const existing = data.get(word);
  const now = new Date();
  const updated: CorpusWordState = {
    word,
    learned,
    reviewed: existing?.reviewed ?? false,
    reviewCount: existing?.reviewCount ?? 0,
    lastReviewed: existing?.lastReviewed,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  data.set(word, updated);
  saveCorpusLearningData(data);
  return updated;
}

export function setCorpusWordReviewed(word: string, reviewed: boolean): CorpusWordState {
  const data = getCorpusLearningData();
  const existing = data.get(word);
  const now = new Date();
  const updated: CorpusWordState = {
    word,
    learned: existing?.learned ?? false,
    reviewed,
    reviewCount: existing?.reviewCount ?? 0,
    lastReviewed: existing?.lastReviewed,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  data.set(word, updated);
  saveCorpusLearningData(data);
  return updated;
}

export function markCorpusWordReviewed(word: string): CorpusWordState {
  const data = getCorpusLearningData();
  const existing = data.get(word);
  const now = new Date();
  const updated: CorpusWordState = {
    word,
    learned: existing?.learned ?? false,
    reviewed: existing?.reviewed ?? false,
    reviewCount: (existing?.reviewCount ?? 0) + 1,
    lastReviewed: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  data.set(word, updated);
  saveCorpusLearningData(data);
  return updated;
}

export function getCorpusWordsForReview(): CorpusWordState[] {
  const data = getCorpusLearningData();
  return Array.from(data.values()).filter(w => w.reviewed);
}

export function getLearnedCorpusWords(): CorpusWordState[] {
  const data = getCorpusLearningData();
  return Array.from(data.values()).filter(w => w.learned);
}
