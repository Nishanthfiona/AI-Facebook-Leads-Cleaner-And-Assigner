
import type { CleanedLead } from '../types';

export const cleanAndExtractLeadData = async (
    batchLines: string[], 
    source: string | null,
    onLeadReceived: (lead: CleanedLead) => void
): Promise<void> => {
    try {
        const response = await fetch('/api/process-leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lines: batchLines, source }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `The server responded with status ${response.status}.`;
            try {
                // Try to parse a structured error message from the server
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch (jsonError) {
                // If the error response isn't JSON, use the raw text
                if (response.status === 504) {
                    errorMessage = "The server timed out (504). This can happen with very large inputs. If you continue to see this error, please try processing a smaller batch of leads.";
                } else if (response.status === 500 && errorText.includes('API_KEY')) {
                    errorMessage = "A server error occurred (500). This can happen on platforms like Vercel if the `API_KEY` environment variable is missing or incorrect. Please check your project's server logs and environment variable settings.";
                } else if (errorText) {
                    errorMessage = errorText; // Use the raw error text if available
                }
            }
            throw new Error(errorMessage);
        }

        if (!response.body) {
            throw new Error("Streaming response not supported or response body is missing.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                // Process any remaining text in the buffer when the stream is done
                if (buffer.trim()) {
                    try {
                        onLeadReceived(JSON.parse(buffer));
                    } catch (e) {
                        console.warn("Could not parse final chunk of stream:", buffer, e);
                    }
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n');
            
            // The last part might be an incomplete line, so we keep it in the buffer
            buffer = parts.pop() || '';

            for (const part of parts) {
                if (part.trim()) {
                    try {
                        onLeadReceived(JSON.parse(part));
                    } catch (e) {
                        console.warn("Could not parse line from stream:", part, e);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error calling backend service:", error);
        if (error instanceof Error) {
           // Re-throw the error to be caught by the UI component
           throw error;
        }
        throw new Error("An unknown network error occurred. Please check your internet connection and try again.");
    }
};
