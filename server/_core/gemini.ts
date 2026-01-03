/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAppSetting } from '../db'; // Correct path to server/db
import { decrypt } from './crypto';

// Model type options
export type GeminiModelType = 'flash' | 'pro' | 'exp';

// Model name mapping
const MODEL_NAMES: Record<GeminiModelType, string> = {
    // Lite model is faster and has fewer rate limits for free tier
    flash: 'gemini-2.0-flash-lite-preview-02-05',
    pro: 'gemini-2.0-flash',
    exp: 'gemini-2.0-flash-exp',
};

// Model display names (Arabic)
export const MODEL_DISPLAY_NAMES: Record<GeminiModelType, string> = {
    flash: '⚡ Gemini Flash (سريع - للمهام اليومية)',
    pro: '🧠 Gemini Pro (ذكي - للتحليل العميق)',
    exp: '🚀 Gemini 2.0 Exp (تجريبي - الأحدث)',
};

/**
 * Get the Gemini API key from DB or environment
 * @throws Error if key is not configured
 */
export async function getApiKey(): Promise<string> {
    // 1. Check DB for encrypted key (Admin overrides)
    try {
        const encryptedKey = await getAppSetting('GEMINI_API_KEY');
        if (encryptedKey) {
            return decrypt(encryptedKey);
        }
    } catch (error) {
        console.error('Failed to retrieve/decrypt API key from DB:', error);
        // Fallback to env
    }

    // 2. Check Environment Variable
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) {
        return envKey;
    }

    throw new Error('GEMINI_API_KEY is not configured in DB or .env');
}

/**
 * Message type for conversation history
 */
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Invoke Gemini AI with the specified model
 * @param params - The invocation parameters
 * @returns The AI response text
 */
// Rate limit error codes and messages
const isRateLimitError = (error: any) => {
    return error.status === 429 ||
        error.message?.includes('429') ||
        error.message?.includes('quota') ||
        error.message?.includes('resource exhausted');
};

/**
 * Invoke Gemini with retries and fallback
 */
export async function invokeGemini(params: {
    prompt: string;
    modelType?: GeminiModelType;
    systemPrompt?: string;
    conversationHistory?: ChatMessage[];
}): Promise<string> {
    const { prompt, modelType = 'flash', systemPrompt, conversationHistory = [] } = params;

    const apiKey = await getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    // Helper to run a specific model with retries
    const runGeneration = async (currentModelName: string, retries = 2): Promise<string> => {
        try {
            console.log(`⚙️ Gemini: Using model ${currentModelName} (Retries left: ${retries})`);

            const model = genAI.getGenerativeModel({
                model: currentModelName,
                systemInstruction: systemPrompt,
            });

            // Build conversation history for context
            let history = conversationHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            }));

            // Gemini API requires the first message to be from 'user'
            while (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }

            const chat = model.startChat({
                history: history as any,
            });

            const result = await chat.sendMessage(prompt);
            const response = result.response;
            const text = response.text();

            console.log(`✅ Gemini: Response received (${text.length} chars)`);
            return text;

        } catch (error: any) {
            console.warn(`⚠️ Gemini Error with ${currentModelName}:`, error.message);

            if (isRateLimitError(error) && retries > 0) {
                console.log(`⏳ Rate limit hit, waiting 2s before retry...`);
                await new Promise(r => setTimeout(r, 2000));
                return runGeneration(currentModelName, retries - 1);
            }
            throw error;
        }
    };

    const requestedModel = MODEL_NAMES[modelType];

    try {
        return await runGeneration(requestedModel);
    } catch (error: any) {
        // If Lite model fails with rate limit, try standard Flash as fallback
        if (isRateLimitError(error) && modelType === 'flash') {
            console.log('🔄 Lite model exhausted, failing over to standard Flash...');
            try {
                // Fallback to standard 2.0 Flash
                return await runGeneration('gemini-2.0-flash');
            } catch (fallbackError: any) {
                console.error('❌ Flash Fallback also failed:', fallbackError.message);
                throw new Error('تم تجاوز حد الاستخدام لجميع النماذج. يرجى المحاولة لاحقاً.');
            }
        }

        // Generic error handling
        console.error('❌ Gemini Fatal Error:', error.message || error);

        if (error.message?.includes('API key')) {
            throw new Error('مفتاح API غير صالح. يرجى التحقق من الإعدادات.');
        }
        if (error.message?.includes('blocked')) {
            throw new Error('تم حظر المحتوى. يرجى إعادة صياغة السؤال.');
        }

        throw new Error(`حدث خطأ أثناء الاتصال بالذكاء الاصطناعي: ${error.message}`);
    }
}

/**
 * Check if Gemini API key is configured
 */
export async function isGeminiConfigured(): Promise<boolean> {
    try {
        const dbKey = await getAppSetting('GEMINI_API_KEY');
        if (dbKey) return true;
        return Boolean(process.env.GEMINI_API_KEY);
    } catch {
        return false;
    }
}
