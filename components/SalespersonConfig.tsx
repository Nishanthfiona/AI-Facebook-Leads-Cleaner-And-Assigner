
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
    
    return (
        <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">2. Configure Sales Team</h2>
            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="Salesperson Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                <input
                    type="email"
                    placeholder="Salesperson Email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                <input
                    type="text"
                    placeholder="Locations (comma-separated)"
                    value={newLocations}
                    onChange={(e) => setNewLocations(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                <button onClick={handleAddSalesperson} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                    <PlusIcon />
                    Add Salesperson
                </button>
            </div>
            <div className="mt-6 space-y-3 max-h-60 overflow-y-auto pr-2">
                {salespeople.map(sp => (
                    <div key={sp.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
                        <div>
                            <p className="font-bold">{sp.name}</p>
                            <p className="text-sm text-gray-300">{sp.email}</p>
                            <p className="text-xs text-gray-400 mt-1">{sp.locations.join(', ')}</p>
                        </div>
                        <button onClick={() => handleRemoveSalesperson(sp.id)} className="text-red-400 hover:text-red-300">
                            <TrashIcon />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
