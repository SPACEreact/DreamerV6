/**
 * Dual-Provider Image Generation Types
 * Based on the architecture specification for Dreamer-V5
 */

import { z } from 'zod';

// ============================================================================
// Provider Types and Enums
// ============================================================================

export type ProviderId = 'stable-diffusion-xl' | 'gemini' | string;
export type ServiceId = 'image' | 'audio' | 'casting';

export enum ErrorKind {
  VALIDATION = 'VALIDATION',
  TRANSPORT = 'TRANSPORT',
  RATE_LIMIT = 'RATE_LIMIT',
  PROVIDER = 'PROVIDER',
  TIMEOUT = 'TIMEOUT',
  QUOTA = 'QUOTA',
  INTERNAL = 'INTERNAL'
}

export enum Retryable {
  NO = 'NO',
  YES = 'YES',
  AFTER_BACKOFF = 'AFTER_BACKOFF'
}

export enum HealthStatus {
  UP = 'UP',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN'
}

export type ConsensusStrategy = 'average' | 'weighted' | 'majority' | 'max' | 'min';

// ============================================================================
// Image Generation Request/Response Types
// ============================================================================

export type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif';

export interface ImageRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  style?: string;
  quality?: string;
  format?: ImageMimeType;
  safety?: 'strict' | 'balanced' | 'relaxed';
  syncId?: string;
  metadata?: Record<string, unknown>;
}

export interface ImageAsset {
  url: string;
  content_type: ImageMimeType;
  content_length_bytes?: number;
  sha256?: string;
  width?: number;
  height?: number;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ImageResponse {
  images: ImageAsset[];
  model?: string;
  sampler?: string;
  steps?: number;
  guidance?: number;
  seed?: number;
  prompt_hash?: string;
  timings?: {
    generated_at?: string;
    latency_ms?: number;
  };
  warnings?: string[];
  provider_raw?: unknown;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const ImageAssetSchema = z.object({
  url: z.string().min(1),
  content_type: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  content_length_bytes: z.number().int().positive().optional(),
  sha256: z.string().min(1).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  created_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const ImageRequestSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  steps: z.number().int().positive().optional(),
  guidance: z.number().min(0).optional(),
  seed: z.number().int().optional(),
  style: z.string().optional(),
  quality: z.string().optional(),
  format: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/avif']).optional(),
  safety: z.enum(['strict', 'balanced', 'relaxed']).optional(),
  syncId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
}).strict();

export const ImageResponseSchema = z.object({
  images: z.array(ImageAssetSchema).min(1),
  model: z.string().optional(),
  sampler: z.string().optional(),
  steps: z.number().int().positive().optional(),
  guidance: z.number().min(0).optional(),
  seed: z.number().int().optional(),
  prompt_hash: z.string().optional(),
  timings: z.object({
    generated_at: z.string().datetime().optional(),
    latency_ms: z.number().int().nonnegative().optional()
  }).optional(),
  warnings: z.array(z.string()).optional(),
  provider_raw: z.unknown().optional()
}).strict();

// ============================================================================
// Provider Interface
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
}

export interface ProviderHealth {
  status: HealthStatus;
  lastHeartbeatAt?: string;
  latencyMs?: number;
  version?: string;
  transport?: 'http' | 'grpc' | 'stream' | 'unknown';
  details?: Record<string, unknown>;
}

export interface ProviderConfig {
  providerId: ProviderId;
  timeoutMs: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface IImageProvider {
  readonly id: ProviderId;
  
  init(config: ProviderConfig): Promise<void>;
  validateRequest(req: ImageRequest): ValidationResult;
  generate(req: ImageRequest): Promise<ImageResponse>;
  health(): Promise<ProviderHealth>;
  dispose(): Promise<void>;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface ErrorEnvelope {
  code: string;
  kind: ErrorKind;
  message: string;
  retryable: Retryable;
  correlationId: string;
  provider?: ProviderId;
  cause?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseBackoffMs: number;
  jitter: 'none' | 'full';
  retryableKinds: ErrorKind[];
}

export const ErrorEnvelopeSchema = z.object({
  code: z.string().min(1),
  kind: z.nativeEnum(ErrorKind),
  message: z.string().min(1),
  retryable: z.nativeEnum(Retryable),
  correlationId: z.string().min(1),
  provider: z.string().optional(),
  cause: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  stack: z.string().optional()
}).strict();

// ============================================================================
// Cross-Validation Types
// ============================================================================

export interface ImageValidationOutput {
  semanticScore: number;      // 0..1
  aestheticScore: number;     // 0..1
  structuralScore: number;    // e.g., SSIM/PSNR-derived; 0..1
}

export interface ValidatorContext {
  requestHash: string;
  mode: 'strict' | 'tolerant' | 'fast';
  timeBudgetMs?: number;
  thresholds?: {
    [service: string]: Record<string, number>;
  };
}

export interface ValidatorResult<T = unknown> {
  valid: boolean;
  score: number; // 0..1
  details?: T;
  messages?: string[];
}

export interface ImageCrossValidateInput {
  providerA: ImageResponse;
  providerB: ImageResponse;
}

export interface ConsensusResult {
  strategy: ConsensusStrategy;
  winner?: ProviderId;
  details?: Record<string, unknown>;
}

export interface CrossValidationReport {
  service: ServiceId;
  a: ProviderId;
  b: ProviderId;
  validator: string;
  results: {
    a: ValidatorResult;
    b: ValidatorResult;
  };
  consensus?: ConsensusResult;
  compositeScore: number;
  messages: string[];
  created_at: string;
}

export interface CompositeScore {
  service: ServiceId;
  overall: number;
  dimensions: Record<string, number>;
  confidence: number;
}

// ============================================================================
// Dual-Provider Operation Types
// ============================================================================

export interface DualProviderRequest {
  request: ImageRequest;
  providerA: ProviderId;
  providerB: ProviderId;
  enableCrossValidation: boolean;
  preferredProvider?: ProviderId;
}

export interface DualProviderResponse {
  primary: ImageResponse;
  secondary?: ImageResponse;
  selectedProvider: ProviderId;
  crossValidation?: CrossValidationReport;
  failoverOccurred: boolean;
  totalLatencyMs: number;
}

export interface ProviderSelectionResult {
  selectedProvider: ProviderId;
  reason: 'quality' | 'speed' | 'cost' | 'health' | 'fallback';
  scores?: {
    [key in ProviderId]?: number;
  };
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

export interface GenerationProgress {
  provider: ProviderId;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number; // 0-100
  message?: string;
  startedAt?: string;
  completedAt?: string;
  error?: ErrorEnvelope;
}

export interface DualProviderProgress {
  requestId: string;
  providerA: GenerationProgress;
  providerB: GenerationProgress;
  overallProgress: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ImageGenerationConfig {
  providers: {
    stableDiffusionXL: ProviderConfig;
    gemini: ProviderConfig;
  };
  defaultProvider: ProviderId;
  fallbackProvider: ProviderId;
  enableCrossValidation: boolean;
  crossValidationThreshold: number;
  retryPolicy: RetryPolicy;
  timeoutMs: number;
}
