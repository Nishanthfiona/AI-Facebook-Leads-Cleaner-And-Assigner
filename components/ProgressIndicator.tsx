
import React from 'react';

interface ProgressIndicatorProps {
    status: string;
    percentage: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ status, percentage }) => {
    return (
        <div className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-lg">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-cyan-300">{status}</p>
                <p className="text-sm font-bold text-gray-200">{Math.round(percentage)}%</p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${percentage}%` }}
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                ></div>
            </div>
        </div>
    );
};
