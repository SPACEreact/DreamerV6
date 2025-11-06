import { huggingFaceService } from './huggingFaceService';
import { genreIntelligenceService } from './genreIntelligenceService';
import { preloadedKnowledgeBase } from '../constants';

export interface StoryIdeationQuestion {
  id: string;
  title: string;
  question: string;
  placeholder: string;
  category: 'character' | 'plot' | 'theme' | 'setting' | 'conflict' | 'emotion';
  required: boolean;
  knowledgePrompts: string[];
}

export interface StoryContext {
  protagonist?: string;
  antagonist?: string;
  setting?: string;
  timePeriod?: string;
  age?: string;
  genre?: string;
  mainConflict?: string;
  centralTheme?: string;
  emotionalTone?: string;
  stakes?: string;
  storyType?: 'feature' | 'short' | 'commercial' | 'music_video' | 'documentary';
  coreWant?: string;
  centralConflict?: string;
  turningPoint?: string;
}

export const storyIdeationQuestions: StoryIdeationQuestion[] = [
  {
    id: 'protagonist',
    title: 'Protagonist',
    question: 'Who is your main character? Describe their age, occupation, and current situation.',
    placeholder: 'e.g., Maya, 28, struggling filmmaker living in Brooklyn...',
    category: 'character',
    required: true,
    knowledgePrompts: ['character development', 'protagonist', 'save the cat']
  },
  {
    id: 'coreWant',
    title: 'Core Desire',
    question: 'What does your protagonist desperately want? What drives them?',
    placeholder: 'e.g., She wants to make a film that changes her father\'s mind about her career choice.',
    category: 'character',
    required: true,
    knowledgePrompts: ['character motivation', 'desire', 'stakes']
  },
  {
    id: 'centralConflict',
    title: 'Central Conflict',
    question: 'What stands in their way? What is the main obstacle or opposition?',
    placeholder: 'e.g., Her father is a traditional banker who disapproves of the film industry...',
    category: 'conflict',
    required: true,
    knowledgePrompts: ['conflict', 'obstacles', 'unity of opposites']
  },
  {
    id: 'setting',
    title: 'Setting & World',
    question: 'Where and when does your story take place? What makes this setting significant?',
    placeholder: 'e.g., Brooklyn in 2024, where gentrification is forcing out the creative community...',
    category: 'setting',
    required: false,
    knowledgePrompts: ['world building', 'setting', 'location']
  },
  {
    id: 'emotionalTone',
    title: 'Emotional Journey',
    question: 'What emotional journey does your audience experience? How should they feel?',
    placeholder: 'e.g., Hopeful yet anxious, with moments of triumph and vulnerability...',
    category: 'emotion',
    required: false,
    knowledgePrompts: ['emotion', 'tone', 'audience connection']
  },
  {
    id: 'stakes',
    title: 'Stakes',
    question: 'What happens if your protagonist fails? What makes this story urgent?',
    placeholder: 'e.g., If she fails, she\'ll have to give up her dreams and take a corporate job...',
    category: 'conflict',
    required: true,
    knowledgePrompts: ['stakes', 'urgency', 'consequences']
  },
  {
    id: 'storyType',
    title: 'Story Format',
    question: 'What type of story are you telling? This helps Dreamer understand the pacing and style.',
    placeholder: 'e.g., Character drama with comedic moments...',
    category: 'plot',
    required: false,
    knowledgePrompts: ['genre', 'story structure', 'format']
  },
  {
    id: 'turningPoint',
    title: 'Key Moment',
    question: 'What is the pivotal moment that changes everything for your protagonist?',
    placeholder: 'e.g., She discovers her father secretly supports her, but he\'s dying...',
    category: 'plot',
    required: false,
    knowledgePrompts: ['turning point', 'climax', 'story arc']
  }
];

export interface SmartSuggestion {
  recommendation: string;
  rationale: string;
  source: 'analysis' | 'knowledge';
}

export class StoryIdeationService {
  static ageContextMap: Record<string, string> = {
    'child': 'Innocence, wonder, vulnerability to adult world, formation of identity',
    'teenager': 'Identity crisis, rebellion vs conformity, first love, peer pressure, finding independence',
    'young_adult': 'Career building, relationship exploration, leaving home, financial independence, purpose finding',
    'adult': 'Career stability, family building, midlife reflection, responsibility balance, achievement',
    'middle_aged': 'Empty nest, marriage changes, career peak or crisis, health awareness, legacy thinking',
    'elder': 'Wisdom sharing, life reflection, health challenges, legacy, mortality acceptance'
  };

  static getRelevantKnowledge(questionId: string): string[] {
    const question = storyIdeationQuestions.find(q => q.id === questionId);
    if (!question) return [];

    return question.knowledgePrompts.flatMap(prompt =>
      preloadedKnowledgeBase
        .filter(doc =>
          doc.extractedKnowledge?.themes?.some(theme => theme.includes(prompt)) ||
          doc.extractedKnowledge?.techniques?.some(technique => technique.includes(prompt)) ||
          doc.name.toLowerCase().includes(prompt.toLowerCase())
        )
        .map(doc => {
          const themes = doc.extractedKnowledge?.themes;
          const techniques = doc.extractedKnowledge?.techniques;
          const highlightSource = Array.isArray(themes) && themes.length
            ? themes.slice(0, 2)
            : Array.isArray(techniques) && techniques.length
              ? techniques.slice(0, 2)
              : null;

          const highlightText = highlightSource?.join(', ') || 'Key insights';

          return `📚 ${doc.name}: ${highlightText}...`;
        })
    );
  }

  static enhanceAnswerWithContext(questionId: string, answer: string, context: Partial<StoryContext>): string {
    if (questionId === 'protagonist' && context.age) {
      const ageGroup = this.getAgeGroup(context.age);
      const ageInsights = this.ageContextMap[ageGroup];
      if (ageInsights) {
        return `${answer}

💭 Age Context: ${ageInsights}`;
      }
    }

    if (questionId === 'emotionalTone' && context.genre) {
      return `${answer}

🎭 Genre Insight: For ${context.genre} stories, focus on ${this.getGenreEmotionalFocus(context.genre)}`;
    }

    return answer;
  }

  static getAgeGroup(ageInput: string): string {
    const age = parseInt(ageInput);
    if (isNaN(age)) {
      const input = ageInput.toLowerCase();
      if (input.includes('child') || input.includes('kid')) return 'child';
      if (input.includes('teen') || input.includes('adolescent')) return 'teenager';
      if (input.includes('young') || (age >= 18 && age <= 25)) return 'young_adult';
      if (age >= 26 && age <= 40) return 'adult';
      if (age >= 41 && age <= 55) return 'middle_aged';
      if (age >= 56) return 'elder';
      return 'adult';
    }

    if (age < 13) return 'child';
    if (age < 18) return 'teenager';
    if (age < 26) return 'young_adult';
    if (age < 41) return 'adult';
    if (age < 56) return 'middle_aged';
    return 'elder';
  }

  static getGenreEmotionalFocus(genre: string): string {
    const focusMap: Record<string, string> = {
      'drama': 'authentic emotions and character development',
      'comedy': 'uplifting moments and character flaws',
      'thriller': 'suspense and tension building',
      'romance': 'intimacy and emotional connection',
      'horror': 'fear and psychological tension',
      'action': 'adrenaline and visual spectacle',
      'sci-fi': 'wonder and philosophical questions',
      'fantasy': 'magic and moral choices',
      'documentary': 'truth and social insight'
    };

    return focusMap[genre.toLowerCase()] || 'engaging storytelling';
  }

  static async analyzeStoryForGenre(context: Partial<StoryContext>): Promise<string | null> {
    try {
      const storyText = [
        context.protagonist,
        context.coreWant,
        context.centralConflict,
        context.emotionalTone
      ].filter(Boolean).join(' ');

      if (!storyText.trim()) return null;

      const genre = await genreIntelligenceService.detectGenre(storyText, context as any);
      return genre.genre;
    } catch (error) {
      return null;
    }
  }

  static async generateSmartSuggestions(
    questionId: string,
    context: Partial<StoryContext>,
    allAnswers: Record<string, string>
  ): Promise<SmartSuggestion | null> {
    try {
      const answeredEntries = Object.entries(allAnswers)
        .filter(([, value]) => value.trim().length > 0);

      const contextText = answeredEntries
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      const knowledgeEntries = this.getRelevantKnowledge(questionId);
      const knowledgeContext = knowledgeEntries.join('\n');

      const fullContext = `${knowledgeContext}\n\nStory Context:\n${contextText}`.trim();

      const analysisSuggestions = await huggingFaceService.generateSuggestions(fullContext, questionId);

      const candidates: Array<{
        text: string;
        source: 'analysis' | 'knowledge';
        reference?: string;
        weight: number;
      }> = [];

      analysisSuggestions
        .filter(Boolean)
        .forEach((text, index) => {
          candidates.push({
            text,
            source: 'analysis',
            weight: 3 - index
          });
        });

      knowledgeEntries.forEach(entry => {
        const clean = entry.replace(/^📚\s*/, '');
        const [referencePart, detailPart] = clean.split(':');
        const detail = (detailPart || referencePart).trim();
        const reference = detailPart ? referencePart.trim() : undefined;

        candidates.push({
          text: detail,
          source: 'knowledge',
          reference,
          weight: 1.5
        });
      });

      if (candidates.length === 0) {
        return null;
      }

      const emphasisKeywords = new Set(
        answeredEntries
          .slice(-2)
          .flatMap(([, value]) => value.toLowerCase().split(/[^a-z0-9]+/))
          .filter(word => word.length > 4)
      );

      const scored = candidates.map(candidate => {
        const matches = candidate.text
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(token => emphasisKeywords.has(token)).length;

        return {
          ...candidate,
          score: candidate.weight + matches * 0.75,
          matchedKeyword: [...emphasisKeywords].find(keyword => candidate.text.toLowerCase().includes(keyword))
        };
      });

      const best = scored.sort((a, b) => b.score - a.score)[0];

      const rationaleParts: string[] = [];

      if (best.source === 'analysis') {
        rationaleParts.push('Derived from Dreamer\'s narrative analysis of your answers');
      } else if (best.reference) {
        rationaleParts.push(`Inspired by ${best.reference} from the knowledge base`);
      } else {
        rationaleParts.push('Sourced from Dreamer\'s knowledge base');
      }

      if (best.matchedKeyword) {
        rationaleParts.push(`Connects with your focus on "${best.matchedKeyword}"`);
      }

      const fallbackFocus = answeredEntries.length > 0
        ? answeredEntries[answeredEntries.length - 1][0]
        : context.genre ? 'genre' : 'story';

      const rationale = rationaleParts.length > 0
        ? rationaleParts.join('. ') + '.'
        : `Provides a strong next step for refining the ${fallbackFocus}.`;

      return {
        recommendation: best.text,
        rationale,
        source: best.source
      };
    } catch (error) {
      const fallback = this.getRelevantKnowledge(questionId)[0];
      if (!fallback) {
        return null;
      }

      return {
        recommendation: fallback.replace(/^📚\s*/, ''),
        rationale: 'Fallback recommendation supplied from Dreamer\'s knowledge base.',
        source: 'knowledge'
      };
    }
  }

  static buildScriptFromContext(context: Partial<StoryContext>): string {
    const parts: string[] = [];

    const addPart = (label: string, value?: string) => {
      const trimmed = value?.trim();
      if (trimmed) {
        parts.push(`${label}: ${trimmed}`);
      }
    };

    addPart('PROTAGONIST', context.protagonist);
    addPart('SETTING', context.setting);
    addPart('TIME PERIOD', context.timePeriod);
    addPart('CORE DESIRE', context.coreWant);
    addPart('CENTRAL CONFLICT', context.centralConflict);
    addPart('STAKES', context.stakes);
    addPart('EMOTIONAL TONE', context.emotionalTone);
    addPart('KEY MOMENT', context.turningPoint);

    return parts.join('\n\n');
  }

  static shouldShowQuestion(questionId: string, context: Partial<StoryContext>): boolean {
    const hasCoreWant = !!context.coreWant?.trim();
    const hasCentralConflict = !!context.centralConflict?.trim();
    const hasGenreContext = !!context.genre?.trim() || !!context.storyType?.trim();

    switch (questionId) {
      case 'stakes':
        return hasCoreWant; // Only show if we know what they want
      case 'turningPoint':
        return hasCoreWant && hasCentralConflict; // Only show if we have conflict setup
      case 'emotionalTone':
        return hasGenreContext; // Show if genre is determined
      default:
        return true;
    }
  }
}