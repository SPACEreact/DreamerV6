



import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ExtractedKnowledge, StoryboardShot, SequenceStyle, CompositionData, LightingData, ColorGradingData, CameraMovementData, CompositionCharacter } from "../types";
import { huggingFaceService } from "./huggingFaceService";
import { geminiLogger } from '../lib/logger';
import { handleAIServiceError, sanitizeErrorMessage } from '../lib/errorHandler';
import { API_CONFIG, NUMERIC } from '../constants';

// Helper keywords to keep Dreamer Insight focused on cinematography rather than story beats
const CINEMATOGRAPHY_KEYWORDS = [
    'camera', 'shot', 'frame', 'lighting', 'light', 'lens', 'composition', 'color', 'grading',
    'angle', 'movement', 'blocking', 'depth', 'exposure', 'focus', 'silhouette', 'shadow', 'contrast',
    'visual', 'cinematic', 'cinematography', 'framing', 'gobo', 'practical', 'aperture', 'pan', 'tilt', 'dolly', 'zoom',
    'rack focus', 'wide', 'close-up', 'b-roll'
];

const NARRATIVE_BLOCKLIST = [
    'protagonist', 'antagonist', 'character arc', 'character', 'journey', 'plot', 'story',
    'narrative', 'theme', 'stakes', 'motivation', 'goal', 'desire', 'conflict', 'backstory',
    'dialogue', 'beat', 'twist', 'act', 'scene arc', 'story arc', 'emotional arc', 'relationship'
];

export interface CinematographyInsight {
    text: string;
    score: number;
    source: 'knowledge' | 'ai';
    rationale?: string;
}

export interface InsightResult {
    bestSuggestion: CinematographyInsight | null;
    rankedSuggestions: CinematographyInsight[];
    relevantKnowledge: string[];
}

interface InsightCandidate {
    text: string;
    source: 'knowledge' | 'ai';
    knowledgeRef?: string;
    matchedElements?: string[];
    matchedVisualCues?: string[];
}

interface NarrativeAnalysisSnapshot {
    emotionalTone: string;
    narrativeElements: string[];
    visualCues: string[];
    genre: string;
}

const DEFAULT_NARRATIVE_ANALYSIS: NarrativeAnalysisSnapshot = {
    emotionalTone: 'neutral',
    narrativeElements: ['storytelling'],
    visualCues: ['composition', 'lighting'],
    genre: 'drama'
};

const filterCinematographySuggestions = (suggestions: string[]): string[] => {
    return suggestions.filter(suggestion => {
        const lower = suggestion.toLowerCase();
        if (NARRATIVE_BLOCKLIST.some(term => lower.includes(term))) {
            return false;
        }
        return CINEMATOGRAPHY_KEYWORDS.some(keyword => lower.includes(keyword));
    });
};

const DEFAULT_CINEMATOGRAPHY_SUGGESTIONS = [
    'Lock a 35mm lens at eye level and dolly in slowly to let the performance swell into the frame.',
    'Motivate the key light from a practical source, then feather a soft fill to retain texture in the shadows.',
    'Stage the action in foreground, midground, and background layers so the blocking paints depth through the shot.',
    'Float the camera on a controlled handheld sway to translate the emotional turbulence into motion.',
    'Balance warm key light with a cool rim to sculpt silhouettes and echo the scene\'s tonal contrast.'
];

const enforceCinematographyFocus = async (
    rawSuggestions: string[],
    context: string,
    currentQuestion: string
): Promise<string[]> => {
    const alreadyFocused = filterCinematographySuggestions(rawSuggestions);
    if (alreadyFocused.length > 0) {
        return alreadyFocused.slice(0, 5);
    }

    if (rawSuggestions.length > 0) {
        try {
            const formattedList = rawSuggestions
                .map((suggestion, index) => `${index + 1}. ${suggestion}`)
                .join('\n');

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: `These suggestions drift into narrative ideation. Rewrite each one as a cinematography-specific directive focused on camera, lensing, lighting, composition, or blocking.

Question: "${currentQuestion}"

Context:
${context}

Original suggestions:
${formattedList}

Return 3-5 bullet points that each stay strictly within cinematography craft and avoid plot or character development.`,
            });

            const refocused = filterCinematographySuggestions(extractCleanSuggestions(response.text));
            if (refocused.length > 0) {
                return refocused.slice(0, 5);
            }
        } catch (refocusError) {
            geminiLogger.warn('Unable to refocus suggestions on cinematography:', sanitizeErrorMessage(refocusError));
        }
    }

    return DEFAULT_CINEMATOGRAPHY_SUGGESTIONS.slice(0, 5);
};

// Helper function to extract clean suggestions - balanced filtering
const extractCleanSuggestions = (text: string): string[] => {
    const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const suggestions: string[] = [];
    
    for (const line of lines) {
        // Remove common prefixes
        let cleanLine = line
            .replace(/^- /,'')
            .replace(/^\* /,'')
            .replace(/^\d+\. /,'')
            .replace(/^[•-] /,'')
            .trim();
        
        // Skip empty lines
        if (!cleanLine) continue;
        
        // Skip very short lines (likely not meaningful suggestions)
        if (cleanLine.length < 8) continue;
        
        // Target the most problematic narrative patterns only
        const problematicPatterns = [
            /^(here|these|below|following|this|here's|here are|here is)/i,
            /^based on|^context:|^current question:|^scenario:/i,
            /^(remember|note that|keep in mind|bear in mind)/i,
            /^you might want to|^you should try|^you could consider/i,
            /^(the character|the scene|the story|the plot)/i,
            /^(as the|while the|during the|when the)/i,
            
            // Only specific story arc and subtext content
            /(inject subtext|hint at deeper|unspoken emotions|underlying tensions)/i,
            /(every scene should have|mini-arc|transforming the character)/i,
            /(who wants what from whom|what happens if they|why now)/i,
            /(subtext is the unsaid|what's felt|implied or hinted)/i,
            /(driving questions|powerful scene)/i
        ];
        
        // Skip only if it matches specific problematic patterns
        if (problematicPatterns.some(pattern => pattern.test(cleanLine))) {
            continue;
        }
        
        // Skip lines that are clearly explanations (very long with periods)
        if (cleanLine.length > 200 && cleanLine.endsWith('.')) {
            continue;
        }
        
        // Skip questions
        if (cleanLine.includes('?')) {
            continue;
        }
        
        // Accept the line as a potential suggestion
        suggestions.push(cleanLine);
    }

    return suggestions.filter(Boolean).slice(0, 6);
};

const rankInsights = (
    candidates: InsightCandidate[],
    narrativeAnalysis: NarrativeAnalysisSnapshot
): CinematographyInsight[] => {
    return candidates
        .filter(candidate => candidate.text && candidate.text.trim().length > 0)
        .map(candidate => {
            const matchedElements = new Set(candidate.matchedElements || []);
            const matchedVisualCues = new Set(candidate.matchedVisualCues || []);
            const lowerText = candidate.text.toLowerCase();

            narrativeAnalysis.narrativeElements.forEach(element => {
                if (lowerText.includes(element.toLowerCase())) {
                    matchedElements.add(element);
                }
            });

            narrativeAnalysis.visualCues.forEach(cue => {
                if (lowerText.includes(cue.toLowerCase())) {
                    matchedVisualCues.add(cue);
                }
            });

            let score = candidate.source === 'knowledge' ? 2 : 1.5;
            score += matchedElements.size * 0.75;
            score += matchedVisualCues.size * 1;

            const toneMatch = narrativeAnalysis.emotionalTone && lowerText.includes(narrativeAnalysis.emotionalTone.toLowerCase());
            if (toneMatch) {
                score += 0.5;
            }

            if (CINEMATOGRAPHY_KEYWORDS.some(keyword => lowerText.includes(keyword))) {
                score += 0.25;
            }

            const rationaleParts: string[] = [];

            if (candidate.knowledgeRef) {
                rationaleParts.push(`Anchored in ${candidate.knowledgeRef}.`);
            }

            if (matchedElements.size > 0) {
                rationaleParts.push(`Reinforces narrative elements like ${Array.from(matchedElements).join(', ')}.`);
            }

            if (matchedVisualCues.size > 0) {
                rationaleParts.push(`Targets visual cues such as ${Array.from(matchedVisualCues).join(', ')}.`);
            }

            if (toneMatch) {
                rationaleParts.push(`Supports the ${narrativeAnalysis.emotionalTone.toLowerCase()} tone identified in analysis.`);
            }

            if (candidate.source === 'ai' && !candidate.knowledgeRef && rationaleParts.length === 0) {
                rationaleParts.push('Synthesized from the scene context and cinematic cues.');
            }

            if (rationaleParts.length === 0) {
                rationaleParts.push("Aligns with the scene's cinematography focus.");
            }

            return {
                text: candidate.text,
                source: candidate.source,
                score: parseFloat(score.toFixed(2)),
                rationale: rationaleParts.join(' ')
            } as CinematographyInsight;
        })
        .sort((a, b) => b.score - a.score);
};

// Initialize GoogleGenAI with the Vite-provided Gemini API key.
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyBPs9SZIbFgYzGa0Q8IzOZ2_votD3GzT_s';

if (!geminiApiKey) {
  const errorMessage = 'Missing Gemini API key. Set VITE_GEMINI_API_KEY (or VITE_GOOGLE_API_KEY) in your environment.';
  geminiLogger.error(errorMessage);
  throw new Error(errorMessage);
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey });

/**
 * Enhanced error handler specifically for Gemini AI service
 */
function handleGeminiError(error: unknown, operation: string): never {
  const appError = handleAIServiceError(error, `Gemini AI - ${operation}`);
  throw new Error(appError.message);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const defaultComposition: CompositionData = { characters: [{ id: 'char-1', name: 'Subject A', x: 400, y: 225 }], cameraAngle: 'true-eye, honest', cameraHeight: 'eye-level witness' };
const defaultLighting: LightingData = { keyLightIntensity: 80, keyLightColor: '#FFD8A8', fillLightIntensity: 40, fillLightColor: '#89CFF0', backLightIntensity: 60, backLightColor: '#FACC15', ambientIntensity: 20, colorTemperature: 4500, mood: 'chiaroscuro confession' };
const defaultColorGrading: ColorGradingData = { colorGrade: 'Dreamer Grade', saturation: 10, contrast: 5, highlights: 5, shadows: -5, colorPalette: ['#0F172A', '#1E293B', '#475569', '#F97316', '#FBBF24', '#FDE68A', '#38BDF8', '#A855F7'], colorHarmony: 'complementary pulse' };
const defaultCameraMovement: CameraMovementData = { movementType: 'static contemplation', startPos: { x: 100, y: 300 }, endPos: { x: 700, y: 150 }, duration: 5, easing: 'ease-in-out', focalLength: 35 };

/**
 * Dynamic Token Budgeting System for Optimized API Usage
 */
class TokenBudgetingSystem {
    MIN_TOKENS: number;
    MAX_TOKENS: number;
    SAFE_MARGIN: number;
    complexityMultipliers: Record<string, number>;
    performanceHistory: Map<string, any>;
    successPatterns: Map<string, any>;

    constructor() {
        this.MIN_TOKENS = 1024;
        this.MAX_TOKENS = 4096;
        this.SAFE_MARGIN = 0.85;
        
        // Complexity multipliers (optimized for storyboard generation)
        this.complexityMultipliers = {
            'cinematic': 1.2,    // Reduced from 1.4 for efficiency
            'explainer': 0.7     // Simple, clear content
        };
        
        // Performance tracking
        this.performanceHistory = new Map();
        this.successPatterns = new Map();
    }

    /**
     * Intelligent token estimation based on script length and complexity
     */
    estimateTokens(script, style = 'explainer') {
        if (!script || script.trim().length === 0) {
            return 2048; // Default for empty scripts
        }

        // Base estimation (tokens per character)
        const scriptLength = script.length;
        const baseTokens = scriptLength * 0.5; // Conservative estimate
        
        // Apply style complexity multiplier
        const multiplier = this.complexityMultipliers[style] || 1.0;
        const adjustedTokens = baseTokens * multiplier;
        
        // Add prompt overhead (estimated 64 tokens for optimized prompts)
        const promptOverhead = 64;
        const totalEstimate = adjustedTokens + promptOverhead;
        
        // Apply safety margin and bounds
        const finalEstimate = Math.min(
            Math.max(totalEstimate * this.SAFE_MARGIN, this.MIN_TOKENS),
            this.MAX_TOKENS
        );

        return Math.floor(finalEstimate);
    }

    /**
     * Smart retry logic with controlled token reduction
     */
    calculateRetryTokens(attempt, lastError, currentTokens) {
        if (attempt >= 4) return null; // Max 3 retries
        
        if (this.isTokenLimitError(lastError)) {
            const reductionFactors = [0.8, 0.6, 0.4]; // 20%, 40%, 60% reduction
            const reductionFactor = reductionFactors[attempt - 1] || 0.4;
            const newTokens = Math.floor(currentTokens * reductionFactor);
            
            return {
                shouldRetry: true,
                tokens: Math.max(newTokens, this.MIN_TOKENS),
                reason: `Token limit - reduced by ${(1 - reductionFactor) * 100}%`
            };
        }
        
        return null;
    }

    isTokenLimitError(error) {
        return error.message && (
            error.message.includes('429') ||
            error.message.includes('resource exhausted') ||
            error.message.includes('token limit') ||
            error.message.includes('quota exceeded')
        );
    }
}

const tokenBudgetingSystem = new TokenBudgetingSystem();


export const extractKnowledge = async (content: string): Promise<ExtractedKnowledge | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Analyze this document and extract cinematographic knowledge. Focus on key themes, visual styles, common character archetypes, and specific filmmaking techniques mentioned or implied.\n\nDOCUMENT:\n${content.substring(0, 8000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key thematic elements." },
            visualStyles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Visual or stylistic approaches." },
            characters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Character archetypes or roles." },
            techniques: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Filmmaking techniques or concepts." },
          },
          required: ["themes", "visualStyles", "characters", "techniques"],
        },

      },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as ExtractedKnowledge;
  } catch (error) {
    geminiLogger.error('Knowledge extraction failed:', sanitizeErrorMessage(error));
    return null;
  }
};

export const getAISuggestions = async (
    context: string,
    currentQuestion: string,
    _knowledgeDocs: any[] = []
): Promise<InsightResult> => {
    let narrativeAnalysis: NarrativeAnalysisSnapshot = DEFAULT_NARRATIVE_ANALYSIS;

    try {
        await huggingFaceService.initialize();
        narrativeAnalysis = await huggingFaceService.analyzeNarrative(context);

        const enhancedContext = `${context}\n\nNARRATIVE ANALYSIS (Local AI):\nGenre: ${narrativeAnalysis.genre}\nEmotional Tone: ${narrativeAnalysis.emotionalTone}\nVisual Cues: ${narrativeAnalysis.visualCues.join(', ')}\nNarrative Elements: ${narrativeAnalysis.narrativeElements.join(', ')}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `You are a cinematography mentor helping a director of photography make visual decisions.

Provide 3-5 concise suggestions that stay strictly focused on cinematic execution: camera placement, lensing, movement, lighting design, color treatment, composition, blocking, or shot rhythm. Avoid any plot ideas, character arcs, dialogue notes, or general storytelling advice.

Current question: "${currentQuestion}"

Context: ${enhancedContext}

Respond with cinematography suggestions only:`,
            config: {

            }
        });

        const suggestionsText = response.text;
        const suggestions = extractCleanSuggestions(suggestionsText);
        const focusedSuggestions = await enforceCinematographyFocus(suggestions, enhancedContext, currentQuestion);

        const candidates: InsightCandidate[] = focusedSuggestions.map(suggestion => ({
            text: suggestion,
            source: 'ai'
        }));

        const rankedSuggestions = rankInsights(candidates, narrativeAnalysis);
        return {
            bestSuggestion: rankedSuggestions[0] ?? null,
            rankedSuggestions,
            relevantKnowledge: []
        };
    } catch (error) {
        handleAIServiceError(error, 'Get AI Suggestions');
        const fallbackCandidates: InsightCandidate[] = DEFAULT_CINEMATOGRAPHY_SUGGESTIONS.slice(0, 3).map(suggestion => ({
            text: suggestion,
            source: 'ai'
        }));
        const rankedSuggestions = rankInsights(fallbackCandidates, narrativeAnalysis);
        return {
            bestSuggestion: rankedSuggestions[0] ?? null,
            rankedSuggestions,
            relevantKnowledge: []
        };
    }
};

export const getRandomInspiration = async (context: string, currentQuestion: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `You are a creative assistant. Based on the core idea of the scene, provide one, single, concise, and inspiring suggestion for the following question. The suggestion should be a fresh take but still relevant to the scene's context. Return only the suggestion text itself.

            SCENE CONTEXT:
            "${context}"

            CURRENT QUESTION:
            "${currentQuestion}"`,
        });
        return response.text.trim();
    } catch (error) {
        handleAIServiceError(error, 'Get Random Inspiration');
        return "A lone figure against a vast, empty landscape.";
    }
};

// Enhanced function for knowledge-based suggestions
export const getKnowledgeBasedSuggestions = async (
    context: string,
    currentQuestion: string,
    knowledgeDocs: any[] = []
): Promise<InsightResult> => {
    let narrativeAnalysis: NarrativeAnalysisSnapshot = DEFAULT_NARRATIVE_ANALYSIS;

    try {
        await huggingFaceService.initialize();
        narrativeAnalysis = await huggingFaceService.analyzeNarrative(context);

        const relevantKnowledge: string[] = [];
        const knowledgeCandidates: InsightCandidate[] = [];
        const seenSuggestions = new Set<string>();

        knowledgeDocs.forEach(doc => {
            const themes: string[] = doc?.extractedKnowledge?.themes || [];
            const techniques: string[] = doc?.extractedKnowledge?.techniques || [];
            const visualStyles: string[] = doc?.extractedKnowledge?.visualStyles || [];

            const matchedElements = narrativeAnalysis.narrativeElements.filter(element =>
                themes.some(theme => element.toLowerCase().includes(theme.toLowerCase()))
            );

            const matchedVisuals = narrativeAnalysis.visualCues.filter(cue =>
                visualStyles.some(style => cue.toLowerCase().includes(style.toLowerCase()))
            );

            if ((matchedElements.length > 0 || matchedVisuals.length > 0) && techniques.length > 0) {
                relevantKnowledge.push(`${doc?.name || 'Knowledge'}: ${techniques.slice(0, 2).join(', ')}`);

                techniques.slice(0, 2).forEach(technique => {
                    const techniqueLower = technique.toLowerCase();
                    const narrativeTerms = [
                        ...NARRATIVE_BLOCKLIST,
                        'subtext', 'dialogue', 'character development', 'scene arc', 'screenplay',
                        'metaphor', 'exposition', 'prologue', 'epilogue', 'chapter', 'obstacle',
                        'growth', 'evolution', 'transformation'
                    ];

                    if (narrativeTerms.some(term => techniqueLower.includes(term))) {
                        return;
                    }

                    const suggestion = `Apply ${techniqueLower} to elevate the visuals.`;
                    const normalized = suggestion.toLowerCase();
                    if (seenSuggestions.has(normalized)) {
                        return;
                    }

                    seenSuggestions.add(normalized);

                    if (filterCinematographySuggestions([suggestion]).length === 0) {
                        return;
                    }

                    knowledgeCandidates.push({
                        text: suggestion,
                        source: 'knowledge',
                        knowledgeRef: doc?.name,
                        matchedElements,
                        matchedVisualCues: matchedVisuals
                    });
                });
            }
        });

        const enhancedContext = `${context}\n\nRELEVANT KNOWLEDGE: ${relevantKnowledge.join(' | ')}\nNARRATIVE TYPE: ${narrativeAnalysis.genre} (${narrativeAnalysis.emotionalTone})`;

        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Based on this context, provide 2-3 cinematography-forward ideas for: "${currentQuestion}"

Keep every suggestion rooted in the visuals—camera language, lighting treatment, composition, color or blocking choices. Do not offer plot beats, character arcs, or other story ideation guidance.

Context: ${enhancedContext}

Respond with cinematography-focused ideas only:`,
        });

        const aiSuggestions = extractCleanSuggestions(aiResponse.text);
        const focusedAiSuggestions = await enforceCinematographyFocus(aiSuggestions, enhancedContext, currentQuestion);
        const aiCandidates: InsightCandidate[] = focusedAiSuggestions.map(suggestion => ({
            text: suggestion,
            source: 'ai'
        }));

        const rankedSuggestions = rankInsights([...knowledgeCandidates, ...aiCandidates], narrativeAnalysis);

        return {
            bestSuggestion: rankedSuggestions[0] ?? null,
            rankedSuggestions,
            relevantKnowledge
        };
    } catch (error) {
        handleAIServiceError(error, 'Knowledge-Based Suggestions');
        const fallbackCandidates: InsightCandidate[] = DEFAULT_CINEMATOGRAPHY_SUGGESTIONS.slice(0, 3).map(suggestion => ({
            text: suggestion,
            source: 'ai'
        }));
        const rankedSuggestions = rankInsights(fallbackCandidates, narrativeAnalysis);
        return {
            bestSuggestion: rankedSuggestions[0] ?? null,
            rankedSuggestions,
            relevantKnowledge: []
        };
    }
};


export const enhanceShotPrompt = async (basePrompt: string, context: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `You are a world-class cinematographer AI with a deep understanding of film theory and practice.
            Your task is to refine the following cinematic shot prompt.
            1.  Preserve all mission-critical technical settings from the base prompt (camera, lens, etc.).
            2.  Elevate the language to be more evocative, clear, and director-ready.
            3.  Weave in continuity cues from the provided context (previous shots, overall script).
            4.  Leverage advanced cinematic terminology from your knowledge base where appropriate to add professional depth.
            Return only the single, enhanced prompt, without any introductory text.

            CONTEXT:
            ${context}

            BASE PROMPT:
            ${basePrompt}`,
            config: {

            },
        });
        return response.text;
    } catch (error) {
        handleAIServiceError(error, 'Shot Enhancement');
        throw new Error("Failed to enhance prompt.");
    }
};

/**
 * Robust JSON extraction with multiple strategies to handle malformed or truncated responses
 */
const extractJSON = (text: string): any => {
  if (!text || text.trim().length === 0) {
    throw new Error('Empty response from API');
  }

  // Strategy 1: Direct JSON.parse
  try {
    return JSON.parse(text);
  } catch (e) {

  }
  
  // Strategy 2: Extract JSON from markdown code blocks
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch (e) {

    }
  }
  
  // Strategy 3: Find first { or [ and last } or ]
  const firstBracket = text.indexOf('[');
  const firstBrace = text.indexOf('{');
  let start = -1;
  if (firstBracket === -1) {
    start = firstBrace;
  } else if (firstBrace === -1) {
    start = firstBracket;
  } else {
    start = Math.min(firstBracket, firstBrace);
  }

  if (start !== -1) {
    const lastBracket = text.lastIndexOf(']');
    const lastBrace = text.lastIndexOf('}');
    const end = Math.max(lastBracket, lastBrace);
    if (end > start) {
      try {
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
      } catch (e) {

      }
    }
  }
  
  // Strategy 4: Try to repair truncated JSON
  try {
    let cleaned = text.trim();
    // If ends with incomplete string, try to close it
    if (cleaned.match(/"[^"]*$/)) {
      cleaned = cleaned.substring(0, cleaned.lastIndexOf('"')) + '"}]';
    }
    // If ends with incomplete object, try to close it
    else if (cleaned.match(/[^}\]]*$/)) {
      cleaned = cleaned + '}]';
    }
    return JSON.parse(cleaned);
  } catch (e) {
    // All JSON parsing strategies failed
  }
  
  throw new Error('Unable to extract valid JSON from response');
};

/**
 * Validate response before parsing
 */
const validateResponse = (text: string): boolean => {
  if (!text || text.trim().length === 0) {
    throw new Error('Empty response from API');
  }
  
  // Check for obvious truncation indicators
  if (text.includes('...') && text.lastIndexOf('}') < text.length - 10) {

  }
  
  return true;
};

export const generateStoryboard = async (script: string, style: 'cinematic' | 'explainer' = 'cinematic', customInstructions: string = ''): Promise<StoryboardShot[]> => {
    return generateStoryboardWithRetry(script, style, customInstructions, 4096);
};

/**
 * Generate storyboard with retry logic for truncated responses
 */
const generateStoryboardWithRetry = async (
    script: string, 
    style: 'cinematic' | 'explainer', 
    customInstructions: string, 
    maxTokens: number,
    attempt: number = 1
): Promise<StoryboardShot[]> => {
    try {
        const instructionsSection = customInstructions.trim() 
            ? `\n\nCUSTOM INSTRUCTIONS:\n${customInstructions}\n\nPlease incorporate these specific instructions into your storyboard generation, adjusting the visual style, composition, lighting, and overall approach accordingly while maintaining the core narrative.`
            : '';

        // Simplified prompts for better reliability
        const prompt = style === 'explainer' 
            ? `Generate explainer video storyboard:
• Each shot = 3-3.5 seconds narration
• Focus: clean, simple visuals that illustrate narration
• Style: modern illustrations (not photorealism)
• Avoid complex cinematic jargon${instructionsSection}

SCRIPT:
${script}`
            : `Generate visual storyboard from script:
• Each shot = 2.5-3 seconds screen time
• Break long lines into multiple shots
• Include: camera movements, framing, composition, lighting mood
• Use industry-standard cinematography terms${instructionsSection}

SCRIPT:
${script}`;

        // Dynamic token budgeting - intelligent allocation
        const estimatedTokens = tokenBudgetingSystem.estimateTokens(script, style);
        const actualMaxTokens = Math.min(estimatedTokens, maxTokens);

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            screenplayLine: { type: Type.STRING },
                            shotDetails: {
                                type: Type.OBJECT,
                                properties: {
                                    shotType: { type: Type.STRING },
                                    cameraAngle: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    lightingMood: { type: Type.STRING },
                                    cameraMovement: { type: Type.STRING }
                                }
                            }
                        }
                    }
                },
                maxOutputTokens: actualMaxTokens,
            },
        });
        
        const responseText = response.text.trim();
        validateResponse(responseText);
        const parsedData = extractJSON(responseText);

        // Ensure the output is always an array
        if (Array.isArray(parsedData) && parsedData.length > 0) {
            return parsedData;
        } else if (typeof parsedData === 'object' && parsedData !== null) {
            return [parsedData];
        }

        throw new Error("Failed to parse storyboard: result was not an array or object.");

    } catch (error) {
        geminiLogger.error(`Storyboard generation failed on attempt ${attempt}:`, sanitizeErrorMessage(error));
        
        // Smart retry logic with intelligent token reduction
        if (attempt < 3) {
            try {
                const retryPlan = tokenBudgetingSystem.calculateRetryTokens(attempt, error, maxTokens);
                if (retryPlan && retryPlan.shouldRetry) {
                    geminiLogger.info(`Retrying storyboard generation with reduced tokens: ${retryPlan.tokens}`);
                    return generateStoryboardWithRetry(script, style, customInstructions, retryPlan.tokens, attempt + 1);
                }
            } catch (retryError) {
                geminiLogger.error('Retry planning failed:', sanitizeErrorMessage(retryError));
            }
        }
        
        // Enhanced error message
        const contextError = new Error(
            `Storyboard generation failed after ${attempt} attempts: ${error.message}. ` +
            `Optimized tokens: ${maxTokens}. Try simpler script or wait for quota reset.`
        );
        
        handleAIServiceError(contextError, 'Storyboard Generation');
        throw contextError;
    }
};

export const makeExplainerPromptCinematic = async (shot: StoryboardShot, knowledgeContext: string): Promise<StoryboardShot> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `You are a world-class Director of Photography, transforming a simple explainer video concept into a full-fledged cinematic shot.
            
            Analyze the provided simple shot description and the cinematic knowledge base. Your task is to completely rewrite the 'shotDetails' to be evocative, professional, and visually rich.
            
            - **Elevate the Language:** Use strong, descriptive verbs and professional cinematography terms.
            - **Incorporate Theory:** Weave in concepts from the knowledge base regarding lighting, composition, and camera movement.
            - **Add Specificity:** Suggest a specific lens, f-stop, or lighting setup if it serves the mood.
            - **Maintain Core Idea:** The cinematic shot must still convey the core subject of the original explainer shot.
            
            **CINEMATIC KNOWLEDGE BASE:**
            ---
            ${knowledgeContext.substring(0, 10000)} 
            ---
            
            **ORIGINAL EXPLAINER SHOT:**
            ${JSON.stringify(shot, null, 2)}
            
            Return ONLY the rewritten JSON for the entire StoryboardShot object, with the updated shotDetails. Do not include any other text or markdown formatting. The output must be a single, valid JSON object.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        screenplayLine: { type: Type.STRING },
                        shotDetails: {
                            type: Type.OBJECT,
                            properties: {
                                shotType: { type: Type.STRING },
                                cameraAngle: { type: Type.STRING },
                                description: { type: Type.STRING },
                                lightingMood: { type: Type.STRING },
                                cameraMovement: { type: Type.STRING }
                            },
                            required: ["shotType", "cameraAngle", "description", "lightingMood", "cameraMovement"]
                        }
                    },
                    required: ["screenplayLine", "shotDetails"]
                },
        
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        handleAIServiceError(error, 'Make Prompt Cinematic');
        throw new Error("Failed to enhance explainer prompt into a cinematic one.");
    }
};

export const generateVideoPrompt = async (
    basePrompt: string,
    image?: { base64: string; mimeType: string; },
    userInstructions?: string
): Promise<string> => {
    try {
        let userPrompt: string;
        const contents: { parts: any[] } = { parts: [] };

        if (image) {
            userPrompt = `As a master cinematographer, analyze the provided still image and its original prompt. Your task is to generate a concise, powerful video prompt for a text-to-video AI (like Sora or Veo) that brings this static scene to life.

            ORIGINAL PROMPT:
            "${basePrompt}"

            USER INSTRUCTIONS FOR MOTION (if any):
            "${userInstructions || 'None provided. Use your creative expertise to suggest a compelling camera movement that enhances the scene\'s emotional core.'}"

            Based on the image's composition, mood, and the provided context, describe the initial action or subtle movement. Suggest a camera motion (e.g., slow dolly in, gentle pan left, static shot with atmospheric changes). Describe how the scene should evolve over a short clip.

            Return only the final video prompt, ready to be used.`;

            const imagePart = { inlineData: { mimeType: image.mimeType, data: image.base64 } };
            contents.parts.push(imagePart);
        } else {
            userPrompt = `As a master cinematographer, analyze the provided cinematic prompt. Your task is to generate a concise, powerful video prompt for a text-to-video AI (like Sora or Veo) that imagines this scene in motion.

            ORIGINAL PROMPT:
            "${basePrompt}"

            USER INSTRUCTIONS FOR MOTION (if any):
            "${userInstructions || 'None provided. Use your creative expertise to suggest a compelling camera movement that enhances the scene\'s emotional core.'}"

            Based on the prompt's description, mood, and technical details, describe a compelling camera motion (e.g., slow dolly in, gentle pan left, static shot with atmospheric changes) and any initial character or environmental action. Describe how the scene should evolve over a short clip.

            Return only the final video prompt, ready to be used.`;
        }
        
        contents.parts.push({ text: userPrompt });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: contents,

        });

        return response.text.trim();
    } catch (error) {
        handleAIServiceError(error, 'Video Prompt Generation');
        throw new Error("Failed to generate video prompt.");
    }
};

export const getTimelineSuggestion = async (context: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `You are Dreamer, an expert film editor AI grounded in cinematic theory (Walter Murch's Rule of Six, etc.). Analyze the provided storyboard context and suggest a professional, creative edit or transition.
            
            CONTEXT:
            ${context}
            
            Based on this, provide a single, actionable suggestion. For example: "Suggest a match cut from the character's hand to a similar shape in the next shot to create a strong visual link." or "A J-cut here would build anticipation before the reveal."
            
            Return only the suggestion.`,

        });
        return response.text.trim();
    } catch (error) {
        handleAIServiceError(error, 'Timeline Suggestion');
        return "Suggestion failed.";
    }
};

export const analyzeSequenceStyle = async (prompts: string[]): Promise<SequenceStyle> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Analyze the following cinematic shot prompts to determine the sequence's overall "Visual DNA".
            
            PROMPTS:
            ${prompts.join('\n\n')}
            
            Based on the prompts, provide a summary of the visual style, a likely color palette, and the dominant mood.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        visualDNA: { type: Type.STRING, description: "A summary of the core visual style (e.g., 'Handheld emotional realism with shallow depth of field')." },
                        colorPalette: { type: Type.STRING, description: "The likely color palette (e.g., 'Desaturated blues and cold tungsten highlights')." },
                        mood: { type: Type.STRING, description: "The dominant mood of the sequence (e.g., 'Melancholic and introspective')." },
                    },
                    required: ["visualDNA", "colorPalette", "mood"],
                },

            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        handleAIServiceError(error, 'Sequence Style Analysis');
        return { visualDNA: 'Analysis failed.', colorPalette: 'N/A', mood: 'N/A' };
    }
};

export const generateBrollPrompt = async (context: string, style: SequenceStyle | null): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Generate a concise, cinematic B-roll or establishing shot prompt. It should be atmospheric and relevant to the surrounding scene context.
            
            CONTEXT OF SURROUNDING SHOTS:
            ${context}
            
            ${style ? `Adhere to the established sequence style:
            - Visual DNA: ${style.visualDNA}
            - Color Palette: ${style.colorPalette}
            - Mood: ${style.mood}` : 'Establish a compelling visual mood.'}
            
            Return only the prompt text.`,
        });
        return response.text.trim();
    } catch (error) {
        handleAIServiceError(error, 'B-roll Generation');
        return "An atmospheric shot of rain on a window pane.";
    }
};

export const generateSmartVisualDescription = async (
    visuals: {
        composition: CompositionData,
        lighting: LightingData,
        color: ColorGradingData,
        camera: CameraMovementData,
    },
    knowledgeContext?: string
): Promise<string> => {
    try {
        const compositionDetails = visuals.composition.characters.length > 0
            ? `Characters are positioned as follows: ${visuals.composition.characters.map(c => `${c.name} at coordinates (X: ${Math.round(c.x)}, Y: ${Math.round(c.y)})`).join(', ')}.`
            : "There are no characters in the frame.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a master cinematographer. Based on the following structured visual data, write a single, evocative, cinematic paragraph describing the scene. Focus on composition, character placement, lighting mood, color theory, and camera work. Do not list the data; interpret it into a holistic description.

            DATA:
            - Composition: ${compositionDetails} The camera is at ${visuals.composition.cameraHeight} with a ${visuals.composition.cameraAngle} angle.
            - Lighting: The mood is ${visuals.lighting.mood}. Key light is at ${visuals.lighting.keyLightIntensity}% intensity with a color of ${visuals.lighting.keyLightColor}. The scene has a color temperature of ${visuals.lighting.colorTemperature}K.
            - Color: The grade is named "${visuals.color.colorGrade}" with a ${visuals.color.colorHarmony} harmony. Saturation is at ${visuals.color.saturation} and contrast is ${visuals.color.contrast}.
            - Camera Movement: The camera performs a ${visuals.camera.movementType} over ${visuals.camera.duration} seconds with ${visuals.camera.easing} easing, moving from (${visuals.camera.startPos.x}, ${visuals.camera.startPos.y}) to (${visuals.camera.endPos.x}, ${visuals.camera.endPos.y}). The focal length is ${visuals.camera.focalLength}mm.${knowledgeContext ? `
            ADDITIONAL KNOWLEDGE:
            ${knowledgeContext}` : ''}`,
        });
        return response.text.trim();
    } catch (error) {
        handleAIServiceError(error, 'Smart Visual Description');
        return "A visually compelling scene with detailed cinematography.";
    }
};

export const initializeVisualsFromStoryboardShot = async (shot: StoryboardShot): Promise<{
    composition: CompositionData,
    lighting: LightingData,
    color: ColorGradingData,
    camera: CameraMovementData,
}> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a cinematic pre-visualization expert. Based on the following storyboard shot description, generate a complete set of initial visual parameters. Provide reasonable, professional starting points for a visual editor.

            SHOT DETAILS:
            - Shot Type: ${shot.shotDetails.shotType}
            - Camera Angle: ${shot.shotDetails.cameraAngle}
            - Description: ${shot.shotDetails.description}
            - Lighting Mood: ${shot.shotDetails.lightingMood}
            - Camera Movement: ${shot.shotDetails.cameraMovement}

            Return a JSON object with the exact structure specified below. Do not include any other text or markdown formatting. The output must be a single, valid JSON object.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        composition: {
                            type: Type.OBJECT,
                            properties: {
                                characters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } }, description: "One or two default characters placed according to the description." },
                                cameraAngle: { type: Type.STRING, description: "One of the following: 'true-eye, honest', 'steep reverence', 'whispered low', 'Dutch slip'. Choose the most fitting." },
                                cameraHeight: { type: Type.STRING, description: "One of the following: 'ground-level soul gaze', 'eye-level witness', 'elevated guardian', 'angelic drift'. Choose the most fitting." },
                            },
                        },
                        lighting: {
                            type: Type.OBJECT,
                            properties: {
                                keyLightIntensity: { type: Type.NUMBER, description: "Value from 0-100." },
                                keyLightColor: { type: Type.STRING, description: "Hex color code." },
                                fillLightIntensity: { type: Type.NUMBER, description: "Value from 0-100." },
                                fillLightColor: { type: Type.STRING, description: "Hex color code." },
                                backLightIntensity: { type: Type.NUMBER, description: "Value from 0-100." },
                                backLightColor: { type: Type.STRING, description: "Hex color code." },
                                ambientIntensity: { type: Type.NUMBER, description: "Value from 0-100." },
                                colorTemperature: { type: Type.NUMBER, description: "Value from 2000-8000." },
                                mood: { type: Type.STRING, description: "The provided lighting mood string." },
                            },
                        },
                        color: {
                            type: Type.OBJECT,
                            properties: {
                                colorGrade: { type: Type.STRING, description: "A creative name for the color grade." },
                                saturation: { type: Type.NUMBER, description: "Value from -50 to 50." },
                                contrast: { type: Type.NUMBER, description: "Value from -50 to 50." },
                                highlights: { type: Type.NUMBER, description: "Value from -50 to 50." },
                                shadows: { type: Type.NUMBER, description: "Value from -50 to 50." },
                                colorPalette: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 8 hex color codes." },
                                colorHarmony: { type: Type.STRING, description: "One of the predefined harmony options." },
                            },
                        },
                        camera: {
                            type: Type.OBJECT,
                            properties: {
                                movementType: { type: Type.STRING, description: "One of the predefined movement types." },
                                startPos: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } },
                                endPos: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } },
                                duration: { type: Type.NUMBER },
                                easing: { type: Type.STRING, description: "One of 'linear', 'ease-in', 'ease-out', 'ease-in-out'." },
                                focalLength: { type: Type.NUMBER, description: "A common focal length like 24, 35, 50, 85." },
                            },
                        },
                    },
                },
            },
        });
        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);

        if (!parsed.composition.characters || parsed.composition.characters.length === 0) {
            parsed.composition.characters = [{ id: 'char-1', name: 'Subject A', x: 400, y: 225 }];
        }
        parsed.composition.characters.forEach((c: CompositionCharacter) => {
            if (!c.id) c.id = `char-${Math.random()}`;
        });

        return parsed;
    } catch (error) {
        handleAIServiceError(error, 'Visual Initialization');
        return {
            composition: clone(defaultComposition),
            lighting: clone(defaultLighting),
            color: clone(defaultColorGrading),
            camera: clone(defaultCameraMovement),
        };
    }
};

// ========================================================================
// SOUND DESIGN MODULE SERVICES
// ========================================================================

// ========================================================================
// CASTING ASSISTANT SERVICES
// ========================================================================
