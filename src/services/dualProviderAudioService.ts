/**
 * Dual-Provider Audio Generation Service
 * Orchestrates multiple audio generation providers with cross-validation,
 * automatic failover, and quality-based selection
 */

import {
  IAudioProvider,
  AudioProviderId,
  AudioRequest,
  AudioResponse,
  DualProviderAudioRequest,
  DualProviderAudioResponse,
  CrossValidationReport,
  ProviderSelectionResult,
  AudioGenerationProgress,
  DualProviderAudioProgress,
  AudioGenerationConfig,
  ErrorKind,
  Retryable,
  HealthStatus,
  AudioQualityMetrics
} from '../types/audioGeneration';
import { AudioLDM2Provider } from './providers/audioLDM2Provider';
import { GeminiAudioProvider } from './providers/geminiAudioProvider';
import { logAPIError } from '../lib/apiErrorHandler';
import { showErrorToast, showSuccessToast, showWarningToast } from '../lib/toastNotifications';

export class DualProviderAudioService {
  private providers: Map<AudioProviderId, IAudioProvider> = new Map();
  private config: AudioGenerationConfig;
  private progressCallbacks: Map<string, (progress: DualProviderAudioProgress) => void> = new Map();

  constructor(config: AudioGenerationConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    try {
      // Initialize AudioLDM2 provider
      const audioldm2Provider = new AudioLDM2Provider();
      await audioldm2Provider.init(this.config.providers.audioldm2);
      this.providers.set('audioldm2', audioldm2Provider);

      // Initialize Gemini Audio provider
      const geminiProvider = new GeminiAudioProvider();
      await geminiProvider.init(this.config.providers.geminiAudio);
      this.providers.set('gemini-audio', geminiProvider);

      console.log('[Dual-Provider Audio Service] All providers initialized');
    } catch (error) {
      console.error('[Dual-Provider Audio Service] Provider initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate audio using dual-provider approach
   */
  async generateDualProvider(request: DualProviderAudioRequest): Promise<DualProviderAudioResponse> {
    const requestId = `audio-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log('[Dual-Provider Audio Service] Starting dual-provider generation', {
      requestId,
      providerA: request.providerA,
      providerB: request.providerB,
      crossValidation: request.enableCrossValidation,
      mode: request.request.mode
    });

    // Initialize progress tracking
    const progress: DualProviderAudioProgress = {
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
        showErrorToast({ title: 'Both providers failed to generate audio' });
        throw new Error('Both providers failed');
      }

      let selectedProvider: AudioProviderId;
      let primaryResponse: AudioResponse;
      let secondaryResponse: AudioResponse | undefined;
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

        showSuccessToast({ title: `Audio generated successfully by ${selectedProvider}` });
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

      const response: DualProviderAudioResponse = {
        primary: primaryResponse!,
        secondary: secondaryResponse,
        selectedProvider: selectedProvider!,
        crossValidation,
        failoverOccurred,
        totalLatencyMs
      };

      console.log('[Dual-Provider Audio Service] Generation completed', {
        requestId,
        selectedProvider: selectedProvider!,
        totalLatencyMs,
        failoverOccurred
      });

      return response;
    } catch (error: any) {
      showErrorToast({ title: 'Audio generation failed' });
      console.error('[Dual-Provider Audio Service] Error:', error);
      throw error;
    }
  }

  /**
   * Generate audio with fallback to secondary provider
   */
  async generateWithFallback(
    request: AudioRequest,
    primaryProvider?: AudioProviderId,
    secondaryProvider?: AudioProviderId
  ): Promise<AudioResponse> {
    const primary = primaryProvider || this.config.defaultProvider;
    const secondary = secondaryProvider || this.config.fallbackProvider;

    console.log('[Dual-Provider Audio Service] Generating with fallback', { primary, secondary });

    try {
      const response = await this.generateWithProvider(primary, request, 'fallback-req', 'primary');
      showSuccessToast({ title: `Audio generated by ${primary}` });
      return response;
    } catch (primaryError: any) {
      console.warn('[Dual-Provider Audio Service] Primary provider failed, using fallback', {
        primary,
        error: primaryError.message
      });

      try {
        const response = await this.generateWithProvider(secondary, request, 'fallback-req', 'secondary');
        showWarningToast({ title: `Audio generated by ${secondary} (fallback)` });
        return response;
      } catch (secondaryError: any) {
        showErrorToast({ title: 'Both providers failed to generate audio' });
        throw new Error(`Both providers failed: ${primaryError.message}, ${secondaryError.message}`);
      }
    }
  }

  /**
   * Generate audio using a specific provider with retry logic
   */
  private async generateWithProvider(
    providerId: AudioProviderId,
    request: AudioRequest,
    requestId: string,
    slot: string
  ): Promise<AudioResponse> {
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

        console.log(`[Dual-Provider Audio Service] Retrying ${providerId} after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error(`Audio generation failed after ${maxRetries} attempts`);
  }

  /**
   * Cross-validate results from two providers
   */
  private async crossValidate(
    providerA: AudioProviderId,
    providerB: AudioProviderId,
    responseA: AudioResponse,
    responseB: AudioResponse
  ): Promise<CrossValidationReport> {
    console.log('[Dual-Provider Audio Service] Cross-validating results', { providerA, providerB });

    // Audio quality-based cross-validation
    // In production, this would include:
    // - SNR (Signal-to-Noise Ratio) analysis
    // - Spectral analysis
    // - Clarity/intelligibility metrics
    // - Prompt alignment scores
    
    const scoreA = this.calculateAudioQualityScore(responseA);
    const scoreB = this.calculateAudioQualityScore(responseB);

    const report: CrossValidationReport = {
      service: 'audio',
      a: providerA,
      b: providerB,
      validator: 'audio-quality-v1',
      results: {
        a: {
          valid: responseA.audios.length > 0,
          score: scoreA,
          messages: [],
          details: this.analyzeAudioQuality(responseA)
        },
        b: {
          valid: responseB.audios.length > 0,
          score: scoreB,
          messages: [],
          details: this.analyzeAudioQuality(responseB)
        }
      },
      consensus: {
        strategy: 'max',
        winner: scoreA > scoreB ? providerA : providerB
      },
      compositeScore: Math.max(scoreA, scoreB),
      messages: [
        `Provider ${scoreA > scoreB ? providerA : providerB} selected based on quality score`,
        `Quality delta: ${Math.abs(scoreA - scoreB).toFixed(3)}`
      ],
      created_at: new Date().toISOString()
    };

    return report;
  }

  /**
   * Calculate audio quality score
   */
  private calculateAudioQualityScore(response: AudioResponse): number {
    let score = 0.5; // Base score

    // Has audio assets
    if (response.audios.length > 0) {
      score += 0.15;
    }

    // Has timing information (indicates successful generation)
    if (response.timings?.latency_ms) {
      // Faster is better (up to a point)
      // Audio generation can take 5-30 seconds typically
      const latencyScore = Math.max(0, 1 - (response.timings.latency_ms / 60000));
      score += latencyScore * 0.15;
    }

    // Audio has proper sample rate
    if (response.sampleRateHz && response.sampleRateHz >= 16000) {
      score += 0.1;
      // Bonus for high-quality sample rate
      if (response.sampleRateHz >= 44100) {
        score += 0.05;
      }
    }

    // Audio has proper duration
    if (response.duration_ms && response.duration_ms > 0) {
      score += 0.05;
    }

    // File size indicates quality (not too small)
    const audio = response.audios[0];
    if (audio?.content_length_bytes) {
      // Rough heuristic: WAV should be ~32KB per second at 16kHz mono
      const expectedMinSize = (response.duration_ms || 0) * 32; // bytes
      if (audio.content_length_bytes >= expectedMinSize) {
        score += 0.1;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Analyze audio quality metrics
   */
  private analyzeAudioQuality(response: AudioResponse): AudioQualityMetrics {
    // Placeholder for actual audio quality analysis
    // In production, this would use Web Audio API or audio analysis libraries
    
    const audio = response.audios[0];
    
    return {
      clarityScore: 0.8, // Placeholder
      noiseLevel: 0.1, // Placeholder (lower is better)
      clippingDetected: false, // Would need actual audio analysis
      dynamicRange: 60, // dB - placeholder
      spectralBalance: 0.75 // Placeholder (0-1)
    };
  }

  /**
   * Batch generate multiple audio files
   */
  async batchGenerate(
    requests: AudioRequest[],
    providerId?: AudioProviderId
  ): Promise<AudioResponse[]> {
    const provider = providerId || this.config.defaultProvider;
    
    console.log('[Dual-Provider Audio Service] Batch generating', {
      count: requests.length,
      provider
    });

    const results = await Promise.allSettled(
      requests.map(req => 
        this.generateWithFallback(req, provider, this.config.fallbackProvider)
      )
    );

    const responses: AudioResponse[] = [];
    const errors: Error[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
      } else {
        errors.push(result.reason);
        console.error(`[Dual-Provider Audio Service] Batch item ${index} failed:`, result.reason);
      }
    });

    if (errors.length > 0) {
      showWarningToast({ title: `${errors.length} of ${requests.length} audio generations failed` });
    } else {
      showSuccessToast({ title: `All ${requests.length} audio files generated successfully` });
    }

    return responses;
  }

  /**
   * Check health of all providers
   */
  async checkProvidersHealth(): Promise<Map<AudioProviderId, HealthStatus>> {
    const healthMap = new Map<AudioProviderId, HealthStatus>();

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
  onProgress(requestId: string, callback: (progress: DualProviderAudioProgress) => void): void {
    this.progressCallbacks.set(requestId, callback);
  }

  /**
   * Unsubscribe from progress updates
   */
  offProgress(requestId: string): void {
    this.progressCallbacks.delete(requestId);
  }

  private createInitialProgress(providerId: AudioProviderId): AudioGenerationProgress {
    return {
      provider: providerId,
      status: 'queued',
      progress: 0
    };
  }

  private updateProgress(requestId: string, progress: DualProviderAudioProgress): void {
    const callback = this.progressCallbacks.get(requestId);
    if (callback) {
      callback(progress);
    }
  }

  private updateProviderProgress(requestId: string, slot: string, update: Partial<AudioGenerationProgress>): void {
    const callback = this.progressCallbacks.get(requestId);
    if (callback) {
      // This is a simplified version - in production you'd maintain state properly
      console.log(`[Audio Progress] ${requestId} ${slot}:`, update);
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
    console.log('[Dual-Provider Audio Service] Disposed');
  }
}

/**
 * Create and configure the dual-provider audio service
 */
export function createDualProviderAudioService(): DualProviderAudioService {
  const config: AudioGenerationConfig = {
    providers: {
      audioldm2: {
        providerId: 'audioldm2',
        timeoutMs: 120000, // 2 minutes for audio generation
        maxRetries: 3,
        baseBackoffMs: 1000,
        apiKey: import.meta.env.VITE_HUGGING_FACE_TOKEN || '',
        baseUrl: 'https://api-inference.huggingface.co/models',
        model: 'cvssp/audioldm2-large'
      },
      geminiAudio: {
        providerId: 'gemini-audio',
        timeoutMs: 90000,
        maxRetries: 3,
        baseBackoffMs: 1000,
        apiKey: import.meta.env.VITE_GEMINI_API_KEY || ''
      }
    },
    defaultProvider: 'audioldm2',
    fallbackProvider: 'gemini-audio',
    enableCrossValidation: true,
    crossValidationThreshold: 0.7,
    retryPolicy: {
      maxAttempts: 3,
      baseBackoffMs: 1000,
      jitter: 'full',
      retryableKinds: [ErrorKind.RATE_LIMIT, ErrorKind.TIMEOUT, ErrorKind.PROVIDER]
    },
    timeoutMs: 120000,
    audioProcessing: {
      maxDurationSeconds: 30,
      defaultSampleRate: 16000,
      defaultFormat: 'audio/wav',
      enableNormalization: true
    }
  };

  return new DualProviderAudioService(config);
}

// Export singleton instance
export const dualProviderAudioService = createDualProviderAudioService();
