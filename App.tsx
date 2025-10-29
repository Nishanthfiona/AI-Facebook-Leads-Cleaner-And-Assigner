
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { CleanedLead, Salesperson, AssignedLead, ChartData } from './types';
import { cleanAndExtractLeadData } from './services/geminiService';
import { Header } from './components/Header';
import { LeadInput } from './components/LeadInput';
import { SalespersonConfig } from './components/SalespersonConfig';
import { LeadTable } from './components/LeadTable';
import { AssignIcon } from './components/icons/AssignIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ProgressIndicator } from './components/ProgressIndicator';
import { RetryIcon } from './components/icons/RetryIcon';
import { DatabaseIcon } from './components/icons/DatabaseIcon';
import { Dashboard } from './components/Dashboard';
import { TrashIcon } from './components/icons/TrashIcon';

const App: React.FC = () => {
    const [rawText, setRawText] = useState<string>(() => sessionStorage.getItem('rawText') || '');
    const [leadSourceFromFile, setLeadSourceFromFile] = useState<string | null>(null);
    const [cleanedLeads, setCleanedLeads] = useState<CleanedLead[]>(() => {
        try {
            const saved = sessionStorage.getItem('cleanedLeads');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading cleaned leads from session storage:', error);
            return [];
        }
    });
    const [assignedLeads, setAssignedLeads] = useState<AssignedLead[]>(() => {
        try {
            const saved = sessionStorage.getItem('assignedLeads');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading assigned leads from session storage:', error);
            return [];
        }
    });
    const [salespeople, setSalespeople] = useState<Salesperson[]>(() => {
        try {
            const saved = localStorage.getItem('salespeopleConfig');
            // If the item exists in localStorage, parse it. This correctly handles an empty array '[]'.
            if (saved !== null) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading salespeople from local storage:', error);
        }
        // Only return the default list if nothing is found in localStorage (i.e., first-time visit).
        return [
            { id: Date.now(), name: 'Amit Sharma', email: 'amit.sharma@example.com', locations: ['Karnataka', 'Maharashtra'] },
            { id: Date.now() + 1, name: 'Priya Patel', email: 'priya.patel@example.com', locations: ['Delhi', 'Karnataka'] },
            { id: Date.now() + 2, name: 'John Doe', email: 'john.doe@example.com', locations: ['USA', 'UK'] },
        ];
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAssigning, setIsAssigning] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState({ visible: false, status: '', percentage: 0 });
    const [assignmentFailed, setAssignmentFailed] = useState<boolean>(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

    const roundRobinCounters = useRef<Record<string, number>>({});

    // Persist salespeople to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('salespeopleConfig', JSON.stringify(salespeople));
        } catch (error) {
            console.error('Error saving salespeople to local storage:', error);
        }
    }, [salespeople]);

    // Persist leads and raw text to sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('rawText', rawText);
        } catch (error) {
            console.error('Error saving raw text to session storage:', error);
        }
    }, [rawText]);

    useEffect(() => {
        try {
            sessionStorage.setItem('cleanedLeads', JSON.stringify(cleanedLeads));
        } catch (error) {
            console.error('Error saving cleaned leads to session storage:', error);
        }
    }, [cleanedLeads]);

    useEffect(() => {
        try {
            sessionStorage.setItem('assignedLeads', JSON.stringify(assignedLeads));
        } catch (error) {
            console.error('Error saving assigned leads to session storage:', error);
        }
    }, [assignedLeads]);


    const handleDataLoad = useCallback((text: string, source: string | null) => {
        setRawText(text);
        setLeadSourceFromFile(source);
    }, []);

    const handleClearSession = useCallback(() => {
        setRawText('');
        setLeadSourceFromFile(null);
        setCleanedLeads([]);
        setAssignedLeads([]);
        setError(null);
        setAssignmentFailed(false);
        setSelectedCountry(null);
        setProgress({ visible: false, status: '', percentage: 0 });

        try {
            sessionStorage.removeItem('rawText');
            sessionStorage.removeItem('cleanedLeads');
            sessionStorage.removeItem('assignedLeads');
        } catch (error) {
            console.error('Error clearing session storage:', error);
        }
        setNotification({ message: 'Session cleared!', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
    }, []);


    const handleProcessLeads = useCallback(async () => {
        if (!rawText.trim()) {
            setError("Input data cannot be empty.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setCleanedLeads([]);
        setAssignedLeads([]);
        setAssignmentFailed(false);
        setSelectedCountry(null);
        setProgress({ visible: true, status: 'Initializing...', percentage: 0 });

        const lines = rawText.trim().split('\n').filter(line => line.trim() !== '');
        let allProcessedLeads: CleanedLead[] = [];
        const BATCH_SIZE = 50;

        try {
            for (let i = 0; i < lines.length; i += BATCH_SIZE) {
                const batchLines = lines.slice(i, i + BATCH_SIZE);
                const startNum = i + 1;
                const endNum = Math.min(i + BATCH_SIZE, lines.length);

                setProgress({
                    visible: true,
                    status: `Sending batch: leads ${startNum}-${endNum} of ${lines.length}...`,
                    percentage: (i / lines.length) * 80
                });

                const handleNewLead = (newLead: CleanedLead) => {
                    allProcessedLeads.push(newLead);
                    setCleanedLeads([...allProcessedLeads]);
                    
                    setProgress(prev => ({
                        visible: true,
                        status: `Processing lead ${allProcessedLeads.length} of ${lines.length}...`,
                        percentage: (allProcessedLeads.length / lines.length) * 80 
                    }));
                };

                await cleanAndExtractLeadData(batchLines, leadSourceFromFile, handleNewLead);
            }
            
            setProgress({ visible: true, status: 'Deduplicating leads...', percentage: 90 });
            await new Promise(res => setTimeout(res, 300));
            
            const uniqueLeads = Array.from(new Map(allProcessedLeads.map(lead => [`${lead.email}-${lead.phoneNumber}`, lead])).values());
            setCleanedLeads(uniqueLeads);
            
            setProgress({ visible: true, status: 'Processing complete!', percentage: 100 });
            setTimeout(() => setProgress(prev => ({ ...prev, visible: false })), 1500);

        } catch (e) {
            console.error("Error during lead processing:", e);
            let errorMessage = "An unknown error occurred while processing leads.";
            if (e instanceof Error) {
                errorMessage = e.message;
            }
            setError(errorMessage);
            setProgress({ visible: false, status: '', percentage: 0 });
        } finally {
            setIsLoading(false);
        }
    }, [rawText, leadSourceFromFile]);

    const handleSaveToDatabase = useCallback(async () => {
        if (cleanedLeads.length === 0) {
            setError("No cleaned leads to save.");
            return;
        }
        setIsSaving(true);
        setError(null);
        setNotification(null);

        try {
            console.log("SIMULATING: Sending data to secure backend endpoint...", {
                leads: cleanedLeads,
                timestamp: new Date().toISOString(),
            });
            await new Promise(resolve => setTimeout(resolve, 1500)); 

            setNotification({ message: 'Successfully saved leads to the database!', type: 'success' });
        } catch (e) {
            console.error("Failed to save leads to database (simulated):", e);
            setNotification({ message: 'Error saving leads. Check console for details.', type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setNotification(null), 5000);
        }
    }, [cleanedLeads]);

    const handleAssignLeads = useCallback(async () => {
        if (cleanedLeads.length === 0) {
            setError("No cleaned leads to assign.");
            return;
        }
        setError(null);
        setIsAssigning(true);
        setAssignmentFailed(false);

        try {
            setProgress({ visible: true, status: 'Starting assignment...', percentage: 20 });
            await new Promise(res => setTimeout(res, 200)); 

            const newAssignedLeads: AssignedLead[] = cleanedLeads.map(lead => {
                const location = lead.country === 'India' ? lead.state : lead.country;
                const eligibleSalespeople = salespeople.filter(sp => sp.locations.includes(location));

                let assignedTo = 'Unassigned';
                let assignedToEmail = 'Unassigned';
                if (eligibleSalespeople.length > 0) {
                    const counter = roundRobinCounters.current[location] || 0;
                    const assignedSalesperson = eligibleSalespeople[counter % eligibleSalespeople.length];
                    assignedTo = assignedSalesperson.name;
                    assignedToEmail = assignedSalesperson.email;
                    roundRobinCounters.current[location] = counter + 1;
                }

                return { ...lead, assignedTo, assignedToEmail };
            });
            
            setProgress({ visible: true, status: 'Applying assignment rules...', percentage: 70 });
            await new Promise(res => setTimeout(res, 300));

            setAssignedLeads(newAssignedLeads);
            setProgress({ visible: true, status: 'Assignment complete!', percentage: 100 });
            setTimeout(() => setProgress(prev => ({ ...prev, visible: false })), 1500);
        } catch(e) {
            console.error("Error during lead assignment:", e);
            let errorMessage = "An unknown error occurred during assignment.";
            if (e instanceof Error) {
                errorMessage = `Assignment failed: ${e.message}. Please check the data and try again.`;
            }
            setError(errorMessage);
            setAssignmentFailed(true);
            setProgress({ visible: false, status: '', percentage: 0 });
        } finally {
            setIsAssigning(false);
        }
    }, [cleanedLeads, salespeople]);
    
    const handleDownloadCsv = useCallback(() => {
        if (assignedLeads.length === 0) {
            setError("No assigned leads to download.");
            return;
        }
        setError(null);

        const headers = ['fullName', 'email', 'phoneNumber', 'city', 'state', 'country', 'course', 'leadType', 'assignedTo', 'assignedToEmail'];
        const csvContent = [
            headers.join(','),
            ...assignedLeads.map(lead => headers.map(header => `"${lead[header as keyof AssignedLead]}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'assigned_leads.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, [assignedLeads]);

    const countryData = useMemo(() => {
        if (cleanedLeads.length === 0) return [];
        const countryHasStates = new Map<string, boolean>();
        cleanedLeads.forEach(lead => {
            if (lead.country && lead.state && lead.state !== 'Unknown') {
                countryHasStates.set(lead.country, true);
            }
        });

        const counts = cleanedLeads.reduce<Record<string, number>>((acc, lead) => {
            const country = lead.country || 'Unknown';
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(counts)
            .map(([label, value]) => ({ 
                label, 
                value, 
                isClickable: countryHasStates.get(label) || false 
            }))
            .sort((a: ChartData, b: ChartData) => b.value - a.value);
    }, [cleanedLeads]);

    const stateData = useMemo(() => {
        if (cleanedLeads.length === 0 || !selectedCountry) return [];
        const counts = cleanedLeads
            .filter(lead => lead.country === selectedCountry)
            .reduce<Record<string, number>>((acc, lead) => {
                const state = lead.state || 'Unknown';
                acc[state] = (acc[state] || 0) + 1;
                return acc;
            }, {});
        return Object.entries(counts)
            .map(([label, value]) => ({ label, value }))
            .sort((a: ChartData, b: ChartData) => b.value - a.value);
    }, [cleanedLeads, selectedCountry]);

    const handleBarClick = (data: ChartData) => {
        if (!selectedCountry && data.isClickable) {
            setSelectedCountry(data.label);
        }
    };
    
    const chartView = selectedCountry ? 'state' : 'country';
    const chartData = chartView === 'country' ? countryData : stateData;
    const chartTitle = chartView === 'country' ? 'Leads by Country' : `Leads by State (${selectedCountry})`;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <Header />

            {notification && (
                <div className={`fixed top-5 right-5 z-20 px-4 py-3 rounded-lg shadow-lg border ${
                    notification.type === 'success' 
                    ? 'bg-green-800/80 border-green-600 text-green-100' 
                    : 'bg-red-800/80 border-red-600 text-red-100'
                } backdrop-blur-sm`}>
                    <span className="font-semibold">{notification.message}</span>
                </div>
            )}

            <main className="p-4 sm:p-6 lg:p-8 space-y-8">
                {progress.visible && <ProgressIndicator status={progress.status} percentage={progress.percentage} />}
                {error && (
                    <div className="bg-red-800/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-8">
                        <LeadInput rawText={rawText} onDataLoad={handleDataLoad} onProcess={handleProcessLeads} isLoading={isLoading} />
                        <SalespersonConfig salespeople={salespeople} setSalespeople={setSalespeople} />
                    </div>
                    <div className="lg:col-span-8 space-y-8">
                        {cleanedLeads.length > 0 && (
                            <Dashboard
                                totalLeads={cleanedLeads.length}
                                chartData={chartData}
                                chartTitle={chartTitle}
                                chartView={chartView}
                                onBarClick={handleBarClick}
                                onBackToCountries={() => setSelectedCountry(null)}
                            />
                        )}
                        <div>
                            <div className="flex justify-between items-center mb-4 flex-wrap gap-y-4">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-bold text-cyan-400">Cleaned & Enriched Leads</h2>
                                    {(cleanedLeads.length > 0 || assignedLeads.length > 0) && (
                                        <button
                                            onClick={handleClearSession}
                                            title="Clear all input and results for a new session"
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 text-red-400 font-semibold rounded-lg shadow-md hover:bg-gray-600 hover:text-red-300 transition-colors duration-300"
                                        >
                                            <TrashIcon />
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSaveToDatabase}
                                        disabled={cleanedLeads.length === 0 || isSaving || isAssigning}
                                        title={cleanedLeads.length === 0 ? "Process leads first to enable saving" : ""}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
                                    >
                                        <DatabaseIcon />
                                        {isSaving ? 'Saving...' : 'Save to DB'}
                                    </button>
                                    {assignmentFailed ? (
                                        <button
                                            onClick={handleAssignLeads}
                                            disabled={cleanedLeads.length === 0 || salespeople.length === 0 || isAssigning}
                                            title={cleanedLeads.length === 0 ? "Process some leads first" : salespeople.length === 0 ? "Configure at least one salesperson" : ""}
                                            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
                                        >
                                            <RetryIcon />
                                            {isAssigning ? 'Retrying...' : 'Retry Assignment'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleAssignLeads}
                                            disabled={cleanedLeads.length === 0 || salespeople.length === 0 || isAssigning}
                                            title={cleanedLeads.length === 0 ? "Process some leads first" : salespeople.length === 0 ? "Configure at least one salesperson" : ""}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
                                        >
                                            <AssignIcon />
                                            {isAssigning ? 'Assigning...' : 'Assign'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <LeadTable leads={cleanedLeads} />
                        </div>
                        <div>
                             <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-purple-400">Assigned Leads</h2>
                                <button
                                    onClick={handleDownloadCsv}
                                    disabled={assignedLeads.length === 0}
                                    title={assignedLeads.length === 0 ? "Assign leads first to enable download" : ""}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
                                >
                                    <DownloadIcon />
                                    Download CSV
                                </button>
                            </div>
                            <LeadTable leads={assignedLeads} assigned={true} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
