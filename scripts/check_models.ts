
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

        console.log("Listing available models via API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            console.log(`Failed to list models: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log("Response:", text);
        } else {
            const data = await response.json();
            console.log("Available Models for this Key:");
            data.models?.forEach((m: any) => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods?.join(', ')})`);
                }
            });
        }

    } catch (error: any) {
        console.error("Fatal Error:", error.message);
    }
    process.exit(0);
}

listModels();
