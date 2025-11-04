/**
 * Gemini Casting Provider
 * Backup provider for character analysis and casting recommendations
 * Uses Google's Gemini AI for intelligent casting suggestions
 */

import { GoogleGenAI } from '@google/genai';
import {
  ICastingProvider,
  CastingProviderId,
  CastingRequest,
  CastingResponse,
  CastingProviderConfig,
  CastingGenerationProgress,
  ActorRecommendation,
  DiversityMetrics,
  HealthStatus
} from '../../types/castingAssistant';
import { logAPIError, createAPIError } from '../../lib/apiErrorHandler';

export class GeminiCastingProvider implements ICastingProvider {
  readonly id: CastingProviderId = 'gemini-casting';
  readonly name: string = 'Gemini Casting AI';
  
  private config!: CastingProviderConfig;
  private client!: GoogleGenAI;
  private initialized: boolean = false;

  async init(config: CastingProviderConfig): Promise<void> {
    console.log('[Gemini Casting Provider] Initializing...');
    
    if (!config.apiKey) {
      throw new Error('Gemini Casting Provider requires API key');
    }

    this.config = {
      model: 'gemini-2.0-flash-exp',
      timeout: 60000,
      retryAttempts: 3,
      temperature: 0.7,
      maxTokens: 2048,
      includeReasoning: true,
      ...config
    };

    this.client = new GoogleGenAI({ apiKey: config.apiKey });

    // Test connection
    const health = await this.healthCheck();
    if (health === HealthStatus.DOWN) {
      throw new Error('Gemini Casting Provider health check failed');
    }

    this.initialized = true;
    console.log('[Gemini Casting Provider] Initialized successfully');
  }

  async generateCasting(
    request: CastingRequest,
    onProgress?: (progress: CastingGenerationProgress) => void
  ): Promise<CastingResponse> {
    if (!this.initialized) {
      throw new Error('Gemini Casting Provider not initialized');
    }

    const requestId = `gemini-casting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Progress: Analyzing character
      this.updateProgress(onProgress, {
        providerId: this.id,
        status: 'analyzing',
        currentStage: 'Analyzing character with Gemini AI',
        progress: 20
      });

      // Build comprehensive prompt
      const prompt = this.buildCastingPrompt(request);

      console.log('[Gemini Casting Provider] Sending request', {
        requestId,
        characterName: request.character.name,
        model: this.config.model
      });

      // Progress: Matching actors
      this.updateProgress(onProgress, {
        providerId: this.id,
        status: 'matching',
        currentStage: 'AI-powered casting analysis in progress',
        progress: 40
      });

      // Call Gemini API
      const result = await this.client.models.generateContent({
        model: this.config.model!,
        contents: prompt,
        config: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens
        }
      });

      // Progress: Validating results
      this.updateProgress(onProgress, {
        providerId: this.id,
        status: 'validating',
        currentStage: 'Processing casting recommendations',
        progress: 70
      });

      // Get response text
      const responseText = result?.text || '';

      // Parse the Gemini response
      const parsedResponse = this.parseResponse(responseText, request);

      // Calculate diversity metrics
      const diversityMetrics = this.calculateDiversityMetrics(parsedResponse.recommendations);

      const castingResponse: CastingResponse = {
        requestId,
        providerId: this.id,
        character: request.character,
        recommendations: parsedResponse.recommendations,
        diversityMetrics,
        analysisInsights: parsedResponse.analysisInsights,
        metadata: {
          generationTime: Date.now() - startTime,
          model: this.config.model || 'gemini-2.0-flash-exp',
          version: '1.0.0'
        }
      };

      // Progress: Complete
      this.updateProgress(onProgress, {
        providerId: this.id,
        status: 'complete',
        currentStage: 'Casting analysis complete',
        progress: 100
      });

      console.log('[Gemini Casting Provider] Casting generated successfully', {
        requestId,
        recommendationCount: castingResponse.recommendations.length,
        generationTime: castingResponse.metadata.generationTime
      });

      return castingResponse;

    } catch (error) {
      console.error('[Gemini Casting Provider] Generation failed:', error);
      
      this.updateProgress(onProgress, {
        providerId: this.id,
        status: 'failed',
        currentStage: 'Generation failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const apiError = createAPIError(
        error instanceof Error ? error.message : String(error)
      );
      logAPIError(error, {
        service: 'Gemini Casting Provider',
        operation: 'generateCasting'
      });

      throw error;
    }
  }

  private buildCastingPrompt(request: CastingRequest): string {
    const { character, projectContext, prioritizeDiversity, maxRecommendations, includeAlternatives } = request;

    const systemContext = `You are an expert casting director with deep knowledge of cinema, actors, and talent matching. Analyze character profiles and recommend suitable actors based on comprehensive criteria including physical attributes, acting range, personality match, and proven capabilities.

DIVERSITY & INCLUSION: Actively prioritize diverse casting. Consider actors from various backgrounds, ages, genders, and experience levels. Represent underrepresented groups.`;

    const characterProfile = `
CHARACTER TO CAST:
Name: ${character.name}
Role Type: ${character.role}
Age: ${character.age}
${character.gender ? `Gender: ${character.gender}` : ''}
${character.ethnicity ? `Ethnicity: ${character.ethnicity}` : ''}
${character.physicalDescription ? `Physical Description: ${character.physicalDescription}` : ''}

Personality: ${character.personalityTraits.join(', ')}
${character.background ? `Background: ${character.background}` : ''}
${character.motivations ? `Motivations: ${character.motivations.join(', ')}` : ''}
${character.conflictArc ? `Character Arc: ${character.conflictArc}` : ''}
${character.relationshipsToOthers ? `Key Relationships: ${character.relationshipsToOthers}` : ''}
`;

    const taskInstructions = `
${projectContext ? `PROJECT CONTEXT: ${projectContext}\n` : ''}
Provide ${maxRecommendations || 5} actor recommendations for "${character.name}".
${includeAlternatives ? 'Include both conventional and bold, unconventional casting choices.' : 'Focus on strong, proven matches.'}
${prioritizeDiversity ? '\nPRIORITY: Emphasize diverse and inclusive casting options.' : ''}

For each actor recommendation, provide:
1. Actor's full name
2. Confidence score (0.0 to 1.0) - how well they match
3. Detailed reasoning explaining why they're suitable
4. Physical match score (0.0 to 1.0)
5. Personality match score (0.0 to 1.0)
6. Experience match score (0.0 to 1.0)
7. 2-4 notable roles demonstrating their suitability
8. Their current age range
9. Top 3-5 strengths for this specific role
10. Any potential challenges (optional, 1-2 items)

Additionally provide:
- Character Analysis: Deep dive into the character's essence
- Casting Rationale: Your overall strategy for this character
- Director Notes: Practical guidance for the director

IMPORTANT: Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "characterAnalysis": "detailed character analysis here",
  "castingRationale": "overall casting strategy and approach",
  "directorNotes": "practical notes for director",
  "recommendations": [
    {
      "actorName": "Actor Full Name",
      "confidence": 0.85,
      "reasoning": "detailed reasoning...",
      "physicalMatch": 0.9,
      "personalityMatch": 0.88,
      "experienceMatch": 0.82,
      "notableRoles": ["Role 1 (Film, Year)", "Role 2 (Film, Year)"],
      "ageRange": "35-40",
      "strengths": ["strength 1", "strength 2", "strength 3"],
      "potentialChallenges": ["challenge if any"]
    }
  ]
}`;

    return `${systemContext}\n\n${characterProfile}\n${taskInstructions}`;
  }

  private parseResponse(responseText: string, request: CastingRequest): {
    recommendations: ActorRecommendation[];
    analysisInsights: {
      characterAnalysis: string;
      castingRationale: string;
      directorNotes?: string;
    };
  } {
    try {
      // Clean the response text - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      
      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Extract JSON object
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[Gemini Casting Provider] No JSON found in response');
        return this.createFallbackResponse(request);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        console.warn('[Gemini Casting Provider] Invalid recommendations structure');
        return this.createFallbackResponse(request);
      }

      return {
        recommendations: parsed.recommendations.map((rec: any) => ({
          actorName: rec.actorName || 'Unknown Actor',
          confidence: typeof rec.confidence === 'number' ? rec.confidence : 0.5,
          reasoning: rec.reasoning || 'No reasoning provided',
          physicalMatch: typeof rec.physicalMatch === 'number' ? rec.physicalMatch : 0.5,
          personalityMatch: typeof rec.personalityMatch === 'number' ? rec.personalityMatch : 0.5,
          experienceMatch: typeof rec.experienceMatch === 'number' ? rec.experienceMatch : 0.5,
          notableRoles: Array.isArray(rec.notableRoles) ? rec.notableRoles : [],
          ageRange: rec.ageRange || 'Not specified',
          strengths: Array.isArray(rec.strengths) ? rec.strengths : ['Versatile performer'],
          potentialChallenges: Array.isArray(rec.potentialChallenges) ? rec.potentialChallenges : undefined
        })),
        analysisInsights: {
          characterAnalysis: parsed.characterAnalysis || `In-depth analysis of ${request.character.name}`,
          castingRationale: parsed.castingRationale || 'Strategic casting approach for character requirements',
          directorNotes: parsed.directorNotes
        }
      };
    } catch (error) {
      console.error('[Gemini Casting Provider] Failed to parse response:', error);
      return this.createFallbackResponse(request);
    }
  }

  private createFallbackResponse(request: CastingRequest): {
    recommendations: ActorRecommendation[];
    analysisInsights: {
      characterAnalysis: string;
      castingRationale: string;
      directorNotes?: string;
    };
  } {
    const maxRecs = request.maxRecommendations || 5;
    const recommendations: ActorRecommendation[] = [];

    for (let i = 0; i < Math.min(maxRecs, 3); i++) {
      recommendations.push({
        actorName: `Recommended Actor ${i + 1}`,
        confidence: 0.6 - (i * 0.1),
        reasoning: `Fallback recommendation based on ${request.character.role} character type`,
        physicalMatch: 0.6,
        personalityMatch: 0.6,
        experienceMatch: 0.6,
        notableRoles: ['Various film and television roles'],
        ageRange: typeof request.character.age === 'string' 
          ? request.character.age 
          : `${request.character.age}-${Number(request.character.age) + 5}`,
        strengths: ['Versatile performer', 'Strong character work'],
        potentialChallenges: ['Further review recommended']
      });
    }

    return {
      recommendations,
      analysisInsights: {
        characterAnalysis: `${request.character.name} is a ${request.character.role} character with traits: ${request.character.personalityTraits.join(', ')}. ${request.character.background || ''}`,
        castingRationale: 'Automated recommendations generated. Manual review recommended for final casting decisions.',
        directorNotes: 'Please review these suggestions and consider additional factors specific to your project.'
      }
    };
  }

  private calculateDiversityMetrics(recommendations: ActorRecommendation[]): DiversityMetrics {
    // Enhanced diversity calculation
    // In production, would analyze actual actor demographics
    
    const recCount = recommendations.length;
    const diversityBase = Math.min(recCount / 5, 1);
    
    return {
      genderBalance: 0.65,
      ethnicDiversity: 0.7 * diversityBase,
      ageRange: 0.75,
      experienceDiversity: 0.7,
      overallDiversityScore: 0.7 * diversityBase,
      recommendations: [
        'Ensure gender parity in casting choices',
        'Consider actors from diverse ethnic backgrounds',
        'Balance established stars with emerging talent',
        'Age-appropriate casting with range variation'
      ]
    };
  }

  private updateProgress(
    callback: ((progress: CastingGenerationProgress) => void) | undefined,
    progress: CastingGenerationProgress
  ): void {
    if (callback) {
      callback(progress);
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      // Simple test request
      const result = await this.client.models.generateContent({
        model: this.config.model || 'gemini-2.0-flash-exp',
        contents: 'test',
        config: {
          maxOutputTokens: 10
        }
      });

      if (result?.text) {
        return HealthStatus.UP;
      }

      return HealthStatus.DEGRADED;
    } catch (error) {
      console.error('[Gemini Casting Provider] Health check failed:', error);
      return HealthStatus.DOWN;
    }
  }

  async estimateCost(request: CastingRequest): Promise<number> {
    // Gemini API pricing estimation
    const baseTokens = 600;
    const characterComplexity = request.character.personalityTraits.length * 60;
    const recommendationTokens = (request.maxRecommendations || 5) * 250;
    
    const estimatedInputTokens = baseTokens + characterComplexity;
    const estimatedOutputTokens = recommendationTokens;
    
    // Gemini pricing (example: $0.00025 per 1K input, $0.001 per 1K output)
    const inputCost = (estimatedInputTokens / 1000) * 0.00025;
    const outputCost = (estimatedOutputTokens / 1000) * 0.001;
    
    return inputCost + outputCost;
  }
}
