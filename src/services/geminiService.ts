import { HuggingFaceService } from './huggingFaceService';
import { GenreIntelligenceService } from './genreIntelligenceService';
import type { StoryContext } from './storyIdeationService';

const huggingFaceService = HuggingFaceService.getInstance();
const genreService = GenreIntelligenceService.getInstance();

const ensureInitialized = async () => {
  await huggingFaceService.initialize();
};

export interface EnhancedInsight {
  recommendation: string;
  rationale: string;
  metadata: {
    genre: string;
    tone: string;
    visualHook: string;
  };
}

export interface VideoPromptRequest {
  script: string;
  context?: Partial<StoryContext>;
  duration?: string;
  mood?: string;
  visualStyle?: string;
}

export interface VideoPromptResult {
  prompt: string;
  beats: string[];
  tags: string[];
  summary: string;
}

const FALLBACK_INSIGHT: EnhancedInsight = {
  recommendation: 'Describe a clear establishing shot that orients the audience before you escalate the sequence.',
  rationale: 'No story context was provided, so Dreamer recommends starting with a simple orientation shot that works for any genre.',
  metadata: {
    genre: 'unknown',
    tone: 'neutral',
    visualHook: 'establishing shot'
  }
};

export const getKnowledgeBasedSuggestions = async (
  script: string,
  context: Partial<StoryContext> = {}
): Promise<EnhancedInsight> => {
  const combinedSource = [script, ...Object.values(context)]
    .map(entry => entry?.trim())
    .filter(Boolean)
    .join('\n');

  if (!combinedSource) {
    return FALLBACK_INSIGHT;
  }

  await ensureInitialized();

  const narrative = await huggingFaceService.analyzeNarrative(combinedSource);
  const genreProfile = await genreService.detectGenre(combinedSource, context as Record<string, any>);

  const visualHook = narrative.visualCues[0]
    || genreProfile.characteristics.visualStyle[0]
    || 'bold composition';

  const recommendation = `Lean into a ${visualHook} that underscores the ${genreProfile.genre} energy while highlighting ${narrative.narrativeElements[0]}.`;
  const lightingCue = genreProfile.characteristics.lighting[0] || 'motivated lighting';
  const rationale = `This builds on the ${narrative.emotionalTone} tone detected in your material and borrows ${lightingCue} from ${genreProfile.genre} filmmaking to strengthen the mood.`;

  return {
    recommendation,
    rationale,
    metadata: {
      genre: genreProfile.genre,
      tone: narrative.emotionalTone,
      visualHook
    }
  };
};

export const generateVideoPrompt = async (
  request: VideoPromptRequest
): Promise<VideoPromptResult> => {
  const script = request.script?.trim();

  if (!script) {
    throw new Error('A script or outline is required before Dreamer can build a video prompt.');
  }

  await ensureInitialized();

  const summary = await huggingFaceService.summarizeText(script, 140);
  const narrative = await huggingFaceService.analyzeNarrative(script);
  const genreProfile = await genreService.detectGenre(script, request.context as Record<string, any>);

  const duration = request.duration || '45-second';
  const primaryVisual = request.visualStyle
    || genreProfile.characteristics.visualStyle[0]
    || 'cinematic framing';
  const lightingCue = genreProfile.characteristics.lighting[0] || 'motivated lighting';
  const cameraMove = genreProfile.suggestions.camera[0] || 'intentional camera movement';

  const prompt = [
    `Craft a ${duration} ${genreProfile.genre} video.`,
    `Focus on ${summary.toLowerCase()}.`,
    `Use ${primaryVisual} with ${lightingCue} and ${cameraMove}.`,
    request.mood ? `Maintain a ${request.mood} mood throughout.` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const beats: string[] = [];
  const protagonist = request.context?.protagonist || 'the lead character';

  beats.push(`Introduce ${protagonist} within a ${primaryVisual} establishing shot.`);
  beats.push(`Escalate tension using ${cameraMove.toLowerCase()} as the stakes surface.`);
  beats.push(`Resolve with ${lightingCue.toLowerCase()} that mirrors the emotional payoff.`);

  const tags = Array.from(
    new Set([
      genreProfile.genre,
      narrative.emotionalTone,
      primaryVisual,
      lightingCue,
      request.mood,
      request.context?.storyType,
    ].filter(Boolean) as string[])
  );

  return {
    prompt,
    beats,
    tags,
    summary,
  };
};
