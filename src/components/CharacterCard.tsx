'use client';

import { CharacterWithRelations } from '@/types';
import { StudyCard } from './StudyCard';

interface CharacterCardProps {
    character: CharacterWithRelations;
    onToggleLearned?: () => void;
    onToggleReviewed?: () => void;
    showActions?: boolean;
}

export function CharacterCard({ character, onToggleLearned, onToggleReviewed, showActions = true }: CharacterCardProps) {
    // Get first/primary definition only
    const primaryMeaning = character.meaning.split(',')[0].trim();

    return (
        <StudyCard
            id={character.id}
            mainText={character.hanzi}
            pinyin={character.pinyin}
            definition={primaryMeaning}
            detailUrl={`/characters/${character.id}`}
            learned={character.learned}
            reviewed={character.reviewed}
            onToggleLearned={onToggleLearned}
            onToggleReviewed={onToggleReviewed}
            showActions={showActions}
        />
    );
}

