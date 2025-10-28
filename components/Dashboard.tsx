import React, { useState, useEffect } from 'react';
import type { ChartData } from '../types';
import { ChartIcon } from './icons/ChartIcon';
import { VerticalBarChart } from './VerticalBarChart';
import { BackIcon } from './icons/BackIcon';
import { FullscreenIcon } from './icons/FullscreenIcon';
import { ExitFullscreenIcon } from './icons/ExitFullscreenIcon';

interface DashboardProps {
    totalLeads: number;
    chartData: ChartData[];
    chartTitle: string;
    chartView: 'country' | 'state';
    onBarClick: (data: ChartData) => void;
    onBackToCountries: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ totalLeads, chartData, chartTitle, chartView, onBarClick, onBackToCountries }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup the event listener on component unmount
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFullscreen]);
    
    const chartContainerClasses = isFullscreen
        ? "fixed inset-0 z-50 bg-gray-900/90 backdrop-blur-md flex flex-col p-4 sm:p-8"
        : "md:col-span-4 bg-gray-900/50 p-6 rounded-lg border border-gray-700";

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg border border-gray-700 space-y-6">
            <div className="flex items-center gap-3">
                <ChartIcon />
                <h2 className="text-2xl font-bold text-cyan-400">Dashboard</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-1 bg-gray-900/50 p-6 rounded-lg border border-gray-700 flex flex-col justify-center items-center text-center">
                    <h3 className="text-lg font-semibold text-gray-400">Total Leads</h3>
                    <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mt-2">
                        {totalLeads}
                    </p>
                </div>
                <div className={chartContainerClasses}>
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                         <h3 className="text-lg font-bold text-gray-200">{chartTitle}</h3>
                         <div className="flex items-center gap-4">
                            {chartView === 'state' && (
                                <button 
                                    onClick={onBackToCountries}
                                    className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    <BackIcon />
                                    Back to Countries
                                </button>
                            )}
                             <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="text-gray-400 hover:text-white transition-colors"
                                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
                             >
                                {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                             </button>
                         </div>
                    </div>
                    <div className={isFullscreen ? "flex-grow min-h-0" : ""}>
                        <VerticalBarChart data={chartData} onBarClick={onBarClick} isFullscreen={isFullscreen} />
                    </div>
                </div>
            </div>
        </div>
    );
};
