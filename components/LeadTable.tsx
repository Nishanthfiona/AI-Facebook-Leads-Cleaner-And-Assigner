
import React from 'react';
import type { CleanedLead, AssignedLead } from '../types';

interface LeadTableProps {
    leads: (CleanedLead | AssignedLead)[];
    assigned?: boolean;
}

export const LeadTable: React.FC<LeadTableProps> = ({ leads, assigned = false }) => {
    const headers = ['Name', 'Email', 'Phone', 'City', 'State', 'Country', 'Course', 'Lead Type'];
    if (assigned) {
        headers.push('Assigned To', 'Assigned To Email');
    }

    if (leads.length === 0) {
        return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center text-gray-400">
                <p>No data to display.</p>
                <p className="text-sm">
                    {assigned ? "Assign leads to see the results here." : "Process some input data to see the results here."}
                </p>
            </div>
        );
    }
    
    return (
        <div className="overflow-x-auto bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                    <tr>
                        {headers.map(header => (
                            <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-gray-800/70 divide-y divide-gray-700">
                    {leads.map((lead, index) => (
                        <tr key={index} className="hover:bg-gray-700/50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">{lead.fullName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.phoneNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.city}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.state}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.country}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.course}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.leadType}</td>
                            {assigned && 'assignedTo' in lead && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-300">
                                    {(lead as AssignedLead).assignedTo}
                                </td>
                            )}
                            {assigned && 'assignedToEmail' in lead && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    {(lead as AssignedLead).assignedToEmail}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
