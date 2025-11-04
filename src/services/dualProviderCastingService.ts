/**
 * Dual-Provider Casting Service
 * Orchestrates LLaMA 3 and Gemini providers for casting analysis
 * with cross-validation, automatic failover, and quality-based selection
 */

import {
  ICastingProvider,
  CastingProviderId,
  CastingRequest,
  CastingResponse,
  DualProviderCastingRequest,
  DualProviderCastingResponse,
  CrossValidationReport,
  ProviderSelectionResult,
  CastingGenerationProgress,
  DualProviderCastingProgress,
  CastingGenerationConfig,
  HealthStatus,
  CastingQualityMetrics,
  ActorRecommendation,
  DiversityMetrics
} from '../types/castingAssistant';
import { LLamaProvider } from './providers/llamaProvider';
import { GeminiCastingProvider } from './providers/geminiCastingProvider';
import { logAPIError, createAPIError } from '../lib/apiErrorHandler';
import { showErrorToast, showSuccessToast, showWarningToast } from '../lib/toastNotifications';

export class DualProviderCastingService {
  private providers: Map<CastingProviderId, ICastingProvider> = new Map();
  private config: CastingGenerationConfig;
  private progressCallbacks: Map<string, (progress: DualProviderCastingProgress) => void> = new Map();

  constructor(config: CastingGenerationConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    try {
      // Initialize LLaMA 3 provider (primary)
      const llamaProvider = new LLamaProvider();
      await llamaProvider.init(this.config.providers.llama3);
      this.providers.set('llama3', llamaProvider);

      // Initialize Gemini Casting provider (backup)
      const geminiProvider = new GeminiCastingProvider();
      await geminiProvider.init(this.config.providers.geminiCasting);
      this.providers.set('gemini-casting', geminiProvider);

      console.log('[Dual-Provider Casting Service] All providers initialized');
    } catch (error) {
      console.error('[Dual-Provider Casting Service] Provider initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate casting recommendations using dual-provider approach
   */
  async generateDualProvider(request: DualProviderCastingRequest): Promise<DualProviderCastingResponse> {
    const requestId = `casting-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log('[Dual-Provider Casting Service] Starting dual-provider generation', {
      requestId,
      providerA: request.providerA,
      providerB: request.providerB,
      crossValidation: request.enableCrossValidation,
      characterName: request.request.character.name
    });

    // Initialize progress tracking
    const progress: DualProviderCastingProgress = {
      requestId,
      providerA: this.createInitialProgress(request.providerA),
      providerB: this.createInitialProgress(request.providerB),
      overallProgress: 0
    };

    this.emitProgress(requestId, progress);

    try {
      const providerA = this.providers.get(request.providerA);
      const providerB = this.providers.get(request.providerB);

      if (!providerA || !providerB) {
        throw new Error('One or more providers not initialized');
      }

      // Generate casting from both providers in parallel
      const results = await Promise.allSettled([
        providerA.generateCasting(
          request.request,
          (p) => this.handleProviderProgress(requestId, 'A', p)
        ),
        providerB.generateCasting(
          request.request,
          (p) => this.handleProviderProgress(requestId, 'B', p)
        )
      ]);

      // Process results
      const resultA = results[0];
      const resultB = results[1];

      let primaryResponse: CastingResponse | undefined;
      let secondaryResponse: CastingResponse | undefined;

      if (resultA.status === 'fulfilled') {
        primaryResponse = resultA.value;
      }

      if (resultB.status === 'fulfilled') {
        secondaryResponse = resultB.value;
      }

      // Handle failures
      if (!primaryResponse && !secondaryResponse) {
        const errorA = resultA.status === 'rejected' ? resultA.reason : null;
        const errorB = resultB.status === 'rejected' ? resultB.reason : null;
        
        showErrorToast('Both casting providers failed');

        throw new Error(`Both providers failed: A: ${errorA}, B: ${errorB}`);
      }

      // If one failed, use the successful one
      if (!primaryResponse && secondaryResponse) {
        showWarningToast(`Provider ${request.providerA} failed, using ${request.providerB}`);
        primaryResponse = secondaryResponse;
        secondaryResponse = undefined;
      } else if (primaryResponse && !secondaryResponse) {
        showWarningToast(`Provider ${request.providerB} failed, using ${request.providerA}`);
      }

      // Cross-validation if both succeeded
      let crossValidation: CrossValidationReport | undefined;
      let selectedProvider: CastingProviderId = request.providerA;
      let selectionReason = `Default provider (${request.providerA})`;

      if (request.enableCrossValidation && primaryResponse && secondaryResponse) {
        crossValidation = this.performCrossValidation(
          requestId,
          request.providerA,
          primaryResponse,
          request.providerB,
          secondaryResponse
        );

        // Select best provider based on validation
        const selection = this.selectBestProvider(
          request.providerA,
          primaryResponse,
          request.providerB,
          secondaryResponse,
          crossValidation
        );

        selectedProvider = selection.selectedProvider;
        selectionReason = selection.reason;

        // Swap if provider B is selected
        if (selectedProvider === request.providerB) {
          [primaryResponse, secondaryResponse] = [secondaryResponse, primaryResponse];
        }
      }

      // Merge recommendations for consensus
      const consensusRecommendations = this.mergeRecommendations(
        primaryResponse!,
        secondaryResponse
      );

      // Compare diversity metrics
      const diversityComparison = secondaryResponse ? {
        providerA: primaryResponse!.diversityMetrics,
        providerB: secondaryResponse.diversityMetrics,
        combined: this.combineDiversityMetrics(
          primaryResponse!.diversityMetrics,
          secondaryResponse.diversityMetrics
        )
      } : undefined;

      const response: DualProviderCastingResponse = {
        requestId,
        primaryResponse: primaryResponse!,
        secondaryResponse,
        consensusRecommendations,
        crossValidation,
        diversityComparison,
        selectedProvider,
        selectionReason,
        totalGenerationTime: Date.now() - startTime
      };

      showSuccessToast('Casting recommendations generated');

      console.log('[Dual-Provider Casting Service] Generation complete', {
        requestId,
        selectedProvider,
        recommendationCount: consensusRecommendations.length,
        totalTime: response.totalGenerationTime
      });

      return response;

    } catch (error) {
      console.error('[Dual-Provider Casting Service] Generation failed:', error);
      
      const apiError = createAPIError(
        error instanceof Error ? error.message : String(error)
      );
      logAPIError(error, {
        service: 'Dual-Provider Casting Service',
        operation: 'generateDualProvider'
      });

      throw error;
    }
  }

  /**
   * Generate casting with single provider (with fallback)
   */
  async generateWithFallback(
    request: CastingRequest,
    primaryProviderId: CastingProviderId,
    fallbackProviderId?: CastingProviderId
  ): Promise<CastingResponse> {
    const primaryProvider = this.providers.get(primaryProviderId);
    
    if (!primaryProvider) {
      throw new Error(`Provider ${primaryProviderId} not found`);
    }

    try {
      return await primaryProvider.generateCasting(request);
    } catch (error) {
      console.warn(`[Dual-Provider Casting Service] Primary provider ${primaryProviderId} failed`, error);
      
      if (fallbackProviderId) {
        const fallbackProvider = this.providers.get(fallbackProviderId);
        
        if (fallbackProvider) {
          showWarningToast(`Failing over to ${fallbackProviderId}`);
          
          try {
            return await fallbackProvider.generateCasting(request);
          } catch (fallbackError) {
            console.error(`[Dual-Provider Casting Service] Fallback provider ${fallbackProviderId} also failed`, fallbackError);
            throw fallbackError;
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Perform cross-validation between two casting responses
   */
  private performCrossValidation(
    requestId: string,
    providerAId: CastingProviderId,
    responseA: CastingResponse,
    providerBId: CastingProviderId,
    responseB: CastingResponse
  ): CrossValidationReport {
    console.log('[Dual-Provider Casting Service] Performing cross-validation');

    // Calculate quality scores
    const qualityA = this.calculateQualityScore(responseA);
    const qualityB = this.calculateQualityScore(responseB);

    // Find overlapping recommendations
    const actorsA = new Set(responseA.recommendations.map(r => r.actorName.toLowerCase()));
    const actorsB = new Set(responseB.recommendations.map(r => r.actorName.toLowerCase()));
    
    const overlapping = [...actorsA].filter(actor => actorsB.has(actor)).length;
    const totalUnique = new Set([...actorsA, ...actorsB]).size;
    const similarityScore = totalUnique > 0 ? overlapping / totalUnique : 0;

    // Compare diversity metrics
    const diversityAlignment = this.compareDiversityMetrics(
      responseA.diversityMetrics,
      responseB.diversityMetrics
    );

    // Determine recommendation
    let recommendation: 'use_a' | 'use_b' | 'merge' | 'manual_review';
    let confidence: number;
    const issues: string[] = [];

    if (qualityA.overallScore > qualityB.overallScore + 0.15) {
      recommendation = 'use_a';
      confidence = 0.8;
    } else if (qualityB.overallScore > qualityA.overallScore + 0.15) {
      recommendation = 'use_b';
      confidence = 0.8;
    } else if (similarityScore > 0.5) {
      recommendation = 'merge';
      confidence = 0.9;
    } else {
      recommendation = 'manual_review';
      confidence = 0.5;
      issues.push('Low agreement between providers');
    }

    if (diversityAlignment < 0.6) {
      issues.push('Significant diversity metric divergence');
    }

    return {
      requestId,
      timestamp: new Date(),
      providerA: {
        providerId: providerAId,
        qualityScore: qualityA.overallScore,
        diversityScore: responseA.diversityMetrics.overallDiversityScore
      },
      providerB: {
        providerId: providerBId,
        qualityScore: qualityB.overallScore,
        diversityScore: responseB.diversityMetrics.overallDiversityScore
      },
      agreement: {
        overlappingRecommendations: overlapping,
        similarityScore,
        diversityAlignment
      },
      recommendation,
      confidence,
      issues
    };
  }

  /**
   * Calculate quality score for casting response
   */
  private calculateQualityScore(response: CastingResponse): CastingQualityMetrics {
    const issues: string[] = [];

    // Check recommendation relevance
    const avgConfidence = response.recommendations.reduce((sum, r) => sum + r.confidence, 0) / 
                          (response.recommendations.length || 1);
    
    if (avgConfidence < 0.5) {
      issues.push('Low average confidence in recommendations');
    }

    // Check diversity
    const diversityScore = response.diversityMetrics.overallDiversityScore;
    
    if (diversityScore < 0.5) {
      issues.push('Low diversity score');
    }

    // Check reasoning quality (has detailed analysis)
    const reasoningQuality = response.analysisInsights.characterAnalysis.length > 100 ? 0.8 : 0.5;
    
    // Check completeness
    const hasNotableRoles = response.recommendations.some(r => r.notableRoles && r.notableRoles.length > 0);
    const completeness = hasNotableRoles ? 0.9 : 0.6;

    const overallScore = (avgConfidence + diversityScore + reasoningQuality + completeness) / 4;

    return {
      overallScore,
      recommendationRelevance: avgConfidence,
      diversityScore,
      reasoningQuality,
      completeness,
      issues
    };
  }

  /**
   * Select the best provider based on quality metrics
   */
  private selectBestProvider(
    providerAId: CastingProviderId,
    responseA: CastingResponse,
    providerBId: CastingProviderId,
    responseB: CastingResponse,
    crossValidation: CrossValidationReport
  ): ProviderSelectionResult {
    const qualityA = this.calculateQualityScore(responseA);
    const qualityB = this.calculateQualityScore(responseB);

    if (crossValidation.recommendation === 'use_a') {
      return {
        selectedProvider: providerAId,
        reason: `${providerAId} provided higher quality recommendations`,
        confidence: crossValidation.confidence,
        qualityScores: {
          [providerAId]: qualityA,
          [providerBId]: qualityB
        }
      };
    } else if (crossValidation.recommendation === 'use_b') {
      return {
        selectedProvider: providerBId,
        reason: `${providerBId} provided higher quality recommendations`,
        confidence: crossValidation.confidence,
        qualityScores: {
          [providerAId]: qualityA,
          [providerBId]: qualityB
        }
      };
    } else {
      // Default to provider with higher diversity score
      const selectedProvider = qualityA.diversityScore >= qualityB.diversityScore ? providerAId : providerBId;
      
      return {
        selectedProvider,
        reason: `Selected based on diversity metrics (${crossValidation.recommendation})`,
        confidence: crossValidation.confidence,
        qualityScores: {
          [providerAId]: qualityA,
          [providerBId]: qualityB
        }
      };
    }
  }

  /**
   * Merge recommendations from both providers
   */
  private mergeRecommendations(
    primaryResponse: CastingResponse,
    secondaryResponse?: CastingResponse
  ): ActorRecommendation[] {
    if (!secondaryResponse) {
      return primaryResponse.recommendations;
    }

    const merged = new Map<string, ActorRecommendation>();

    // Add primary recommendations
    primaryResponse.recommendations.forEach(rec => {
      merged.set(rec.actorName.toLowerCase(), rec);
    });

    // Add secondary recommendations that aren't duplicates
    secondaryResponse.recommendations.forEach(rec => {
      const key = rec.actorName.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, rec);
      } else {
        // If duplicate, boost confidence
        const existing = merged.get(key)!;
        existing.confidence = Math.min(1, (existing.confidence + rec.confidence) / 2 + 0.1);
      }
    });

    // Sort by confidence
    return Array.from(merged.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.defaultMaxRecommendations);
  }

  /**
   * Compare diversity metrics between two responses
   */
  private compareDiversityMetrics(metricsA: DiversityMetrics, metricsB: DiversityMetrics): number {
    const genderDiff = Math.abs(metricsA.genderBalance - metricsB.genderBalance);
    const ethnicDiff = Math.abs(metricsA.ethnicDiversity - metricsB.ethnicDiversity);
    const ageDiff = Math.abs(metricsA.ageRange - metricsB.ageRange);
    const experienceDiff = Math.abs(metricsA.experienceDiversity - metricsB.experienceDiversity);

    const avgDiff = (genderDiff + ethnicDiff + ageDiff + experienceDiff) / 4;
    
    // Return alignment score (1 = perfect alignment, 0 = complete divergence)
    return 1 - avgDiff;
  }

  /**
   * Combine diversity metrics from two responses
   */
  private combineDiversityMetrics(metricsA: DiversityMetrics, metricsB: DiversityMetrics): DiversityMetrics {
    return {
      genderBalance: (metricsA.genderBalance + metricsB.genderBalance) / 2,
      ethnicDiversity: (metricsA.ethnicDiversity + metricsB.ethnicDiversity) / 2,
      ageRange: (metricsA.ageRange + metricsB.ageRange) / 2,
      experienceDiversity: (metricsA.experienceDiversity + metricsB.experienceDiversity) / 2,
      overallDiversityScore: (metricsA.overallDiversityScore + metricsB.overallDiversityScore) / 2,
      recommendations: [
        ...metricsA.recommendations,
        ...metricsB.recommendations.filter(r => !metricsA.recommendations.includes(r))
      ].slice(0, 5)
    };
  }

  /**
   * Get health status of all providers
   */
  async getProvidersHealth(): Promise<Map<CastingProviderId, HealthStatus>> {
    const healthMap = new Map<CastingProviderId, HealthStatus>();

    for (const [id, provider] of this.providers) {
      try {
        const health = await provider.healthCheck();
        healthMap.set(id, health);
      } catch (error) {
        console.error(`[Dual-Provider Casting Service] Health check failed for ${id}:`, error);
        healthMap.set(id, HealthStatus.DOWN);
      }
    }

    return healthMap;
  }

  /**
   * Progress tracking helpers
   */
  private createInitialProgress(providerId: CastingProviderId): CastingGenerationProgress {
    return {
      providerId,
      status: 'idle',
      currentStage: 'Initializing',
      progress: 0
    };
  }

  private handleProviderProgress(
    requestId: string,
    providerLetter: 'A' | 'B',
    progress: CastingGenerationProgress
  ): void {
    const callback = this.progressCallbacks.get(requestId);
    if (!callback) return;

    // Create a minimal progress update - the component manages the full state
    // We just emit the individual provider progress
    if (providerLetter === 'A') {
      callback({
        requestId,
        providerA: progress,
        providerB: this.createInitialProgress('gemini-casting'),
        overallProgress: progress.progress / 2
      });
    } else {
      callback({
        requestId,
        providerA: this.createInitialProgress('llama3'),
        providerB: progress,
        overallProgress: 50 + (progress.progress / 2)
      });
    }
  }

  private emitProgress(requestId: string, progress: DualProviderCastingProgress): void {
    const callback = this.progressCallbacks.get(requestId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Register progress callback
   */
  onProgress(requestId: string, callback: (progress: DualProviderCastingProgress) => void): void {
    this.progressCallbacks.set(requestId, callback);
  }

  /**
   * Cleanup
   */
  cleanup(requestId: string): void {
    this.progressCallbacks.delete(requestId);
  }
}
