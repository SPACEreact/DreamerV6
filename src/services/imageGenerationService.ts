// ========================================================================
// IMAGE GENERATION SERVICES - High-res cinematic fallbacks
// ========================================================================

import {
    MINIMAL_PLACEHOLDER_BASE64,
    renderPlaceholderBase64,
    selectFallbackStyle
} from '../utils/imagePlaceholders';

export const generateImage = async (
    prompt: string,
    aspectRatio: string = '16:9',
    style: 'cinematic' | 'explainer' = 'cinematic'
): Promise<string> => {
    try {
        // Enhanced prompt for better cinematic results
        const stylePrefix = style === 'explainer'
            ? 'A clean, professional illustration for an explainer video. Modern, clear design with friendly colors and excellent composition.'
            : 'Create a cinematic, professional-quality image with dramatic lighting, excellent composition, and photorealistic detail. Focus on mood, atmosphere, and cinematic visual storytelling.';

        const enhancedPrompt = `${stylePrefix}\n\nOriginal prompt: ${prompt}\n\nGenerate a high-quality ${aspectRatio} aspect ratio image that captures the essence of this cinematic scene with professional lighting and composition.`;

        console.log('Generating cinematic image for:', prompt.substring(0, 100) + '...');

        // Use our real image generation service
        const { generateRealImage } = await import('./realImageGeneration');
        return await generateRealImage(enhancedPrompt, aspectRatio, style);
    } catch (error) {
        console.error('Image generation failed:', error);
        // Always provide a fallback image
        return await generateImageDirect(prompt, aspectRatio, style);
    }
};

export const generateImageDirect = async (
    prompt: string,
    aspectRatio: string = '16:9',
    style: 'cinematic' | 'explainer' = 'cinematic'
): Promise<string> => {
    try {
        console.log('Using intelligent fallback for prompt:', prompt.substring(0, 100) + '...');
        return await generatePlaceholderImage(prompt, aspectRatio, style);
    } catch (error) {
        console.error('Image generation failed:', error);
        return await generatePlaceholderImage(prompt, aspectRatio, style);
    }
};

export const generatePlaceholderImage = async (
    prompt: string,
    aspectRatio: string,
    style: 'cinematic' | 'explainer' = 'cinematic'
): Promise<string> => {
    try {
        const placeholderStyle = selectFallbackStyle(prompt, style);
        return renderPlaceholderBase64(prompt, aspectRatio, placeholderStyle);
    } catch (error) {
        console.error('Placeholder generation failed:', error);
        return MINIMAL_PLACEHOLDER_BASE64;
    }
};

export const generateNanoImage = async (
    prompt: string,
    style: 'cinematic' | 'explainer' = 'cinematic'
): Promise<string> => {
    try {
        const stylePrefix = style === 'explainer'
            ? 'Create a clean, modern stylized illustration perfect for explainer videos. Simple, professional design with clear visual communication.'
            : 'Create a stylized, artistic interpretation of this cinematic scene with simplified visual elements and strong visual impact.';

        const enhancedPrompt = `${stylePrefix}\n\nScene: ${prompt}\n\nGenerate a stylized, simplified version with strong visual impact and artistic flair.`;

        console.log('Generating nano/stylized image for:', prompt.substring(0, 100) + '...');

        const { generateRealImage } = await import('./realImageGeneration');
        return await generateRealImage(enhancedPrompt, '1:1', style);
    } catch (error) {
        console.error('Nano image generation failed:', error);
        return await generateImageDirect(prompt, '1:1', style);
    }
};

// Helper function to download base64 images
export const downloadBase64Image = (base64Data: string, mimeType: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64Data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
