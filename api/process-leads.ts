// This file should be placed in an `api` directory at the root of your project.
// e.g., /api/process-leads.ts
// Platforms like Vercel will automatically turn this into a serverless function.

import { GoogleGenAI, Type } from "@google/genai";
import type { CleanedLead } from '../types';

// This tells Vercel to use the Edge Runtime, which is required for streaming responses.
export const config = {
    runtime: 'edge',
};

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

        // Basic server-side validation
        if (!Array.isArray(lines) || lines.length === 0) {
            return new Response(JSON.stringify({ message: 'Input data (lines) must be a non-empty array.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        if (lines.length > 500) {
             return new Response(JSON.stringify({ message: 'Cannot process more than 500 lines at once.' }), {
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
        const model = "gemini-2.5-flash"; // Using flash for speed

        const leadTypeInstruction = source
            ? `The Lead Type for this lead is '${source}'. Use this value for the 'leadType' field.`
            : "Identify the Lead Type or source from the text content.";
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                fullName: { type: Type.STRING, description: "The full name of the lead, with correct capitalization." },
                email: { type: Type.STRING, description: "The lead's email address, with typos corrected." },
                phoneNumber: { type: Type.STRING, description: "The lead's phone number, normalized to E.164 format." },
                city: { type: Type.STRING, description: "The city of the lead, transliterated to English if necessary." },
                state: { type: Type.STRING, description: "The inferred state/province based on the city." },
                country: { type: Type.STRING, description: "The inferred country based on the city and phone number." },
                course: { type: Type.STRING, description: "The standardized course name from the provided official list." },
                leadType: { type: Type.STRING, description: "The source of the lead, e.g., 'Facebook', 'LinkedIn'." },
            },
            required: ['fullName', 'email', 'phoneNumber', 'city', 'state', 'country', 'course', 'leadType']
        };

        const readableStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                // Process each line individually and stream the result
                for (const line of lines) {
                    if (!line.trim()) continue; // Skip empty lines

                    const prompt = `
                        You are an expert data cleaning and extraction system. Your task is to parse a raw text line containing lead information and extract it into a structured JSON object according to the provided schema.

                        Follow these rules precisely:
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
                        8.  **Output:** Return a single, complete JSON object. DO NOT use any markdown formatting or explanatory text. Your entire output must be only the valid JSON object.

                        Here is the raw text line to process:
                        ${line}
                    `;
                    
                    try {
                        const response = await ai.models.generateContent({
                            model: model,
                            contents: prompt,
                            config: {
                                responseMimeType: "application/json",
                                responseSchema: responseSchema,
                                temperature: 0.2, // Lower temperature for more deterministic output
                            }
                        });
                        
                        const text = response.text;
                        if (text && text.trim().startsWith('{')) {
                            controller.enqueue(encoder.encode(text.trim() + '\n'));
                        } else {
                            console.warn(`Could not process line: "${line}". Model returned invalid JSON: "${text}"`);
                        }
                    } catch (e) {
                        console.error(`Error processing line in Gemini: "${line}"`, e);
                    }
                }
                controller.close();
            },
        });

        // Return the stream directly to the client.
        return new Response(readableStream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
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