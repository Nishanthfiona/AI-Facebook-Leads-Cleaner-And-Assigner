import React, { useRef } from 'react';
import { ProcessIcon } from './icons/ProcessIcon';
import { UploadIcon } from './icons/UploadIcon';

// Let TypeScript know that XLSX is available from the script tag in index.html
declare var XLSX: any;

interface LeadInputProps {
    rawText: string;
    onDataLoad: (text: string, source: string | null) => void;
    onProcess: () => void;
    isLoading: boolean;
}

export const LeadInput: React.FC<LeadInputProps> = ({ rawText, onDataLoad, onProcess, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                const textData = jsonData
                    .map(row => row.join(' ').trim())
                    .filter(line => line)
                    .join('\n');

                const fileName = file.name.toLowerCase();
                let detectedSource: string | null = null;
                if (fileName.includes('fb') || fileName.includes('facebook')) {
                    detectedSource = 'Facebook';
                } else if (fileName.includes('linkedin')) {
                    detectedSource = 'LinkedIn';
                }

                onDataLoad(textData, detectedSource);

            } catch (error) {
                console.error("Error parsing file:", error);
                onDataLoad('', null); // Clear on error
            }
        };
        reader.onerror = () => {
             console.error("Error reading file");
             onDataLoad('', null); // Clear on error
        }

        reader.readAsArrayBuffer(file);
        
        if(event.target) {
            event.target.value = '';
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">1. Input Lead Data</h2>
            
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".csv,.xlsx,.xls"
                aria-hidden="true"
            />
            
            <button
                onClick={handleUploadClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-300"
                aria-label="Upload a file with leads"
            >
                <UploadIcon />
                Upload CSV / XLSX / XLS File
            </button>

            <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm font-semibold">OR</span>
                <div className="flex-grow border-t border-gray-600"></div>
            </div>

            <textarea
                className="w-full h-48 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow duration-300 resize-y"
                placeholder="Paste your messy lead data here..."
                value={rawText}
                onChange={(e) => onDataLoad(e.target.value, null)}
                aria-label="Lead data text input"
            />
            <button
                onClick={onProcess}
                disabled={isLoading || !rawText.trim()}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white font-bold rounded-lg shadow-md hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </>
                ) : (
                    <>
                        <ProcessIcon />
                        Clean & Process Leads
                    </>
                )}
            </button>
        </div>
    );
};