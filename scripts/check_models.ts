
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from '../server/_core/gemini';
import 'dotenv/config';

async function listModels() {
    try {
        console.log("Fetching API key...");
        const apiKey = await getApiKey();
        console.log("API Key retrieved (masked):", apiKey.slice(0, 4) + '...');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Placeholder just to access client

        // There isn't a direct listModels on the client instance in older versions, 
        // but let's try the global fetch if implied, or use the response suggestion.
        // Actually, the SDK exposes it differently?
        // Let's rely on standard REST if SDK doesn't facilitate easy listing in this version,
        // OR just try to create a model and run a simple prompt.

        console.log("Attempting to generate content with 'gemini-1.5-flash'...");
        try {
            const m = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            await m.generateContent("Test");
            console.log("SUCCESS: gemini-1.5-flash is working.");
        } catch (e: any) {
            console.log("FAILED gemini-1.5-flash:", e.message);
        }

        console.log("Attempting to generate content with 'gemini-pro'...");
        try {
            const m = genAI.getGenerativeModel({ model: 'gemini-pro' });
            await m.generateContent("Test");
            console.log("SUCCESS: gemini-pro is working.");
        } catch (e: any) {
            console.log("FAILED gemini-pro:", e.message);
        }

    } catch (error: any) {
        console.error("Fatal Error:", error.message);
    }
    process.exit(0);
}

listModels();
