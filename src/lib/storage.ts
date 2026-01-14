// Local storage utilities for persisting data
import { Actor, Room, Set, Prop, Character, CompoundWord } from '@/types';

const STORAGE_KEYS = {
  actors: 'hmm-actors',
  rooms: 'hmm-rooms',
  sets: 'hmm-sets',
  props: 'hmm-props',
  characters: 'hmm-characters',
  compounds: 'hmm-compounds',
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

export function addCharacter(character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'learned'>): Character {
  const characters = getCharacters();
  const newCharacter: Character = {
    ...character,
    id: crypto.randomUUID(),
    learned: false,
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

// Compound Words
export function getCompounds(): CompoundWord[] {
  return getItem<CompoundWord>(STORAGE_KEYS.compounds);
}

export function saveCompounds(compounds: CompoundWord[]): void {
  setItem(STORAGE_KEYS.compounds, compounds);
}

export function addCompound(compound: Omit<CompoundWord, 'id' | 'createdAt' | 'updatedAt'>): CompoundWord {
  const compounds = getCompounds();
  const newCompound: CompoundWord = {
    ...compound,
    id: crypto.randomUUID(),
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
