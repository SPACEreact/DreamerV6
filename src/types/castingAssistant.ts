/**
 * Dual-Provider Casting Assistant Types
 * Based on the dual-provider architecture for Dreamer-V5
 * Implements LLaMA 3 (primary) + Gemini (backup) for casting analysis
 */

import { z } from 'zod';

// ============================================================================
// Provider Types and Enums
// ============================================================================

export type CastingProviderId = 'llama3' | 'gemini-casting' | string;
export type CastingServiceId = 'casting';

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
// Character Profile Types
// ============================================================================

export interface CharacterProfile {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  age: number | string; // e.g., 30 or "30-35"
  gender?: string;
  ethnicity?: string;
  physicalDescription?: string;
  personalityTraits: string[];
  background?: string;
  motivations?: string[];
  conflictArc?: string;
  relationshipsToOthers?: string;
}

export const CharacterProfileSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
  age: z.union([z.number(), z.string()]),
  gender: z.string().optional(),
  ethnicity: z.string().optional(),
  physicalDescription: z.string().optional(),
  personalityTraits: z.array(z.string()),
  background: z.string().optional(),
  motivations: z.array(z.string()).optional(),
  conflictArc: z.string().optional(),
  relationshipsToOthers: z.string().optional()
});

// ============================================================================
// Actor Recommendation Types
// ============================================================================

export interface ActorRecommendation {
  actorName: string;
  confidence: number; // 0-1
  reasoning: string;
  physicalMatch: number; // 0-1
  personalityMatch: number; // 0-1
  experienceMatch: number; // 0-1
  notableRoles?: string[];
  ageRange?: string;
  strengths: string[];
  potentialChallenges?: string[];
}

export const ActorRecommendationSchema = z.object({
  actorName: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  physicalMatch: z.number().min(0).max(1),
  personalityMatch: z.number().min(0).max(1),
  experienceMatch: z.number().min(0).max(1),
  notableRoles: z.array(z.string()).optional(),
  ageRange: z.string().optional(),
  strengths: z.array(z.string()),
  potentialChallenges: z.array(z.string()).optional()
});

// ============================================================================
// Diversity Metrics Types
// ============================================================================

export interface DiversityMetrics {
  genderBalance: number; // 0-1, where 1 is perfectly balanced
  ethnicDiversity: number; // 0-1, where 1 is maximum diversity
  ageRange: number; // 0-1, where 1 is wide range
  experienceDiversity: number; // 0-1, mix of established and emerging talent
  overallDiversityScore: number; // 0-1, weighted average
  recommendations: string[]; // Suggestions to improve diversity
}

export const DiversityMetricsSchema = z.object({
  genderBalance: z.number().min(0).max(1),
  ethnicDiversity: z.number().min(0).max(1),
  ageRange: z.number().min(0).max(1),
  experienceDiversity: z.number().min(0).max(1),
  overallDiversityScore: z.number().min(0).max(1),
  recommendations: z.array(z.string())
});

// ============================================================================
// Casting Request/Response Types
// ============================================================================

export interface CastingRequest {
  character: CharacterProfile;
  projectContext?: string; // Genre, tone, budget level
  prioritizeDiversity?: boolean;
  maxRecommendations?: number; // Default: 5
  includeAlternatives?: boolean; // Include unconventional choices
  region?: string; // Geographic preference for actors
}

export const CastingRequestSchema = z.object({
  character: CharacterProfileSchema,
  projectContext: z.string().optional(),
  prioritizeDiversity: z.boolean().optional(),
  maxRecommendations: z.number().min(1).max(10).optional(),
  includeAlternatives: z.boolean().optional(),
  region: z.string().optional()
});

export interface CastingResponse {
  requestId: string;
  providerId: CastingProviderId;
  character: CharacterProfile;
  recommendations: ActorRecommendation[];
  diversityMetrics: DiversityMetrics;
  analysisInsights: {
    characterAnalysis: string;
    castingRationale: string;
    directorNotes?: string;
  };
  metadata: {
    generationTime: number;
    model: string;
    version: string;
  };
}

export const CastingResponseSchema = z.object({
  requestId: z.string(),
  providerId: z.string(),
  character: CharacterProfileSchema,
  recommendations: z.array(ActorRecommendationSchema),
  diversityMetrics: DiversityMetricsSchema,
  analysisInsights: z.object({
    characterAnalysis: z.string(),
    castingRationale: z.string(),
    directorNotes: z.string().optional()
  }),
  metadata: z.object({
    generationTime: z.number(),
    model: z.string(),
    version: z.string()
  })
});

// ============================================================================
// Dual-Provider Types
// ============================================================================

export interface DualProviderCastingRequest {
  request: CastingRequest;
  providerA: CastingProviderId;
  providerB: CastingProviderId;
  enableCrossValidation: boolean;
  preferenceWeight?: number; // 0-1, weight for provider A (0.5 = equal)
}

export interface DualProviderCastingResponse {
  requestId: string;
  primaryResponse: CastingResponse;
  secondaryResponse?: CastingResponse;
  consensusRecommendations: ActorRecommendation[];
  crossValidation?: CrossValidationReport;
  diversityComparison?: {
    providerA: DiversityMetrics;
    providerB: DiversityMetrics;
    combined: DiversityMetrics;
  };
  selectedProvider: CastingProviderId;
  selectionReason: string;
  totalGenerationTime: number;
}

// ============================================================================
// Cross-Validation Types
// ============================================================================

export interface CrossValidationReport {
  requestId: string;
  timestamp: Date;
  providerA: {
    providerId: CastingProviderId;
    qualityScore: number;
    diversityScore: number;
  };
  providerB: {
    providerId: CastingProviderId;
    qualityScore: number;
    diversityScore: number;
  };
  agreement: {
    overlappingRecommendations: number; // Number of actors both suggested
    similarityScore: number; // 0-1, how similar the recommendations are
    diversityAlignment: number; // 0-1, how aligned diversity metrics are
  };
  recommendation: 'use_a' | 'use_b' | 'merge' | 'manual_review';
  confidence: number; // 0-1
  issues: string[];
}

export const CrossValidationReportSchema = z.object({
  requestId: z.string(),
  timestamp: z.date(),
  providerA: z.object({
    providerId: z.string(),
    qualityScore: z.number().min(0).max(1),
    diversityScore: z.number().min(0).max(1)
  }),
  providerB: z.object({
    providerId: z.string(),
    qualityScore: z.number().min(0).max(1),
    diversityScore: z.number().min(0).max(1)
  }),
  agreement: z.object({
    overlappingRecommendations: z.number(),
    similarityScore: z.number().min(0).max(1),
    diversityAlignment: z.number().min(0).max(1)
  }),
  recommendation: z.enum(['use_a', 'use_b', 'merge', 'manual_review']),
  confidence: z.number().min(0).max(1),
  issues: z.array(z.string())
});

// ============================================================================
// Provider Configuration Types
// ============================================================================

export interface CastingProviderConfig {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  retryAttempts?: number;
  includeReasoning?: boolean;
}

export interface CastingGenerationConfig {
  providers: {
    llama3: CastingProviderConfig;
    geminiCasting: CastingProviderConfig;
  };
  crossValidation: {
    enabled: boolean;
    strategy: ConsensusStrategy;
    minAgreementThreshold: number; // 0-1
  };
  defaultMaxRecommendations: number;
  enableProgressTracking: boolean;
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

export interface CastingGenerationProgress {
  providerId: CastingProviderId;
  status: 'idle' | 'analyzing' | 'matching' | 'validating' | 'complete' | 'failed';
  currentStage: string;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // milliseconds
  error?: string;
}

export interface DualProviderCastingProgress {
  requestId: string;
  providerA: CastingGenerationProgress;
  providerB: CastingGenerationProgress;
  overallProgress: number; // 0-100
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface ICastingProvider {
  readonly id: CastingProviderId;
  readonly name: string;
  
  init(config: CastingProviderConfig): Promise<void>;
  generateCasting(request: CastingRequest, onProgress?: (progress: CastingGenerationProgress) => void): Promise<CastingResponse>;
  healthCheck(): Promise<HealthStatus>;
  estimateCost(request: CastingRequest): Promise<number>;
}

// ============================================================================
// Quality Metrics Types
// ============================================================================

export interface CastingQualityMetrics {
  overallScore: number; // 0-1
  recommendationRelevance: number; // 0-1
  diversityScore: number; // 0-1
  reasoningQuality: number; // 0-1
  completeness: number; // 0-1
  issues: string[];
}

export const CastingQualityMetricsSchema = z.object({
  overallScore: z.number().min(0).max(1),
  recommendationRelevance: z.number().min(0).max(1),
  diversityScore: z.number().min(0).max(1),
  reasoningQuality: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1),
  issues: z.array(z.string())
});

// ============================================================================
// Provider Selection Types
// ============================================================================

export interface ProviderSelectionResult {
  selectedProvider: CastingProviderId;
  reason: string;
  confidence: number; // 0-1
  qualityScores: {
    [providerId: string]: CastingQualityMetrics;
  };
}

export const ProviderSelectionResultSchema = z.object({
  selectedProvider: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  qualityScores: z.record(CastingQualityMetricsSchema)
});

// ============================================================================
// Error Types
// ============================================================================

export interface CastingError {
  code: string;
  message: string;
  kind: ErrorKind;
  retryable: Retryable;
  providerId?: CastingProviderId;
  details?: unknown;
  timestamp: Date;
}

export const CastingErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  kind: z.nativeEnum(ErrorKind),
  retryable: z.nativeEnum(Retryable),
  providerId: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.date()
});

// ============================================================================
// Batch Processing Types
// ============================================================================

export interface BatchCastingRequest {
  characters: CharacterProfile[];
  sharedContext?: string;
  ensembleDiversityTarget?: number; // 0-1, target diversity for full cast
}

export interface BatchCastingResponse {
  requestId: string;
  castingResults: Map<string, CastingResponse>; // character name -> response
  ensembleDiversityMetrics: DiversityMetrics;
  castingConflicts?: string[]; // e.g., same actor recommended for multiple roles
  recommendations: string[];
  totalGenerationTime: number;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface ProviderHealthReport {
  providerId: CastingProviderId;
  status: HealthStatus;
  lastChecked: Date;
  responseTime?: number; // milliseconds
  errorRate?: number; // 0-1
  availableFeatures: string[];
  limitations?: string[];
}

export const ProviderHealthReportSchema = z.object({
  providerId: z.string(),
  status: z.nativeEnum(HealthStatus),
  lastChecked: z.date(),
  responseTime: z.number().optional(),
  errorRate: z.number().min(0).max(1).optional(),
  availableFeatures: z.array(z.string()),
  limitations: z.array(z.string()).optional()
});
