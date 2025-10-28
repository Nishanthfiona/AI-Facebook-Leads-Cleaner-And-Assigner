
import React, { useState } from 'react';
import type { Salesperson } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface SalespersonConfigProps {
    salespeople: Salesperson[];
    setSalespeople: React.Dispatch<React.SetStateAction<Salesperson[]>>;
}

export const SalespersonConfig: React.FC<SalespersonConfigProps> = ({ salespeople, setSalespeople }) => {
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newLocations, setNewLocations] = useState('');

    const handleAddSalesperson = () => {
        if (newName.trim() && newEmail.trim() && newLocations.trim()) {
            const locationsArray = newLocations.split(',').map(loc => loc.trim()).filter(Boolean);
            setSalespeople([...salespeople, { id: Date.now(), name: newName, email: newEmail, locations: locationsArray }]);
            setNewName('');
            setNewEmail('');
            setNewLocations('');
        }
    };

    const handleRemoveSalesperson = (id: number) => {
        setSalespeople(salespeople.filter(sp => sp.id !== id));
    };

    const handleUpdateSalesperson = (id: number, field: keyof Omit<Salesperson, 'id'>, value: string) => {
        setSalespeople(prev => 
            prev.map(sp => {
                if (sp.id === id) {
                    if (field === 'locations') {
                        // We are dealing with a string from the input, so we convert it to an array
                        return { ...sp, locations: value.split(',').map(loc => loc.trim()).filter(Boolean) };
                    }
                    return { ...sp, [field]: value };
                }
                return sp;
            })
        );
    };
    
    return (
        <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">2. Configure Sales Team</h2>
            <div className="space-y-4 border-b border-gray-700 pb-4 mb-4">
                <input
                    type="text"
                    placeholder="Salesperson Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    aria-label="New salesperson name"
                />
                <input
                    type="email"
                    placeholder="Salesperson Email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    aria-label="New salesperson email"
                />
                <input
                    type="text"
                    placeholder="Locations (comma-separated)"
                    value={newLocations}
                    onChange={(e) => setNewLocations(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    aria-label="New salesperson locations"
                />
                <button onClick={handleAddSalesperson} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                    <PlusIcon />
                    Add Salesperson
                </button>
            </div>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {salespeople.map(sp => (
                    <div key={sp.id} className="bg-gray-700/50 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between items-start gap-2">
                            <input
                                type="text"
                                value={sp.name}
                                onChange={(e) => handleUpdateSalesperson(sp.id, 'name', e.target.value)}
                                placeholder="Salesperson Name"
                                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-bold"
                                aria-label={`Edit name for ${sp.name}`}
                            />
                            <button onClick={() => handleRemoveSalesperson(sp.id)} className="text-red-400 hover:text-red-300 p-2 flex-shrink-0" aria-label={`Remove ${sp.name}`}>
                                <TrashIcon />
                            </button>
                        </div>
                        <input
                            type="email"
                            value={sp.email}
                            onChange={(e) => handleUpdateSalesperson(sp.id, 'email', e.target.value)}
                            placeholder="Salesperson Email"
                            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                            aria-label={`Edit email for ${sp.name}`}
                        />
                        <input
                            type="text"
                            value={sp.locations.join(', ')}
                            onChange={(e) => handleUpdateSalesperson(sp.id, 'locations', e.target.value)}
                            placeholder="Locations (comma-separated)"
                            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-xs"
                            aria-label={`Edit locations for ${sp.name}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
