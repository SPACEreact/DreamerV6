/**
 * AudioLDM 2 Provider
 * Integrates with Hugging Face Inference API for AudioLDM 2 audio generation
 * Model: cvssp/audioldm2-large
 */

import {
  IAudioProvider,
  AudioProviderId,
  AudioRequest,
  AudioResponse,
  ValidationResult,
  ProviderHealth,
  AudioProviderConfig,
  HealthStatus,
  AudioAsset,
  ErrorKind,
  Retryable,
  AudioMimeType
} from '../../types/audioGeneration';
import { createAPIContext, logAPIError } from '../../lib/apiErrorHandler';

export class AudioLDM2Provider implements IAudioProvider {
  readonly id: AudioProviderId = 'audioldm2';
  private config: AudioProviderConfig | null = null;
  private initialized = false;

  async init(config: AudioProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw this.createError(
        'INIT_ERROR',
        ErrorKind.VALIDATION,
        'Hugging Face API key is required',
        Retryable.NO
      );
    }

    this.config = config;
    this.initialized = true;
    console.log('[AudioLDM2 Provider] Initialized successfully');
  }

  validateRequest(req: AudioRequest): ValidationResult {
    const errors: Array<{ path: string; message: string }> = [];

    if (!req.text || req.text.trim().length === 0) {
      errors.push({ path: 'text', message: 'Text prompt is required' });
    }

    if (req.text && req.text.length > 1000) {
      errors.push({ path: 'text', message: 'Text prompt too long (max 1000 characters)' });
    }

    if (req.duration && (req.duration < 0.5 || req.duration > 30)) {
      errors.push({ path: 'duration', message: 'Duration must be between 0.5 and 30 seconds' });
    }

    if (req.sampleRate && ![16000, 22050, 44100, 48000].includes(req.sampleRate)) {
      errors.push({ 
        path: 'sampleRate', 
        message: 'Sample rate must be 16000, 22050, 44100, or 48000 Hz' 
      });
    }

    if (req.channels && (req.channels < 1 || req.channels > 2)) {
      errors.push({ path: 'channels', message: 'Channels must be 1 (mono) or 2 (stereo)' });
    }

    if (req.numWaveforms && (req.numWaveforms < 1 || req.numWaveforms > 4)) {
      errors.push({ 
        path: 'numWaveforms', 
        message: 'Number of waveforms must be between 1 and 4' 
      });
    }

    if (req.speed && (req.speed < 0.5 || req.speed > 2.0)) {
      errors.push({ path: 'speed', message: 'Speed must be between 0.5 and 2.0' });
    }

    // Validate mode-specific requirements
    if (req.mode === 'tts' && !req.voice) {
      errors.push({ path: 'voice', message: 'Voice is required for TTS mode' });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async generate(req: AudioRequest): Promise<AudioResponse> {
    if (!this.initialized || !this.config) {
      throw this.createError(
        'NOT_INITIALIZED',
        ErrorKind.INTERNAL,
        'Provider not initialized',
        Retryable.NO
      );
    }

    const validation = this.validateRequest(req);
    if (!validation.valid) {
      throw this.createError(
        'VALIDATION_ERROR',
        ErrorKind.VALIDATION,
        `Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`,
        Retryable.NO,
        { validationErrors: validation.errors }
      );
    }

    const startTime = Date.now();
    const correlationId = `audioldm2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log('[AudioLDM2 Provider] Generating audio...', { 
        text: req.text.substring(0, 100),
        mode: req.mode,
        duration: req.duration,
        correlationId 
      });

      // Prepare request payload for Hugging Face Inference API
      const payload = {
        inputs: this.formatPromptForMode(req),
        parameters: {
          negative_prompt: req.negativePrompt,
          duration: req.duration || 5.0,
          guidance_scale: 3.5, // AudioLDM2 default
          num_waveforms: req.numWaveforms || 1,
          ...(req.seed !== undefined && { seed: req.seed })
        }
      };

      // AudioLDM2 supports retry with exponential backoff
      const response = await this.callHuggingFaceAPIWithRetry(
        payload, 
        correlationId,
        this.config.maxRetries || 3
      );
      
      const latencyMs = Date.now() - startTime;
      
      // Convert response to AudioResponse format
      const audioResponse: AudioResponse = {
        audios: [response],
        model: this.config.model || 'cvssp/audioldm2-large',
        duration_ms: (req.duration || 5.0) * 1000,
        sampleRateHz: req.sampleRate || 16000,
        seed: req.seed,
        timings: {
          generated_at: new Date().toISOString(),
          latency_ms: latencyMs
        },
        provider_raw: { correlationId }
      };

      console.log('[AudioLDM2 Provider] Audio generated successfully', { 
        latencyMs,
        duration_ms: audioResponse.duration_ms,
        correlationId 
      });

      return audioResponse;
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      console.error('[AudioLDM2 Provider] Generation error:', error);

      throw this.createError(
        'GENERATION_ERROR',
        this.categorizeError(error),
        error.message || 'Audio generation failed',
        this.isRetryable(error) ? Retryable.AFTER_BACKOFF : Retryable.NO,
        { originalError: error.message, latencyMs }
      );
    }
  }

  private formatPromptForMode(req: AudioRequest): string {
    // AudioLDM2 uses different prompt formatting based on mode
    switch (req.mode) {
      case 'text-to-music':
        return `[MUSIC] ${req.text}`;
      case 'sound-effect':
        return `[SFX] ${req.text}`;
      case 'text-to-audio':
        return req.text;
      case 'tts':
        // AudioLDM2 doesn't natively support TTS, but we format it appropriately
        return `[SPEECH] ${req.text}`;
      default:
        return req.text;
    }
  }

  private async callHuggingFaceAPIWithRetry(
    payload: any, 
    correlationId: string,
    maxRetries: number
  ): Promise<AudioAsset> {
    let lastError: Error | null = null;
    const baseBackoffMs = this.config?.baseBackoffMs || 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.callHuggingFaceAPI(payload, correlationId, attempt);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if error is not retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Don't sleep after last attempt
        if (attempt < maxRetries) {
          const backoffMs = this.calculateBackoff(attempt, baseBackoffMs);
          console.log(`[AudioLDM2 Provider] Retry attempt ${attempt + 1}/${maxRetries} after ${backoffMs}ms`, {
            correlationId,
            error: error.message
          });
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('Max retries exceeded');
  }

  private calculateBackoff(attempt: number, baseMs: number): number {
    // Exponential backoff with jitter
    const exponentialMs = baseMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialMs; // 30% jitter
    return Math.min(exponentialMs + jitter, 30000); // Cap at 30 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async callHuggingFaceAPI(
    payload: any, 
    correlationId: string,
    attempt: number
  ): Promise<AudioAsset> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const baseUrl = this.config.baseUrl || 'https://api-inference.huggingface.co/models';
    const model = this.config.model || 'cvssp/audioldm2-large';
    const url = `${baseUrl}/${model}`;

    const controller = new AbortController();
    const timeoutMs = this.config.timeoutMs || 120000; // 2 minutes default for audio
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
          'X-Retry-Attempt': attempt.toString()
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          throw new Error(`Rate limited. Retry after: ${retryAfter || 'unknown'}`);
        }
        
        if (response.status === 503) {
          throw new Error('Model is currently loading. Please retry in a few moments.');
        }

        if (response.status === 400) {
          throw new Error(`Bad request: ${errorText}`);
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Hugging Face returns the audio as a blob
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      // Determine content type from response or default to WAV
      const contentType = (response.headers.get('content-type') || 'audio/wav') as AudioMimeType;

      // Calculate approximate duration based on file size and format
      const estimatedDurationMs = this.estimateDuration(blob.size, contentType);

      // For production, you would upload this to storage and get a permanent URL
      // For now, we'll use the blob URL
      const audioAsset: AudioAsset = {
        url: audioUrl,
        content_type: contentType,
        content_length_bytes: blob.size,
        duration_ms: estimatedDurationMs,
        sampleRateHz: payload.parameters.sample_rate || 16000,
        channels: 1, // AudioLDM2 typically generates mono
        created_at: new Date().toISOString(),
        metadata: {
          provider: this.id,
          correlationId,
          blobUrl: true, // Flag indicating this is a temporary blob URL
          model: model,
          attempt
        }
      };

      return audioAsset;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      
      throw error;
    }
  }

  private estimateDuration(fileSizeBytes: number, contentType: AudioMimeType): number {
    // Rough estimation based on typical bitrates
    // WAV (uncompressed): ~1.4MB per 10 seconds at 16kHz mono
    // MP3: ~128kbps typical
    
    if (contentType === 'audio/wav') {
      // Assume 16kHz, 16-bit, mono: 32KB/s
      return Math.round((fileSizeBytes / 32000) * 1000);
    } else if (contentType === 'audio/mpeg') {
      // Assume 128kbps: 16KB/s
      return Math.round((fileSizeBytes / 16000) * 1000);
    }
    
    // Default fallback
    return 5000; // 5 seconds default
  }

  async health(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized || !this.config) {
        return {
          status: HealthStatus.DOWN,
          details: { reason: 'Not initialized' }
        };
      }

      // Perform a lightweight health check
      // Could optionally ping the API endpoint with a minimal request
      const latencyMs = Date.now() - startTime;
      
      return {
        status: HealthStatus.UP,
        lastHeartbeatAt: new Date().toISOString(),
        latencyMs,
        version: '2.0',
        transport: 'http',
        details: {
          model: this.config.model || 'cvssp/audioldm2-large',
          maxRetries: this.config.maxRetries || 3,
          timeoutMs: this.config.timeoutMs || 120000
        }
      };
    } catch (error) {
      return {
        status: HealthStatus.DOWN,
        latencyMs: Date.now() - startTime,
        details: { error: String(error) }
      };
    }
  }

  async dispose(): Promise<void> {
    this.config = null;
    this.initialized = false;
    console.log('[AudioLDM2 Provider] Disposed');
  }

  private categorizeError(error: any): ErrorKind {
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('Rate limited') || errorMessage.includes('429')) {
      return ErrorKind.RATE_LIMIT;
    }
    
    if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
      return ErrorKind.TIMEOUT;
    }
    
    if (errorMessage.includes('503') || errorMessage.includes('loading')) {
      return ErrorKind.PROVIDER;
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return ErrorKind.TRANSPORT;
    }

    if (errorMessage.includes('Bad request') || errorMessage.includes('400')) {
      return ErrorKind.VALIDATION;
    }

    if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
      return ErrorKind.QUOTA;
    }
    
    return ErrorKind.INTERNAL;
  }

  private isRetryable(error: any): boolean {
    const errorMessage = error.message || error.toString();
    
    // Retry on rate limits, timeouts, and temporary provider issues
    // Do NOT retry on validation errors (400) or authentication errors
    return errorMessage.includes('Rate limited') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('503') ||
           errorMessage.includes('loading') ||
           errorMessage.includes('network') ||
           errorMessage.includes('fetch failed');
  }

  private createError(
    code: string,
    kind: ErrorKind,
    message: string,
    retryable: Retryable,
    details?: Record<string, unknown>
  ): Error {
    const error = new Error(message);
    (error as any).code = code;
    (error as any).kind = kind;
    (error as any).retryable = retryable;
    (error as any).provider = this.id;
    (error as any).details = details;
    return error;
  }
}
