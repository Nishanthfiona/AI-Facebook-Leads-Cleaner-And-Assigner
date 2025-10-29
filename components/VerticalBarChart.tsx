import React from 'react';
import type { ChartData } from '../types';

interface VerticalBarChartProps {
    data: ChartData[];
    onBarClick: (data: ChartData) => void;
    isFullscreen?: boolean;
}

export const VerticalBarChart: React.FC<VerticalBarChartProps> = ({ data, onBarClick, isFullscreen = false }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-600 h-96 flex items-center justify-center">No data available for chart.</div>;
    }
    
    const maxValue = Math.max(...data.map(d => d.value), 0);
    
    // Dynamically calculate the top of the Y-axis for a clean look and accurate scaling.
    // This ensures the tallest bar uses the space effectively without distorting proportions for smaller values.
    const yAxisTopValue = maxValue <= 1 ? 1 : (maxValue <= 4 ? 4 : Math.ceil(maxValue / 4) * 4);

    const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const value = (yAxisTopValue / 4) * i;
        // Format to integer if it's a whole number, otherwise to one decimal place
        return Number.isInteger(value) ? value : parseFloat(value.toFixed(1));
    }).reverse();

    return (
        <div className={`w-full ${isFullscreen ? 'h-full' : 'h-96'} flex flex-col`}>
            <div className="flex-grow flex items-end space-x-2 px-4 relative pt-6">
                {/* Y-Axis Labels */}
                <div className="absolute left-0 top-6 bottom-8 flex flex-col justify-between text-xs text-gray-600 -translate-x-full pr-2 text-right">
                    {yAxisLabels.map(label => (
                        <span key={label}>{label}</span>
                    ))}
                </div>

                {data.map(item => (
                    <div key={item.label} className="relative flex-1 h-full flex items-end justify-center group" onClick={() => item.isClickable && onBarClick(item)}>
                        <div
                            className={`w-3/4 max-w-xl rounded-t-md transition-all duration-300 flex justify-center hover:brightness-95 ${item.isClickable ? 'cursor-pointer' : ''}`}
                            style={{ 
                                height: `${yAxisTopValue > 0 ? (item.value / yAxisTopValue) * 100 : 0}%`,
                                backgroundColor: '#5B99C2'
                            }}
                        >
                             <div className="absolute -top-5 text-xs font-bold text-gray-700">
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
            <div className="w-full border-t border-gray-400 mt-2 flex justify-around px-4 flex-shrink-0">
                {data.map(item => (
                    <div 
                        key={item.label} 
                        className={`flex-1 text-center text-gray-600 pt-2 px-1 ${
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