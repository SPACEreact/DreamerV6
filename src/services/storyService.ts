import { GoogleGenAI } from "@google/genai";
import { geminiLogger } from '../lib/logger';
import { handleAIServiceError, sanitizeErrorMessage } from '../lib/errorHandler';
import { API_CONFIG } from '../constants';

// Initialize the Gemini AI client
const ai = new GoogleGenAI(API_CONFIG.GEMINI_API_KEY);

/**
 * Story-focused service for narrative ideation
 * This service focuses on story beats, character development, and narrative concepts
 * without cinematography filtering
 */

/**
 * Generate story ideas from a simple concept
 * Focuses on narrative elements, story beats, and creative storytelling
 * without cinematography restrictions
 */
export const generateStoryFromIdea = async (idea: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Based on this cinematic concept: "${idea}"

Generate 3-5 creative scene descriptions that expand this idea into vivid, director-level prompts. Each should be 1-2 sentences and capture mood, character, and visual atmosphere. Focus on narrative elements, story beats, character development, and emotional arcs. Format them as separate paragraphs, separated by a double newline.

Feel free to explore:
- Character motivations and emotional states
- Plot developments and story beats  
- Thematic elements and symbolic imagery
- Dialogue or character interactions
- Emotional atmosphere and mood
- Conflict or tension building`,
            config: {

            },
        });
        const content = response.text;
        return content.split(/\n\n+/).map(scene => scene.trim()).filter(Boolean);
    } catch (error) {
        handleAIServiceError(error, 'Story Generation');
        return [];
    }
};

/**
 * Generate character-driven story development
 * Helps expand on character arcs and relationships
 */
export const generateCharacterDevelopment = async (character: string, context: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Based on this character: "${character}"

Context: ${context}

Generate 3-4 character development suggestions that explore:
- Character motivations and inner conflicts
- Character growth and transformation moments
- Relationship dynamics with other characters
- Emotional arcs and psychological depth
- Character backstory connections to the plot

Format as separate paragraphs with actionable narrative insights.`,
            config: {

            },
        });
        const content = response.text;
        return content.split(/\n\n+/).map(scene => scene.trim()).filter(Boolean);
    } catch (error) {
        handleAIServiceError(error, 'Character Development');
        return [];
    }
};

/**
 * Generate plot development suggestions
 * Focuses on story structure and narrative progression
 */
export const generatePlotDevelopment = async (currentPlot: string, desiredOutcome: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Current plot situation: "${currentPlot}"

Desired outcome: "${desiredOutcome}"

Generate 3-4 plot development suggestions that explore:
- Logical story progression and cause-and-effect
- Conflict escalation and tension building
- Plot twists and unexpected developments
- Character decisions that drive the story forward
- Thematic resolution and payoff

Format as separate paragraphs with specific narrative direction.`,
            config: {

            },
        });
        const content = response.text;
        return content.split(/\n\n+/).map(scene => scene.trim()).filter(Boolean);
    } catch (error) {
        handleAIServiceError(error, 'Plot Development');
        return [];
    }
};

/**
 * Generate thematic exploration suggestions
 * Helps develop deeper meaning and symbolism in the story
 */
export const generateThematicExploration = async (theme: string, storyContext: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Theme to explore: "${theme}"

Story context: ${storyContext}

Generate 3-4 thematic exploration suggestions that explore:
- Symbolic imagery and metaphor
- Character actions that embody the theme
- Dialogue and interaction that reveals deeper meaning
- Visual storytelling elements that support the theme
- Contrasting elements that highlight the theme

Format as separate paragraphs with thematic insights.`,
            config: {

            },
        });
        const content = response.text;
        return content.split(/\n\n+/).map(scene => scene.trim()).filter(Boolean);
    } catch (error) {
        handleAIServiceError(error, 'Thematic Exploration');
        return [];
    }
};