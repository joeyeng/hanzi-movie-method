'use client';

import { useState } from 'react';
import { useRooms } from '@/hooks/useLocalStorage';
import { RoomForm } from '@/components/RoomForm';
import { Room } from '@/types';

const toneColors: Record<number, string> = {
    1: 'bg-red-500/20 text-red-400 border-red-500/30',
    2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    3: 'bg-green-500/20 text-green-400 border-green-500/30',
    4: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    5: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const toneSymbols: Record<number, string> = {
    1: 'ā (high level)',
    2: 'á (rising)',
    3: 'ǎ (dipping)',
    4: 'à (falling)',
    5: 'a (neutral)',
};

export default function RoomsPage() {
    const { rooms, loading, add, update, remove } = useRooms();
    const [showForm, setShowForm] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);

    const handleSubmit = (data: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingRoom) {
            update(editingRoom.id, data);
        } else {
            add(data);
        }
        setShowForm(false);
        setEditingRoom(null);
    };

    const handleEdit = (room: Room) => {
        setEditingRoom(room);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this room?')) {
            remove(id);
        }
    };

    // Group rooms by tone
    const roomsByTone = rooms.reduce((acc, room) => {
        if (!acc[room.tone]) acc[room.tone] = [];
        acc[room.tone].push(room);
        return acc;
    }, {} as Record<number, Room[]>);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-amber-400 mb-2">Rooms</h1>
                    <p className="text-slate-400">
                        Define room types for each tone. In the Hanzi Movie Method, each tone corresponds to a specific room within your sets.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingRoom(null);
                        setShowForm(true);
                    }}
                    className="bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                >
                    + Add Room
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
                <h3 className="text-amber-400 font-medium mb-2">💡 How Rooms Work</h3>
                <p className="text-slate-300 text-sm">
                    Rooms represent the <strong>tone</strong> of a character&apos;s pinyin. Each set (location) has multiple rooms inside it.
                    For example, if your set is &quot;Mom&apos;s House&quot; and the character has tone 1, you might imagine the scene in the Living Room.
                    Tone 2 could be the Kitchen, Tone 3 the Bathroom, etc.
                </p>
            </div>

            {showForm && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingRoom ? 'Edit Room' : 'Add New Room'}
                    </h2>
                    <RoomForm
                        initialData={editingRoom || undefined}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingRoom(null);
                        }}
                    />
                </div>
            )}

            {/* Rooms grouped by tone */}
            <div className="space-y-6">
                {[1, 2, 3, 4, 5].map(tone => (
                    <div key={tone} className="bg-slate-800 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${toneColors[tone]}`}>
                                Tone {tone}
                            </span>
                            <span className="text-slate-400 text-sm">{toneSymbols[tone]}</span>
                        </div>

                        {roomsByTone[tone]?.length > 0 ? (
                            <div className="grid gap-3">
                                {roomsByTone[tone].map(room => (
                                    <div
                                        key={room.id}
                                        className="bg-slate-700/50 rounded-lg p-4 flex justify-between items-start"
                                    >
                                        <div className="flex items-center gap-3">
                                            {room.emoji && <span className="text-4xl">{room.emoji}</span>}
                                            <div>
                                                <h3 className="text-white font-medium text-lg">
                                                    {room.name}
                                                </h3>
                                                {room.description && (
                                                    <p className="text-slate-400 text-sm mt-1">{room.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(room)}
                                                className="px-3 py-1 bg-slate-600 text-slate-300 rounded text-sm hover:bg-slate-500 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(room.id)}
                                                className="px-3 py-1 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm italic">
                                No room defined for Tone {tone}. Add one to complete your system!
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {rooms.length === 0 && !showForm && (
                <div className="text-center py-12 bg-slate-800 rounded-lg mt-6">
                    <p className="text-slate-400 mb-4">No rooms defined yet.</p>
                    <p className="text-slate-500 text-sm mb-4">
                        Start by adding a room for each of the 5 tones to build your memory palace system.
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                    >
                        Add Your First Room
                    </button>
                </div>
            )}
        </div>
    );
}
