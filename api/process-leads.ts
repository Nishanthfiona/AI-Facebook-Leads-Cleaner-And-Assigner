
// This file should be placed in an `api` directory at the root of your project.
// e.g., /api/process-leads.ts
// Platforms like Vercel will automatically turn this into a serverless function.

import { GoogleGenAI } from "@google/genai";

// This tells Vercel to use the Edge Runtime, which is required for streaming responses.
export const config = {
    runtime: 'edge',
};

// Function to create the prompt for a batch of lines
function createPrompt(lines: string[], source: string | null): string {
    const leadTypeInstruction = source
        ? `The Lead Type for all leads in this batch is '${source}'. Use this value for the 'leadType' field in every object.`
        : "Identify the Lead Type or source from the text content for each lead.";
    
    return `
        You are an expert data cleaning and extraction system. Your task is to parse a raw text block containing multiple leads (one per line) and extract each one into a structured JSON object.

        Follow these rules precisely for each line:
        1.  **Extract Fields:** Identify and extract the Full Name, Email, Phone Number, City, and the raw course information.
        2.  **Clean Phone Number:** Normalize the phone number to the E.164 format (e.g., +919902328018). Remove all spaces, dashes, parentheses, or other symbols. Ensure the country code is present.
        3.  **Correct Email:** Fix any obvious typos in the email domain (e.g., 'gmail.con' -> 'gmail.com', 'hotmal.com' -> 'hotmail.com').
        4.  **Normalize Name:** Capitalize the first letter of each part of the full name (e.g., 'shifan shafi' -> 'Shifan Shafi').
        5.  **Geographic Enrichment:**
            *   If the city is non-English, transliterate it to its common English spelling.
            *   Based on the city and phone number country code, infer the State and Country. For example, if 'Chikmagalur' and a '+91' number are provided, you must infer State: 'Karnataka' and Country: 'India'. If a city is in the UAE and number is '+971', infer Country: 'United Arab Emirates' and the correct Emirate as the state. If unable to determine, use "Unknown".
        6.  **Lead Type:** ${leadTypeInstruction}
        7.  **Course Standardization:** This is a critical step. You MUST map the identified course to one of the following official course names. If the user mentions a course that is a variation or abbreviation, find the closest match from this list.
            *   **Official Course List:** NEBOSH Course, NEBOSH Arabic, IOSH Course, Safety Diploma Courses, ISO Lead Auditor Course, Food Safety Course, NEBOSH - IGC, NEBOSH - HSW, NEBOSH - FSC, NEBOSH - NGC, NEBOSH - PSM, NEBOSH - IDIP, NEBOSH - Fire Safety, NEBOSH - HSE, NEBOSH - INCIDENT INVESTIGATION, NEBOSH -EAW, OTHM, SAFETY DIPLOMA, ADVANCED DIPLOMA, POST DIPLOMA, MASTER DIPLOMA, PG DIPLOMA, IOSH, OSHA, IEMA, ISO 45001:2018, ISO 14001:2015, ISO 9001:2015, HAZOP, HACCP, INDUSTRIAL DIPLOMA, CFPS, FOOD SAFETY COURSES, IMS INTERNAL AUDITOR, EMS, ROSPA COURSES, CPD COURSES, KHDA COURSES, CPD STANDARD OFFICE COURSES, OTHER COURSES, IIRSM COURSES, Other Safety Courses.
            *   **Special Mapping Rules:**
                *   If the input is just "safety course" or similar generic safety training, map it to "Safety Diploma Courses".
                *   If the input mentions "NEBOSH" but does not specify which one (e.g., IGC, HSW), map it to "NEBOSH Course".
                *   If no course from the list is a clear match, use "OTHER COURSES".
        8.  **Output Format:** You MUST stream your response as newline-delimited JSON (JSONL). For each lead you process from the raw text, output one single, complete JSON object on its own line. Do not wrap the entire output in a JSON array. Do not use any markdown formatting or explanatory text.

        Here is the raw text block to process:
        ${lines.join('\n')}
    `;
}


// This function will be the handler for your serverless function.
// It is designed to work with platforms that support a Request/Response model.
export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { lines, source } = await req.json();

        // Basic server-side validation for the received batch
        if (!Array.isArray(lines) || lines.length === 0) {
            return new Response(JSON.stringify({ message: 'Input data (lines) must be a non-empty array.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Safety check to prevent abuse of a single API call
        if (lines.length > 100) {
             return new Response(JSON.stringify({ message: 'A single processing batch cannot exceed 100 lines.' }), {
                status: 413, // Payload Too Large
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // IMPORTANT: API_KEY is accessed securely from server-side environment variables
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) {
            console.error("CRITICAL: API_KEY environment variable is not set on the server.");
            return new Response(JSON.stringify({ message: "Server configuration error: The API_KEY environment variable is missing. Please add it to your deployment's settings." }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const model = "gemini-2.5-flash";

        // Create a stream to send the response back to the client
        const readableStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    const prompt = createPrompt(lines, source);
                    
                    const geminiStream = await ai.models.generateContentStream({
                        model: model,
                        contents: prompt,
                        config: { temperature: 0.2 }
                    });
                    
                    for await (const chunk of geminiStream) {
                        const text = chunk.text;
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                } catch (batchError) {
                    console.error("Error processing batch:", batchError);
                    const errorMessage = { error: "A batch failed to process.", details: batchError instanceof Error ? batchError.message : String(batchError) };
                    controller.enqueue(encoder.encode('\n' + JSON.stringify(errorMessage) + '\n'));
                } finally {
                    // Ensure the stream is closed, regardless of success or failure.
                    controller.close();
                }
            }
        });

        return new Response(readableStream, {
            headers: { 
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Content-Type-Options': 'nosniff', // Prevents browser from misinterpreting content
            },
        });

    } catch (error) {
        console.error("Error in serverless function handler:", error);
        const detail = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ message: `The AI service failed to process the request. Details: ${detail}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
