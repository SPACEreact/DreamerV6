/**
 * Stable Diffusion XL Provider
 * Integrates with Hugging Face Inference API for SDXL image generation
 */

import {
  IImageProvider,
  ProviderId,
  ImageRequest,
  ImageResponse,
  ValidationResult,
  ProviderHealth,
  ProviderConfig,
  HealthStatus,
  ImageAsset,
  ErrorKind,
  Retryable,
  ErrorEnvelope
} from '../../types/imageGeneration';
import { createAPIContext, logAPIError } from '../../lib/apiErrorHandler';

export class StableDiffusionXLProvider implements IImageProvider {
  readonly id: ProviderId = 'stable-diffusion-xl';
  private config: ProviderConfig | null = null;
  private initialized = false;

  async init(config: ProviderConfig): Promise<void> {
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
  }

  validateRequest(req: ImageRequest): ValidationResult {
    const errors: Array<{ path: string; message: string }> = [];

    if (!req.prompt || req.prompt.trim().length === 0) {
      errors.push({ path: 'prompt', message: 'Prompt is required' });
    }

    if (req.prompt && req.prompt.length > 1000) {
      errors.push({ path: 'prompt', message: 'Prompt too long (max 1000 characters)' });
    }

    if (req.width && (req.width < 512 || req.width > 1024)) {
      errors.push({ path: 'width', message: 'Width must be between 512 and 1024' });
    }

    if (req.height && (req.height < 512 || req.height > 1024)) {
      errors.push({ path: 'height', message: 'Height must be between 512 and 1024' });
    }

    if (req.steps && (req.steps < 1 || req.steps > 100)) {
      errors.push({ path: 'steps', message: 'Steps must be between 1 and 100' });
    }

    if (req.guidance && (req.guidance < 0 || req.guidance > 20)) {
      errors.push({ path: 'guidance', message: 'Guidance scale must be between 0 and 20' });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async generate(req: ImageRequest): Promise<ImageResponse> {
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
    const correlationId = `sdxl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
        prompt: req.prompt.substring(0, 100),
        correlationId 
      });

      // Prepare request payload for Hugging Face Inference API
      const payload = {
        inputs: req.prompt,
        parameters: {
          negative_prompt: req.negativePrompt,
          num_inference_steps: req.steps || 30,
          guidance_scale: req.guidance || 7.5,
          width: req.width || 1024,
          height: req.height || 1024,
          ...(req.seed !== undefined && { seed: req.seed })
        }
      };

      const response = await this.callHuggingFaceAPI(payload, correlationId);
      
      const latencyMs = Date.now() - startTime;
      
      // Convert response to ImageResponse format
      const imageResponse: ImageResponse = {
        images: [response],
        model: this.config.model || 'stabilityai/stable-diffusion-xl-base-1.0',
        steps: req.steps || 30,
        guidance: req.guidance || 7.5,
        seed: req.seed,
        timings: {
          generated_at: new Date().toISOString(),
          latency_ms: latencyMs
        },
        provider_raw: { correlationId }
      };

        latencyMs,
        correlationId 
      });

      return imageResponse;
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      

      throw this.createError(
        'GENERATION_ERROR',
        this.categorizeError(error),
        error.message || 'Image generation failed',
        this.isRetryable(error) ? Retryable.AFTER_BACKOFF : Retryable.NO,
        { originalError: error.message, latencyMs }
      );
    }
  }

  private async callHuggingFaceAPI(payload: any, correlationId: string): Promise<ImageAsset> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const baseUrl = this.config.baseUrl || 'https://api-inference.huggingface.co/models';
    const model = this.config.model || 'stabilityai/stable-diffusion-xl-base-1.0';
    const url = `${baseUrl}/${model}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 60000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId
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

        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Hugging Face returns the image as a blob
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      // For production, you would upload this to storage and get a permanent URL
      // For now, we'll use the blob URL
      const imageAsset: ImageAsset = {
        url: imageUrl,
        content_type: 'image/png',
        content_length_bytes: blob.size,
        width: payload.parameters.width,
        height: payload.parameters.height,
        created_at: new Date().toISOString(),
        metadata: {
          provider: this.id,
          correlationId,
          blobUrl: true // Flag indicating this is a temporary blob URL
        }
      };

      return imageAsset;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
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

      // Simple health check - verify API key is present
      const latencyMs = Date.now() - startTime;
      
      return {
        status: HealthStatus.UP,
        lastHeartbeatAt: new Date().toISOString(),
        latencyMs,
        version: '1.0',
        transport: 'http'
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
    
    return ErrorKind.INTERNAL;
  }

  private isRetryable(error: any): boolean {
    const errorMessage = error.message || error.toString();
    
    // Retry on rate limits, timeouts, and temporary provider issues
    return errorMessage.includes('Rate limited') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('503') ||
           errorMessage.includes('loading');
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
