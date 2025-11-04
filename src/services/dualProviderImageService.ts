/**
 * Dual-Provider Image Generation Service
 * Orchestrates multiple image generation providers with cross-validation,
 * automatic failover, and quality-based selection
 */

import {
  IImageProvider,
  ProviderId,
  ImageRequest,
  ImageResponse,
  DualProviderRequest,
  DualProviderResponse,
  CrossValidationReport,
  ProviderSelectionResult,
  GenerationProgress,
  DualProviderProgress,
  ImageGenerationConfig,
  ErrorKind,
  Retryable,
  HealthStatus
} from '../types/imageGeneration';
import { StableDiffusionXLProvider } from './providers/stableDiffusionXLProvider';
import { GeminiImageProvider } from './providers/geminiImageProvider';
import { logAPIError } from '../lib/apiErrorHandler';
import { showErrorToast, showSuccessToast, showWarningToast } from '../lib/toastNotifications';

export class DualProviderImageService {
  private providers: Map<ProviderId, IImageProvider> = new Map();
  private config: ImageGenerationConfig;
  private progressCallbacks: Map<string, (progress: DualProviderProgress) => void> = new Map();

  constructor(config: ImageGenerationConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    try {
      const stableDiffusionConfig = this.config.providers.stableDiffusionXL;
      if (!stableDiffusionConfig.apiKey) {
        const message =
          'Hugging Face API token is missing. Please set VITE_HUGGING_FACE_TOKEN in your environment.';
        showErrorToast({ title: 'Missing Hugging Face token', description: 'Please set VITE_HUGGING_FACE_TOKEN in your environment' });
        throw new Error(message);
      }

      // Initialize Stable Diffusion XL provider
      const sdxlProvider = new StableDiffusionXLProvider();
      await sdxlProvider.init(stableDiffusionConfig);
      this.providers.set('stable-diffusion-xl', sdxlProvider);

      const geminiConfig = this.config.providers.gemini;
      if (!geminiConfig.apiKey) {
        const message =
          'Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your environment.';
        showErrorToast({ title: 'Missing Gemini API key', description: 'Please set VITE_GEMINI_API_KEY in your environment' });
        throw new Error(message);
      }

      // Initialize Gemini provider
      const geminiProvider = new GeminiImageProvider();
      await geminiProvider.init(geminiConfig);
      this.providers.set('gemini', geminiProvider);

      console.log('[Dual-Provider Service] All providers initialized');
    } catch (error) {
      console.error('[Dual-Provider Service] Provider initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate image using dual-provider approach
   */
  async generateDualProvider(request: DualProviderRequest): Promise<DualProviderResponse> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log('[Dual-Provider Service] Starting dual-provider generation', {
      requestId,
      providerA: request.providerA,
      providerB: request.providerB,
      crossValidation: request.enableCrossValidation
    });

    // Initialize progress tracking
    const progress: DualProviderProgress = {
      requestId,
      providerA: this.createInitialProgress(request.providerA),
      providerB: this.createInitialProgress(request.providerB),
      overallProgress: 0
    };

    this.updateProgress(requestId, progress);

    try {
      // Generate from both providers in parallel
      const [resultA, resultB] = await Promise.allSettled([
        this.generateWithProvider(request.providerA, request.request, requestId, 'A'),
        this.generateWithProvider(request.providerB, request.request, requestId, 'B')
      ]);

      // Update progress based on results
      if (resultA.status === 'fulfilled') {
        progress.providerA.status = 'succeeded';
        progress.providerA.progress = 100;
        progress.providerA.completedAt = new Date().toISOString();
      } else {
        progress.providerA.status = 'failed';
        progress.providerA.error = this.extractError(resultA.reason);
      }

      if (resultB.status === 'fulfilled') {
        progress.providerB.status = 'succeeded';
        progress.providerB.progress = 100;
        progress.providerB.completedAt = new Date().toISOString();
      } else {
        progress.providerB.status = 'failed';
        progress.providerB.error = this.extractError(resultB.reason);
      }

      // Calculate overall progress
      progress.overallProgress = 100;
      this.updateProgress(requestId, progress);

      // Handle results
      if (resultA.status === 'rejected' && resultB.status === 'rejected') {
        showErrorToast({ title: 'Both providers failed to generate image' });
        throw new Error('Both providers failed');
      }

      let selectedProvider: ProviderId;
      let primaryResponse: ImageResponse;
      let secondaryResponse: ImageResponse | undefined;
      let crossValidation: CrossValidationReport | undefined;
      let failoverOccurred = false;

      // If both succeeded, perform cross-validation or selection
      if (resultA.status === 'fulfilled' && resultB.status === 'fulfilled') {
        const responseA = resultA.value;
        const responseB = resultB.value;

        if (request.enableCrossValidation && this.config.enableCrossValidation) {
          crossValidation = await this.crossValidate(
            request.providerA,
            request.providerB,
            responseA,
            responseB
          );

          // Select based on cross-validation results
          if (crossValidation.results.a.score > crossValidation.results.b.score) {
            selectedProvider = request.providerA;
            primaryResponse = responseA;
            secondaryResponse = responseB;
          } else {
            selectedProvider = request.providerB;
            primaryResponse = responseB;
            secondaryResponse = responseA;
          }
        } else {
          // Use preferred provider or default
          selectedProvider = request.preferredProvider || request.providerA;
          primaryResponse = selectedProvider === request.providerA ? responseA : responseB;
          secondaryResponse = selectedProvider === request.providerA ? responseB : responseA;
        }

        showSuccessToast({ title: `Image generated successfully by ${selectedProvider}` });
      } else {
        // One provider failed - use the successful one
        failoverOccurred = true;
        
        if (resultA.status === 'fulfilled') {
          selectedProvider = request.providerA;
          primaryResponse = resultA.value;
          showWarningToast({ title: `Using ${selectedProvider} (fallback)` });
        } else if (resultB.status === 'fulfilled') {
          selectedProvider = request.providerB;
          primaryResponse = resultB.value;
          showWarningToast({ title: `Using ${selectedProvider} (fallback)` });
        }
      }

      const totalLatencyMs = Date.now() - startTime;

      const response: DualProviderResponse = {
        primary: primaryResponse!,
        secondary: secondaryResponse,
        selectedProvider: selectedProvider!,
        crossValidation,
        failoverOccurred,
        totalLatencyMs
      };

      console.log('[Dual-Provider Service] Generation completed', {
        requestId,
        selectedProvider: selectedProvider!,
        totalLatencyMs,
        failoverOccurred
      });

      return response;
    } catch (error: any) {
      showErrorToast({ title: 'Image generation failed' });
      console.error('[Dual-Provider Service] Error:', error);
      throw error;
    }
  }

  /**
   * Generate image with fallback to secondary provider
   */
  async generateWithFallback(
    request: ImageRequest,
    primaryProvider?: ProviderId,
    secondaryProvider?: ProviderId
  ): Promise<ImageResponse> {
    const primary = primaryProvider || this.config.defaultProvider;
    const secondary = secondaryProvider || this.config.fallbackProvider;

    console.log('[Dual-Provider Service] Generating with fallback', { primary, secondary });

    try {
      const response = await this.generateWithProvider(primary, request, 'fallback-req', 'primary');
      showSuccessToast({ title: `Image generated by ${primary}` });
      return response;
    } catch (primaryError: any) {
      console.warn('[Dual-Provider Service] Primary provider failed, using fallback', {
        primary,
        error: primaryError.message
      });

      try {
        const response = await this.generateWithProvider(secondary, request, 'fallback-req', 'secondary');
        showWarningToast({ title: `Image generated by ${secondary} (fallback)` });
        return response;
      } catch (secondaryError: any) {
        showErrorToast({ title: 'Both providers failed to generate image' });
        throw new Error(`Both providers failed: ${primaryError.message}, ${secondaryError.message}`);
      }
    }
  }

  /**
   * Generate image using a specific provider with retry logic
   */
  private async generateWithProvider(
    providerId: ProviderId,
    request: ImageRequest,
    requestId: string,
    slot: string
  ): Promise<ImageResponse> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const maxRetries = this.config.retryPolicy.maxAttempts;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Update progress
        this.updateProviderProgress(requestId, slot, {
          provider: providerId,
          status: 'running',
          progress: (attempt / maxRetries) * 80, // Reserve 20% for completion
          startedAt: attempt === 0 ? new Date().toISOString() : undefined
        });

        const response = await provider.generate(request);

        // Update progress to complete
        this.updateProviderProgress(requestId, slot, {
          provider: providerId,
          status: 'succeeded',
          progress: 100,
          completedAt: new Date().toISOString()
        });

        return response;
      } catch (error: any) {
        lastError = error;
        const retryable = error.retryable || Retryable.NO;

        if (retryable === Retryable.NO || attempt === maxRetries - 1) {
          this.updateProviderProgress(requestId, slot, {
            provider: providerId,
            status: 'failed',
            progress: 0,
            error: this.extractError(error)
          });
          throw error;
        }

        // Calculate backoff delay
        const backoffMs = this.config.retryPolicy.baseBackoffMs * Math.pow(2, attempt);
        const jitter = Math.random() * backoffMs * 0.1;
        const delay = backoffMs + jitter;

        console.log(`[Dual-Provider Service] Retrying ${providerId} after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error(`Generation failed after ${maxRetries} attempts`);
  }

  /**
   * Cross-validate results from two providers
   */
  private async crossValidate(
    providerA: ProviderId,
    providerB: ProviderId,
    responseA: ImageResponse,
    responseB: ImageResponse
  ): Promise<CrossValidationReport> {
    console.log('[Dual-Provider Service] Cross-validating results', { providerA, providerB });

    // Simple cross-validation based on latency and image availability
    // In production, this would include CLIP scores, aesthetic scores, etc.
    
    const scoreA = this.calculateQualityScore(responseA);
    const scoreB = this.calculateQualityScore(responseB);

    const report: CrossValidationReport = {
      service: 'image',
      a: providerA,
      b: providerB,
      validator: 'simple-quality-v1',
      results: {
        a: {
          valid: responseA.images.length > 0,
          score: scoreA,
          messages: []
        },
        b: {
          valid: responseB.images.length > 0,
          score: scoreB,
          messages: []
        }
      },
      consensus: {
        strategy: 'max',
        winner: scoreA > scoreB ? providerA : providerB
      },
      compositeScore: Math.max(scoreA, scoreB),
      messages: [`Provider ${scoreA > scoreB ? providerA : providerB} selected based on quality score`],
      created_at: new Date().toISOString()
    };

    return report;
  }

  /**
   * Calculate simple quality score for an image response
   */
  private calculateQualityScore(response: ImageResponse): number {
    let score = 0.5; // Base score

    // Has images
    if (response.images.length > 0) {
      score += 0.2;
    }

    // Has timing information (indicates successful generation)
    if (response.timings?.latency_ms) {
      // Faster is better (up to a point)
      const latencyScore = Math.max(0, 1 - (response.timings.latency_ms / 30000));
      score += latencyScore * 0.2;
    }

    // Has proper dimensions
    if (response.images[0]?.width && response.images[0]?.height) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Check health of all providers
   */
  async checkProvidersHealth(): Promise<Map<ProviderId, HealthStatus>> {
    const healthMap = new Map<ProviderId, HealthStatus>();

    for (const [id, provider] of this.providers) {
      try {
        const health = await provider.health();
        healthMap.set(id, health.status);
      } catch (error) {
        healthMap.set(id, HealthStatus.DOWN);
      }
    }

    return healthMap;
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(requestId: string, callback: (progress: DualProviderProgress) => void): void {
    this.progressCallbacks.set(requestId, callback);
  }

  /**
   * Unsubscribe from progress updates
   */
  offProgress(requestId: string): void {
    this.progressCallbacks.delete(requestId);
  }

  private createInitialProgress(providerId: ProviderId): GenerationProgress {
    return {
      provider: providerId,
      status: 'queued',
      progress: 0
    };
  }

  private updateProgress(requestId: string, progress: DualProviderProgress): void {
    const callback = this.progressCallbacks.get(requestId);
    if (callback) {
      callback(progress);
    }
  }

  private updateProviderProgress(requestId: string, slot: string, update: Partial<GenerationProgress>): void {
    const callback = this.progressCallbacks.get(requestId);
    if (callback) {
      // This is a simplified version - in production you'd maintain state properly
      console.log(`[Progress] ${requestId} ${slot}:`, update);
    }
  }

  private extractError(error: any): any {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      kind: error.kind || ErrorKind.INTERNAL,
      message: error.message || 'Unknown error',
      retryable: error.retryable || Retryable.NO,
      provider: error.provider
    };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.dispose();
    }
    this.providers.clear();
    this.progressCallbacks.clear();
    console.log('[Dual-Provider Service] Disposed');
  }
}

/**
 * Create and configure the dual-provider service
 */
export function createDualProviderImageService(): DualProviderImageService {
  const huggingFaceToken = (import.meta.env.VITE_HUGGING_FACE_TOKEN || '').trim();
  const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

  const config: ImageGenerationConfig = {
    providers: {
      stableDiffusionXL: {
        providerId: 'stable-diffusion-xl',
        timeoutMs: 60000,
        maxRetries: 3,
        baseBackoffMs: 1000,
        apiKey: huggingFaceToken,
        baseUrl: 'https://api-inference.huggingface.co/models',
        model: 'stabilityai/stable-diffusion-xl-base-1.0'
      },
      gemini: {
        providerId: 'gemini',
        timeoutMs: 45000,
        maxRetries: 3,
        baseBackoffMs: 1000,
        apiKey: geminiApiKey
      }
    },
    defaultProvider: 'stable-diffusion-xl',
    fallbackProvider: 'gemini',
    enableCrossValidation: true,
    crossValidationThreshold: 0.7,
    retryPolicy: {
      maxAttempts: 3,
      baseBackoffMs: 1000,
      jitter: 'full',
      retryableKinds: [ErrorKind.RATE_LIMIT, ErrorKind.TIMEOUT, ErrorKind.PROVIDER]
    },
    timeoutMs: 60000
  };

  return new DualProviderImageService(config);
}

// Export singleton instance
export const dualProviderImageService = createDualProviderImageService();
