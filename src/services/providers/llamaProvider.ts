/**
 * LLaMA 3 Casting Provider (Hugging Face)
 * Primary provider for character analysis and casting recommendations
 * Uses Meta's LLaMA 3 model via Hugging Face Inference API
 */

import {
  ICastingProvider,
  CastingProviderId,
  CastingRequest,
  CastingResponse,
  CastingProviderConfig,
  CastingGenerationProgress,
  ActorRecommendation,
  DiversityMetrics,
  HealthStatus,
  CastingQualityMetrics
} from '../../types/castingAssistant';
import { logAPIError, createAPIError } from '../../lib/apiErrorHandler';

export class LLamaProvider implements ICastingProvider {
  readonly id: CastingProviderId = 'llama3';
  readonly name: string = 'LLaMA 3 (Hugging Face)';
  
  private config!: CastingProviderConfig;
  private apiKey!: string;
  private apiUrl: string = 'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct';
  private initialized: boolean = false;

  async init(config: CastingProviderConfig): Promise<void> {
    console.log('[LLaMA Provider] Initializing...');
    
    if (!config.apiKey) {
      throw new Error('LLaMA Provider requires Hugging Face API key');
    }

    this.config = {
      timeout: 60000,
      retryAttempts: 3,
      temperature: 0.7,
      maxTokens: 2000,
      includeReasoning: true,
      ...config
    };

    this.apiKey = config.apiKey;
    if (config.apiUrl) {
      this.apiUrl = config.apiUrl;
    }

    // Test connection
    const health = await this.healthCheck();
    if (health === HealthStatus.DOWN) {
      throw new Error('LLaMA Provider health check failed');
    }

    this.initialized = true;
    console.log('[LLaMA Provider] Initialized successfully');
  }

  async generateCasting(
    request: CastingRequest,
    onProgress?: (progress: CastingGenerationProgress) => void
  ): Promise<CastingResponse> {
    if (!this.initialized) {
      throw new Error('LLaMA Provider not initialized');
    }

    const requestId = `llama-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Progress: Analyzing character
      this.updateProgress(onProgress, {
        providerId: this.id,
        status: 'analyzing',
        currentStage: 'Analyzing character profile',
        progress: 20
      });

      // Build comprehensive prompt for LLaMA
      const prompt = this.buildCastingPrompt(request);

      console.log('[LLaMA Provider] Sending request', {
        requestId,
        characterName: request.character.name,
        promptLength: prompt.length
      });

      // Progress: Matching actors
      this.updateProgress(onProgress, {
        providerId: this.id,
        status: 'matching',
        currentStage: 'Generating casting recommendations',
        progress: 40
      });

      // Call Hugging Face API
      const response = await this.callHuggingFaceAPI(prompt);

      // Progress: Validating results
      this.updateProgress(onProgress, {
        providerId: this.id,
        status: 'validating',
        currentStage: 'Processing and validating results',
        progress: 70
      });

      // Parse the LLaMA response
      const parsedResponse = this.parseResponse(response, request);

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
          model: 'Meta-Llama-3-8B-Instruct',
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

      console.log('[LLaMA Provider] Casting generated successfully', {
        requestId,
        recommendationCount: castingResponse.recommendations.length,
        generationTime: castingResponse.metadata.generationTime
      });

      return castingResponse;

    } catch (error) {
      console.error('[LLaMA Provider] Generation failed:', error);
      
      this.updateProgress(onProgress, {
        providerId: this.id,
        status: 'failed',
        currentStage: 'Generation failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const apiError = createAPIError(
        error instanceof Error ? error.message : String(error),
        {
          service: 'LLaMA Casting Provider',
          operation: 'generateCasting'
        },
        error
      );
      logAPIError(apiError);

      throw error;
    }
  }

  private buildCastingPrompt(request: CastingRequest): string {
    const { character, projectContext, prioritizeDiversity, maxRecommendations, includeAlternatives } = request;

    const systemPrompt = `You are an expert casting director with extensive knowledge of actors, their work, and talent matching. Your task is to analyze character profiles and recommend suitable actors based on physical attributes, personality traits, acting range, and proven capabilities.

IMPORTANT: Provide diverse and inclusive casting recommendations. Consider actors of various backgrounds, ages, and experience levels.`;

    const characterDescription = `
CHARACTER PROFILE:
Name: ${character.name}
Role: ${character.role}
Age: ${character.age}
${character.gender ? `Gender: ${character.gender}` : ''}
${character.ethnicity ? `Ethnicity: ${character.ethnicity}` : ''}
${character.physicalDescription ? `Physical Description: ${character.physicalDescription}` : ''}

Personality Traits: ${character.personalityTraits.join(', ')}
${character.background ? `Background: ${character.background}` : ''}
${character.motivations ? `Motivations: ${character.motivations.join(', ')}` : ''}
${character.conflictArc ? `Character Arc: ${character.conflictArc}` : ''}
${character.relationshipsToOthers ? `Relationships: ${character.relationshipsToOthers}` : ''}
`;

    const instructions = `
${projectContext ? `PROJECT CONTEXT: ${projectContext}` : ''}

Please provide ${maxRecommendations || 5} actor recommendations for this character. ${includeAlternatives ? 'Include both conventional and unconventional choices.' : ''} ${prioritizeDiversity ? 'Prioritize diverse casting options.' : ''}

For each recommendation, provide:
1. Actor name
2. Confidence score (0.0-1.0)
3. Detailed reasoning for the match
4. Physical match score (0.0-1.0)
5. Personality match score (0.0-1.0)
6. Experience match score (0.0-1.0)
7. Notable roles that demonstrate suitability
8. Age range
9. Key strengths for this role
10. Potential challenges (if any)

Also provide:
- Overall character analysis
- Casting rationale
- Director notes

Format your response as a JSON object with this structure:
{
  "characterAnalysis": "detailed analysis",
  "castingRationale": "overall casting strategy",
  "directorNotes": "notes for director",
  "recommendations": [
    {
      "actorName": "name",
      "confidence": 0.0-1.0,
      "reasoning": "detailed reasoning",
      "physicalMatch": 0.0-1.0,
      "personalityMatch": 0.0-1.0,
      "experienceMatch": 0.0-1.0,
      "notableRoles": ["role1", "role2"],
      "ageRange": "XX-YY",
      "strengths": ["strength1", "strength2"],
      "potentialChallenges": ["challenge1"]
    }
  ]
}`;

    return `${systemPrompt}\n\n${characterDescription}\n${instructions}`;
  }

  private async callHuggingFaceAPI(prompt: string): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          top_p: 0.9,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Hugging Face returns array with generated_text
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    }

    throw new Error('Unexpected response format from Hugging Face API');
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
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createFallbackResponse(request);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        recommendations: parsed.recommendations || [],
        analysisInsights: {
          characterAnalysis: parsed.characterAnalysis || `Analysis for ${request.character.name}`,
          castingRationale: parsed.castingRationale || 'Casting based on character requirements',
          directorNotes: parsed.directorNotes
        }
      };
    } catch (error) {
      console.warn('[LLaMA Provider] Failed to parse JSON response, using fallback');
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
    // Create basic recommendations based on character profile
    const recommendations: ActorRecommendation[] = [
      {
        actorName: 'To be determined',
        confidence: 0.5,
        reasoning: 'Automated fallback recommendation',
        physicalMatch: 0.5,
        personalityMatch: 0.5,
        experienceMatch: 0.5,
        strengths: ['Versatile performer'],
        ageRange: typeof request.character.age === 'string' ? request.character.age : `${request.character.age}-${Number(request.character.age) + 5}`
      }
    ];

    return {
      recommendations,
      analysisInsights: {
        characterAnalysis: `Character analysis for ${request.character.name}: ${request.character.personalityTraits.join(', ')}`,
        castingRationale: 'Fallback casting recommendations generated',
        directorNotes: 'Please review and refine casting choices'
      }
    };
  }

  private calculateDiversityMetrics(recommendations: ActorRecommendation[]): DiversityMetrics {
    // Simplified diversity calculation
    // In production, this would analyze actual demographic data
    
    const diversityScore = recommendations.length > 3 ? 0.7 : 0.5;
    
    return {
      genderBalance: 0.6,
      ethnicDiversity: diversityScore,
      ageRange: 0.7,
      experienceDiversity: 0.65,
      overallDiversityScore: diversityScore,
      recommendations: [
        'Consider actors from underrepresented backgrounds',
        'Mix established talent with emerging performers',
        'Ensure age-appropriate casting choices'
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
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: 'test',
          parameters: { max_new_tokens: 10 }
        })
      });

      if (response.ok || response.status === 503) {
        // 503 might mean model is loading
        return HealthStatus.UP;
      }

      return HealthStatus.DEGRADED;
    } catch (error) {
      console.error('[LLaMA Provider] Health check failed:', error);
      return HealthStatus.DOWN;
    }
  }

  async estimateCost(request: CastingRequest): Promise<number> {
    // Hugging Face Inference API is free for small-scale use
    // Return estimated API credits or usage
    const baseTokens = 500;
    const characterComplexity = request.character.personalityTraits.length * 50;
    const recommendationTokens = (request.maxRecommendations || 5) * 200;
    
    const estimatedTokens = baseTokens + characterComplexity + recommendationTokens;
    
    // Convert to cost (example: $0.001 per 1000 tokens)
    return (estimatedTokens / 1000) * 0.001;
  }
}
