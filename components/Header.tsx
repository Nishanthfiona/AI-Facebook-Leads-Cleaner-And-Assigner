
import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg p-4 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto text-center">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                    AI Lead Cleaner & Assigner
                </h1>
                <p className="mt-2 text-gray-400">
                    Paste your messy lead data, configure assignments, and get a clean, CRM-ready file in seconds.
                </p>
            </div>
        </header>
    );
};
