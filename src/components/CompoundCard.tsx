'use client';

import { CompoundWord } from '@/types';
import { StudyCard } from './StudyCard';

interface CompoundCardProps {
    compound: CompoundWord;
    onToggleLearned?: () => void;
    onToggleReviewed?: () => void;
    showActions?: boolean;
}

export function CompoundCard({ compound, onToggleLearned, onToggleReviewed, showActions = true }: CompoundCardProps) {
    return (
        <StudyCard
            id={compound.id}
            mainText={compound.word}
            characters={compound.characters}
            pinyin={compound.pinyin}
            definition={compound.definition}
            notes={compound.notes}
            detailUrl={`/compounds/${compound.id}`}
            learned={compound.learned}
            reviewed={compound.reviewed}
            onToggleLearned={onToggleLearned}
            onToggleReviewed={onToggleReviewed}
            showActions={showActions}
        />
    );
}
