// Enhanced Gemini-Powered Image Generation Service
// Uses Google Gemini 2.0 Flash for professional image generation

import { generateImage, generateNanoImage as geminiGenerateNanoImage } from './geminiService';
import {
    MINIMAL_PLACEHOLDER_BASE64,
    renderPlaceholderBase64,
    selectFallbackStyle
} from '../utils/imagePlaceholders';

// Rate limiting configuration
let requestCount = 0;
let lastResetTime = Date.now();
const MAX_REQUESTS_PER_MINUTE = 30;
const RESET_INTERVAL = 60000; // 1 minute

const checkRateLimit = (): boolean => {
    const now = Date.now();
    if (now - lastResetTime > RESET_INTERVAL) {
        requestCount = 0;
        lastResetTime = now;
    }
    
    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
        return false;
    }
    
    requestCount++;
    return true;
};

export const generateRealImage = async (
    prompt: string, 
    aspectRatio: string = '16:9', 
    style: 'cinematic' | 'explainer' = 'cinematic'
): Promise<string> => {
    try {
        // Check rate limiting
        if (!checkRateLimit()) {
            return await createIntelligentFallback(prompt, aspectRatio, style);
        }

        // Enhanced prompt for better cinematic results
        const stylePrefix = style === 'explainer'
            ? 'Create a clean, professional explainer video illustration. Modern design, clear communication, friendly colors, perfect for educational content.'
            : 'Create a cinematic, professional-quality image with dramatic lighting, excellent composition, and photorealistic detail. Focus on mood, atmosphere, and cinematic visual storytelling.';

        const enhancedPrompt = `${stylePrefix}\n\nScene Description: ${prompt}\n\nGenerate a high-quality ${aspectRatio} aspect ratio image that captures the essence of this scene with professional lighting and composition.`;

        
        // Use Gemini real image generation
        const imageData = await generateImage(enhancedPrompt, aspectRatio, style);
        return imageData;
        
    } catch (error) {
        return await createIntelligentFallback(prompt, aspectRatio, style);
    }
};

export const generateNanoImage = async (
    prompt: string, 
    style: 'cinematic' | 'explainer' = 'cinematic'
): Promise<string> => {
    try {
        // Check rate limiting
        if (!checkRateLimit()) {
            return await createIntelligentFallback(prompt, '1:1', style);
        }

        // Generate stylized/simplified image for nano version
        const stylePrefix = style === 'explainer'
            ? 'Create a clean, modern stylized illustration perfect for explainer videos. Simple, professional design with clear visual communication and friendly colors.'
            : 'Create a stylized, artistic interpretation of this cinematic scene with simplified visual elements and strong visual impact.';
        
        const enhancedPrompt = `${stylePrefix}\n\nScene: ${prompt}\n\nGenerate a stylized, simplified version with strong visual impact and artistic flair. Perfect for thumbnails or quick previews.`;
        
        
        // Use Gemini nano image generation
        const imageData = await geminiGenerateNanoImage(enhancedPrompt, style);
        return imageData;
        
    } catch (error) {
        return await createIntelligentFallback(prompt, '1:1', style);
    }
};

const createIntelligentFallback = async (
    prompt: string,
    aspectRatio: string,
    style: 'cinematic' | 'explainer' = 'cinematic'
): Promise<string> => {
    try {
        const placeholderStyle = selectFallbackStyle(prompt, style);
        return renderPlaceholderBase64(prompt, aspectRatio, placeholderStyle);
    } catch (error) {
        return MINIMAL_PLACEHOLDER_BASE64;
    }
};

// Batch image generation with intelligent rate limiting
export const batchGenerateImages = async (
    prompts: string[], 
    aspectRatio: string = '16:9'
): Promise<{prompt: string, base64: string, success: boolean}[]> => {
    const results = [];
    
    for (const prompt of prompts) {
        try {
            const imageData = await generateRealImage(prompt, aspectRatio);
            results.push({ prompt, base64: imageData, success: true });
        } catch (error) {
            // Try fallback
            try {
                const fallbackData = await createIntelligentFallback(prompt, aspectRatio, 'cinematic');
                results.push({ prompt, base64: fallbackData, success: true });
            } catch (fallbackError) {
                results.push({ prompt, base64: '', success: false });
            }
        }
    }
    
    return results;
};

// Export usage statistics
export const getUsageStats = () => {
    return {
        requestCount,
        remainingRequests: Math.max(0, MAX_REQUESTS_PER_MINUTE - requestCount),
        resetTime: new Date(lastResetTime + RESET_INTERVAL),
        maxRequestsPerMinute: MAX_REQUESTS_PER_MINUTE
    };
};
