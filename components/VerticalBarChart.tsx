import React from 'react';
import type { ChartData } from '../types';

interface VerticalBarChartProps {
    data: ChartData[];
    onBarClick: (data: ChartData) => void;
    isFullscreen?: boolean;
}

export const VerticalBarChart: React.FC<VerticalBarChartProps> = ({ data, onBarClick, isFullscreen = false }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500 h-96 flex items-center justify-center">No data available for chart.</div>;
    }
    
    const maxValue = Math.max(...data.map(d => d.value), 0);
    const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const value = Math.ceil(maxValue / 4) * i;
        return value;
    }).reverse();

    return (
        <div className={`w-full ${isFullscreen ? 'h-full' : 'h-96'} flex flex-col`}>
            <div className="flex-grow flex items-end space-x-2 px-4 relative pt-6">
                {/* Y-Axis Labels */}
                <div className="absolute left-0 top-6 bottom-8 flex flex-col justify-between text-xs text-gray-400 -translate-x-full pr-2 text-right">
                    {yAxisLabels.map(label => (
                        <span key={label}>{label}</span>
                    ))}
                </div>

                {data.map(item => (
                    <div key={item.label} className="relative flex-1 h-full flex items-end justify-center group" onClick={() => item.isClickable && onBarClick(item)}>
                        <div
                            className={`w-3/4 max-w-xl rounded-t-md transition-all duration-300 flex justify-center 
                                ${item.isClickable ? 'bg-cyan-500 hover:bg-cyan-400 cursor-pointer' : 'bg-purple-600 hover:bg-purple-500'}`
                            }
                            style={{ height: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                        >
                             <div className="absolute -top-5 text-xs font-bold text-gray-200">
                                {item.value}
                            </div>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            {item.label}: {item.value}
                        </div>
                    </div>
                ))}
            </div>
            <div className="w-full border-t border-gray-600 mt-2 flex justify-around px-4 flex-shrink-0">
                {data.map(item => (
                    <div 
                        key={item.label} 
                        className={`flex-1 text-center text-gray-400 pt-2 px-1 ${
                            isFullscreen ? 'text-sm break-words' : 'text-xs truncate'
                        }`}
                    >
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    );
};