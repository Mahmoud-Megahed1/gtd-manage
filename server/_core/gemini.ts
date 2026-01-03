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
    flash: 'gemini-1.5-flash',
    pro: 'gemini-1.5-pro',
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
async function getApiKey(): Promise<string> {
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
export async function invokeGemini(params: {
    prompt: string;
    modelType?: GeminiModelType;
    systemPrompt?: string;
    conversationHistory?: ChatMessage[];
}): Promise<string> {
    const { prompt, modelType = 'flash', systemPrompt, conversationHistory = [] } = params;

    const apiKey = await getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelName = MODEL_NAMES[modelType];
    console.log(`⚙️ Gemini: Using model ${modelName}`);

    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
    });

    try {
        // Build conversation history for context
        let history = conversationHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // Gemini API requires the first message to be from 'user'
        // Remove any leading 'model' messages
        while (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        // Start chat with history
        const chat = model.startChat({
            history: history as any,
        });

        // Send the current prompt
        const result = await chat.sendMessage(prompt);
        const response = result.response;
        const text = response.text();

        console.log(`✅ Gemini: Response received (${text.length} chars)`);
        return text;

    } catch (error: any) {
        console.error('❌ Gemini Error:', error.message || error);

        // Handle specific errors
        if (error.message?.includes('API key')) {
            throw new Error('مفتاح API غير صالح. يرجى التحقق من الإعدادات.');
        }
        if (error.message?.includes('quota')) {
            throw new Error('تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.');
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
        // Check DB
        const dbKey = await getAppSetting('GEMINI_API_KEY');
        if (dbKey) return true;

        // Check Env
        return Boolean(process.env.GEMINI_API_KEY);
    } catch {
        return false;
    }
}
