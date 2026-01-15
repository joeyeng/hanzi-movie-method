'use client';

import { useState, useEffect, useCallback } from 'react';
import { Actor, Room, Set, Prop, Character, CharacterWithRelations, CompoundWord, Component, CharacterDefinition } from '@/types';
import * as storage from '@/lib/storage';

export function useActors() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActors(storage.getActors());
    setLoading(false);
  }, []);

  const add = useCallback((actor: Omit<Actor, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newActor = storage.addActor(actor);
    setActors(prev => [...prev, newActor]);
    return newActor;
  }, []);

  const update = useCallback((id: string, updates: Partial<Actor>) => {
    const updated = storage.updateActor(id, updates);
    if (updated) {
      setActors(prev => prev.map(a => a.id === id ? updated : a));
    }
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const success = storage.deleteActor(id);
    if (success) {
      setActors(prev => prev.filter(a => a.id !== id));
    }
    return success;
  }, []);

  return { actors, loading, add, update, remove };
}

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRooms(storage.getRooms());
    setLoading(false);
  }, []);

  const add = useCallback((room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRoom = storage.addRoom(room);
    setRooms(prev => [...prev, newRoom]);
    return newRoom;
  }, []);

  const update = useCallback((id: string, updates: Partial<Room>) => {
    const updated = storage.updateRoom(id, updates);
    if (updated) {
      setRooms(prev => prev.map(r => r.id === id ? updated : r));
    }
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const success = storage.deleteRoom(id);
    if (success) {
      setRooms(prev => prev.filter(r => r.id !== id));
    }
    return success;
  }, []);

  return { rooms, loading, add, update, remove };
}

export function useSets() {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSets(storage.getSets());
    setLoading(false);
  }, []);

  const add = useCallback((set: Omit<Set, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSet = storage.addSet(set);
    setSets(prev => [...prev, newSet]);
    return newSet;
  }, []);

  const update = useCallback((id: string, updates: Partial<Set>) => {
    const updated = storage.updateSet(id, updates);
    if (updated) {
      setSets(prev => prev.map(s => s.id === id ? updated : s));
    }
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const success = storage.deleteSet(id);
    if (success) {
      setSets(prev => prev.filter(s => s.id !== id));
    }
    return success;
  }, []);

  return { sets, loading, add, update, remove };
}

export function useProps() {
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProps(storage.getProps());
    setLoading(false);
  }, []);

  const add = useCallback((prop: Omit<Prop, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProp = storage.addProp(prop);
    setProps(prev => [...prev, newProp]);
    return newProp;
  }, []);

  const update = useCallback((id: string, updates: Partial<Prop>) => {
    const updated = storage.updateProp(id, updates);
    if (updated) {
      setProps(prev => prev.map(p => p.id === id ? updated : p));
    }
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const success = storage.deleteProp(id);
    if (success) {
      setProps(prev => prev.filter(p => p.id !== id));
    }
    return success;
  }, []);

  return { props, loading, add, update, remove };
}

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCharacters(storage.getCharacters());
    setLoading(false);
  }, []);

  const add = useCallback((character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'learned' | 'reviewed'>) => {
    const newCharacter = storage.addCharacter(character);
    setCharacters(prev => [...prev, newCharacter]);
    return newCharacter;
  }, []);

  const update = useCallback((id: string, updates: Partial<Character>) => {
    const updated = storage.updateCharacter(id, updates);
    if (updated) {
      setCharacters(prev => prev.map(c => c.id === id ? updated : c));
    }
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const success = storage.deleteCharacter(id);
    if (success) {
      setCharacters(prev => prev.filter(c => c.id !== id));
    }
    return success;
  }, []);

  const markReviewed = useCallback((id: string) => {
    const updated = storage.markCharacterReviewed(id);
    if (updated) {
      setCharacters(prev => prev.map(c => c.id === id ? updated : c));
    }
    return updated;
  }, []);

  const toggleLearned = useCallback((id: string) => {
    const updated = storage.toggleCharacterLearned(id);
    if (updated) {
      setCharacters(prev => prev.map(c => c.id === id ? updated : c));
    }
    return updated;
  }, []);

  const toggleReviewed = useCallback((id: string) => {
    const updated = storage.toggleCharacterReviewed(id);
    if (updated) {
      setCharacters(prev => prev.map(c => c.id === id ? updated : c));
    }
    return updated;
  }, []);

  return { characters, loading, add, update, remove, markReviewed, toggleLearned, toggleReviewed };
}

export function useComponents() {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setComponents(storage.getComponents());
    setLoading(false);
  }, []);

  const add = useCallback((component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newComponent = storage.addComponent(component);
    setComponents(prev => [...prev, newComponent]);
    return newComponent;
  }, []);

  const findOrCreate = useCallback((char: string, pinyin?: string, definition?: string, allDefinitions?: CharacterDefinition[]) => {
    const component = storage.findOrCreateComponent(char, pinyin, definition, allDefinitions);
    // Refresh the list to ensure we have latest
    setComponents(storage.getComponents());
    return component;
  }, []);

  const update = useCallback((id: string, updates: Partial<Component>) => {
    const updated = storage.updateComponent(id, updates);
    if (updated) {
      setComponents(prev => prev.map(c => c.id === id ? updated : c));
    }
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const success = storage.deleteComponent(id);
    if (success) {
      setComponents(prev => prev.filter(c => c.id !== id));
    }
    return success;
  }, []);

  return { components, loading, add, findOrCreate, update, remove };
}

export function useCharactersWithRelations() {
  const { characters, loading: charsLoading, ...charActions } = useCharacters();
  const { actors, loading: actorsLoading } = useActors();
  const { rooms, loading: roomsLoading } = useRooms();
  const { sets, loading: setsLoading } = useSets();
  const { props, loading: propsLoading } = useProps();
  const { components, loading: componentsLoading } = useComponents();

  const loading = charsLoading || actorsLoading || roomsLoading || setsLoading || propsLoading || componentsLoading;

  const charactersWithRelations: CharacterWithRelations[] = characters.map(char => {
    // Resolve components - first try componentIds, then fall back to legacy inline components
    let resolvedComponents: Component[] = [];
    if (char.componentIds && char.componentIds.length > 0) {
      resolvedComponents = char.componentIds
        .map(compId => components.find(c => c.id === compId))
        .filter((c): c is Component => c !== undefined);
    } else if (char.components && char.components.length > 0) {
      // Legacy: convert inline components to Component format (without id/dates)
      resolvedComponents = char.components.map(c => ({
        id: '',
        character: c.character,
        pinyin: c.pinyin,
        definition: c.definition,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    return {
      ...char,
      actor: actors.find(a => a.id === char.actorId),
      room: rooms.find(r => r.id === char.roomId),
      set: sets.find(s => s.id === char.setId),
      props: char.props.map(propId => props.find(p => p.id === propId)).filter((p): p is Prop => p !== undefined),
      components: resolvedComponents,
    };
  });

  return { characters: charactersWithRelations, loading, ...charActions, actors, rooms, sets, props, components };
}

export function useCompounds() {
  const [compounds, setCompounds] = useState<CompoundWord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCompounds(storage.getCompounds());
    setLoading(false);
  }, []);

  const add = useCallback((compound: Omit<CompoundWord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCompound = storage.addCompound(compound);
    setCompounds(prev => [...prev, newCompound]);
    return newCompound;
  }, []);

  const update = useCallback((id: string, updates: Partial<CompoundWord>) => {
    const updated = storage.updateCompound(id, updates);
    if (updated) {
      setCompounds(prev => prev.map(c => c.id === id ? updated : c));
    }
    return updated;
  }, []);

  const remove = useCallback((id: string) => {
    const success = storage.deleteCompound(id);
    if (success) {
      setCompounds(prev => prev.filter(c => c.id !== id));
    }
    return success;
  }, []);

  return { compounds, loading, add, update, remove };
}
