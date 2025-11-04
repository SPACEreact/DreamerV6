/**
 * Dual-Provider Audio Generation Types
 * Based on the dual-provider architecture for Dreamer-V5
 * Adapted from image generation for audio use cases
 */

import { z } from 'zod';

// ============================================================================
// Provider Types and Enums
// ============================================================================

export type AudioProviderId = 'audioldm2' | 'gemini-audio' | string;
export type AudioServiceId = 'audio';

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
// Audio Generation Request/Response Types
// ============================================================================

export type AudioMode = 'tts' | 'text-to-audio' | 'text-to-music' | 'sound-effect';
export type AudioMimeType = 'audio/wav' | 'audio/mpeg' | 'audio/ogg' | 'audio/webm';

export interface AudioRequest {
  mode: AudioMode;
  text: string;
  negativePrompt?: string;
  duration?: number; // in seconds
  sampleRate?: number; // Hz (e.g., 16000, 44100, 48000)
  channels?: number; // 1 (mono) or 2 (stereo)
  format?: AudioMimeType;
  style?: string;
  voice?: string; // for TTS mode
  speed?: number; // 0.5 to 2.0
  pitch?: number; // adjustment in semitones
  quality?: string;
  seed?: number;
  numWaveforms?: number; // number of audio variations to generate
  syncId?: string;
  metadata?: Record<string, unknown>;
}

export interface AudioAsset {
  url: string;
  content_type: AudioMimeType;
  content_length_bytes?: number;
  sha256?: string;
  duration_ms?: number;
  sampleRateHz?: number;
  channels?: number;
  bitRateKbps?: number;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

export interface AudioResponse {
  audios: AudioAsset[];
  model?: string;
  voice?: string;
  duration_ms?: number;
  sampleRateHz?: number;
  seed?: number;
  text_hash?: string;
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

export const AudioAssetSchema = z.object({
  url: z.string().min(1),
  content_type: z.enum(['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/webm']),
  content_length_bytes: z.number().int().positive().optional(),
  sha256: z.string().min(1).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  sampleRateHz: z.number().int().positive().optional(),
  channels: z.number().int().positive().optional(),
  bitRateKbps: z.number().int().positive().optional(),
  created_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const AudioRequestSchema = z.object({
  mode: z.enum(['tts', 'text-to-audio', 'text-to-music', 'sound-effect']),
  text: z.string().min(1),
  negativePrompt: z.string().optional(),
  duration: z.number().min(0.5).max(300).optional(), // 0.5 to 300 seconds
  sampleRate: z.number().int().positive().optional(),
  channels: z.number().int().min(1).max(2).optional(),
  format: z.enum(['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/webm']).optional(),
  style: z.string().optional(),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
  pitch: z.number().optional(),
  quality: z.string().optional(),
  seed: z.number().int().optional(),
  numWaveforms: z.number().int().min(1).max(10).optional(),
  syncId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
}).strict();

export const AudioResponseSchema = z.object({
  audios: z.array(AudioAssetSchema).min(1),
  model: z.string().optional(),
  voice: z.string().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  sampleRateHz: z.number().int().positive().optional(),
  seed: z.number().int().optional(),
  text_hash: z.string().optional(),
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

export interface AudioProviderConfig {
  providerId: AudioProviderId;
  timeoutMs: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface IAudioProvider {
  readonly id: AudioProviderId;
  
  init(config: AudioProviderConfig): Promise<void>;
  validateRequest(req: AudioRequest): ValidationResult;
  generate(req: AudioRequest): Promise<AudioResponse>;
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
  provider?: AudioProviderId;
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

export interface AudioValidationOutput {
  clarityScore: number;        // 0..1 - Audio clarity/intelligibility
  coherenceScore: number;      // 0..1 - Temporal coherence
  naturalness: number;         // 0..1 - How natural the audio sounds
  promptAlignment: number;     // 0..1 - Alignment with text prompt
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

export interface AudioCrossValidateInput {
  providerA: AudioResponse;
  providerB: AudioResponse;
}

export interface ConsensusResult {
  strategy: ConsensusStrategy;
  winner?: AudioProviderId;
  details?: Record<string, unknown>;
}

export interface CrossValidationReport {
  service: AudioServiceId;
  a: AudioProviderId;
  b: AudioProviderId;
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
  service: AudioServiceId;
  overall: number;
  dimensions: Record<string, number>;
  confidence: number;
}

// ============================================================================
// Dual-Provider Operation Types
// ============================================================================

export interface DualProviderAudioRequest {
  request: AudioRequest;
  providerA: AudioProviderId;
  providerB: AudioProviderId;
  enableCrossValidation: boolean;
  preferredProvider?: AudioProviderId;
}

export interface DualProviderAudioResponse {
  primary: AudioResponse;
  secondary?: AudioResponse;
  selectedProvider: AudioProviderId;
  crossValidation?: CrossValidationReport;
  failoverOccurred: boolean;
  totalLatencyMs: number;
}

export interface ProviderSelectionResult {
  selectedProvider: AudioProviderId;
  reason: 'quality' | 'speed' | 'cost' | 'health' | 'fallback';
  scores?: {
    [key in AudioProviderId]?: number;
  };
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

export interface AudioGenerationProgress {
  provider: AudioProviderId;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number; // 0-100
  message?: string;
  startedAt?: string;
  completedAt?: string;
  error?: ErrorEnvelope;
}

export interface DualProviderAudioProgress {
  requestId: string;
  providerA: AudioGenerationProgress;
  providerB: AudioGenerationProgress;
  overallProgress: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AudioGenerationConfig {
  providers: {
    audioldm2: AudioProviderConfig;
    geminiAudio: AudioProviderConfig;
  };
  defaultProvider: AudioProviderId;
  fallbackProvider: AudioProviderId;
  enableCrossValidation: boolean;
  crossValidationThreshold: number;
  retryPolicy: RetryPolicy;
  timeoutMs: number;
  audioProcessing?: {
    maxDurationSeconds: number;
    defaultSampleRate: number;
    defaultFormat: AudioMimeType;
    enableNormalization: boolean;
  };
}

// ============================================================================
// Audio Processing Types
// ============================================================================

export interface AudioMetadata {
  duration_ms: number;
  sampleRateHz: number;
  channels: number;
  bitRateKbps?: number;
  format: AudioMimeType;
  peakAmplitude?: number;
  rmsLevel?: number;
  silenceRatio?: number;
}

export interface AudioQualityMetrics {
  clarityScore: number;
  noiseLevel: number;
  clippingDetected: boolean;
  dynamicRange: number;
  spectralBalance: number;
}

export interface AudioComparisonResult {
  providerA: AudioProviderId;
  providerB: AudioProviderId;
  qualityScores: {
    a: AudioQualityMetrics;
    b: AudioQualityMetrics;
  };
  selectedProvider: AudioProviderId;
  reason: string;
}
