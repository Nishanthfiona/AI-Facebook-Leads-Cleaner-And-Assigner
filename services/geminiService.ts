
import type { CleanedLead } from '../types';

export const cleanAndExtractLeadData = async (lines: string[], source: string | null): Promise<CleanedLead[]> => {
    try {
        const response = await fetch('/api/process-leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lines, source }),
        });

        if (!response.ok) {
            let errorMessage;
            try {
                // Try to get a specific message from the server's JSON response
                const errorData = await response.json();
                errorMessage = errorData.message || `The server responded with status ${response.status}.`;
            } catch (jsonError) {
                // This block executes if the server response is not valid JSON
                console.error("Could not parse error response as JSON.", jsonError);
                if (response.status === 500) {
                    // Provide a specific, helpful message for the most common deployment issue.
                    errorMessage = "A server error occurred (500). This can happen on platforms like Vercel if the `API_KEY` environment variable is missing or incorrect. Please check your project's server logs and environment variable settings.";
                } else {
                    errorMessage = `An unexpected server error occurred (Status: ${response.status}). The server response was not readable. Check the server logs for more details.`;
                }
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        return result.leads;

    } catch (error) {
        console.error("Error calling backend service:", error);
        if (error instanceof Error) {
           // Re-throw the error to be caught by the UI component
           throw error;
        }
        throw new Error("An unknown network error occurred. Please check your internet connection and try again.");
    }
};
