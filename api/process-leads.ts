
// This file should be placed in an `api` directory at the root of your project.
// e.g., /api/process-leads.ts
// Platforms like Vercel will automatically turn this into a serverless function.

import { GoogleGenAI } from "@google/genai";
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
        
        // Max lines check to prevent abuse
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

        const leadTypeInstruction = source
            ? `The Lead Type for ALL leads in this batch is '${source}'. Use this value for the 'leadType' field in every object.`
            : "Identify the Lead Type or source from the text content of each line.";

        const prompt = `
            You are an expert data cleaning and extraction system. Your task is to parse a list of raw text lines, where each line contains lead information, and extract each one into a structured JSON object.

            Follow these rules precisely for each line:
            1.  **Extract Fields:** Identify and extract the Full Name, Email, Phone Number, City, and the raw course information.
            2.  **Clean Phone Number:** Normalize the phone number to the E.164 format (e.g., +919902328018). Remove all spaces, dashes, parentheses, or other symbols. Ensure the country code is present.
            3.  **Correct Email:** Fix any obvious typos in the email domain (e.g., 'gmail.con' -> 'gmail.com', 'hotmal.com' -> 'hotmail.com').
            4.  **Normalize Name:** Capitalize the first letter of each part of the full name (e.g., 'shifan shafi' -> 'Shifan Shafi').
            5.  **Geographic Enrichment:**
                *   If the city is non-English, transliterate it to its common English spelling.
                *   Based on the city and phone number country code, infer the State and Country. For example, if 'Chikmagalur' and a '+91' number are provided, you must infer State: 'Karnataka' and Country: 'India'. If a city is in the UAE and number is '+971', infer Country: 'United Arab Emirates' and the correct Emirate as the state.
            6.  **Lead Type:** ${leadTypeInstruction}
            7.  **Course Standardization:** This is a critical step. You MUST map the identified course to one of the following official course names. If the user mentions a course that is a variation or abbreviation, find the closest match from this list.
                *   **Official Course List:** NEBOSH Course, NEBOSH Arabic, IOSH Course, Safety Diploma Courses, ISO Lead Auditor Course, Food Safety Course, NEBOSH - IGC, NEBOSH - HSW, NEBOSH - FSC, NEBOSH - NGC, NEBOSH - PSM, NEBOSH - IDIP, NEBOSH - Fire Safety, NEBOSH - HSE, NEBOSH - INCIDENT INVESTIGATION, NEBOSH -EAW, OTHM, SAFETY DIPLOMA, ADVANCED DIPLOMA, POST DIPLOMA, MASTER DIPLOMA, PG DIPLOMA, IOSH, OSHA, IEMA, ISO 45001:2018, ISO 14001:2015, ISO 9001:2015, HAZOP, HACCP, INDUSTRIAL DIPLOMA, CFPS, FOOD SAFETY COURSES, IMS INTERNAL AUDITOR, EMS, ROSPA COURSES, CPD COURSES, KHDA COURSES, CPD STANDARD OFFICE COURSES, OTHER COURSES, IIRSM COURSES, Other Safety Courses.
                *   **Special Mapping Rules:**
                    *   If the input is just "safety course" or similar generic safety training, map it to "Safety Diploma Courses".
                    *   If the input mentions "NEBOSH" but does not specify which one (e.g., IGC, HSW), map it to "NEBOSH Course".
                    *   If no course from the list is a clear match, use "OTHER COURSES".
            8.  **Output:** Stream back each lead as a separate, complete JSON object on its own line. DO NOT wrap the output in a JSON array or use any markdown formatting. Each line of your output MUST be a valid JSON object and nothing else.

            Here are the raw text lines:
            ${lines.join('\n')}
            `;

        const stream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const readableStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of stream) {
                    const text = chunk.text;
                    if (text) {
                        // Send each text chunk from the AI directly to the client.
                        // Since we've asked for newline-delimited JSON, this will stream
                        // the objects as they are generated.
                        controller.enqueue(encoder.encode(text));
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
        console.error("Error in serverless function:", error);
        const detail = error instanceof Error ? error.message : 'An unknown error occurred.';
        // Return a JSON error object, which the client-side service is equipped to parse.
        return new Response(JSON.stringify({ message: `The AI service failed to process the request. Details: ${detail}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
