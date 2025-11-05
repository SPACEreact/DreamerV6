/**
 * HuggingFace Transformers.js Integration Service
 * Provides browser-based AI capabilities without API keys
 */

export interface HuggingFaceResult {
  text?: string;
  summaries?: string[];
  keywords?: string[];
  sentiment?: string;
  entities?: string[];
  concepts?: string[];
}

// Dynamic import to avoid SSR issues
let transformers: any = null;

const initializeTransformers = async () => {
  if (!transformers) {
    try {
      // Try to dynamically import transformers
      // @ts-ignore
      transformers = await import('@huggingface/transformers');
    } catch (error) {
      // HuggingFace Transformers.js not available. Using fallback implementations.
      return null;
    }
  }
  return transformers;
};

// Fallback implementations for when transformers.js is not available
const fallbackTextAnalysis = (text: string): HuggingFaceResult => {
  const words = text.toLowerCase().split(/\s+/);
  const keywords: string[] = [];
  const sentiment = words.some(word => ['love', 'beautiful', 'wonderful', 'amazing', 'perfect', 'brilliant'].includes(word)) ? 'positive' :
                    words.some(word => ['hate', 'terrible', 'awful', 'horrible', 'disappointing', 'bad'].includes(word)) ? 'negative' : 'neutral';
  
  // Extract potential keywords (words longer than 4 characters)
  words.filter(word => word.length > 4 && !['there', 'where', 'which', 'would', 'could', 'should'].includes(word))
        .slice(0, 5).forEach(word => keywords.push(word));
  
  return { sentiment, keywords };
};

const fallbackSummarization = (text: string): string => {
  // Simple extractive summarization
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length <= 2) return text;
  
  // Take first and last sentence, or first two if only 3 sentences
  const summarySentences = sentences.length === 3 ? sentences.slice(0, 2) : [sentences[0], sentences[sentences.length - 1]];
  return summarySentences.join('. ').trim() + '.';
};

export class HuggingFaceService {
  private static instance: HuggingFaceService;
  private textClassifier: any = null;
  private textSummarizer: any = null;
  private isInitialized = false;

  static getInstance(): HuggingFaceService {
    if (!HuggingFaceService.instance) {
      HuggingFaceService.instance = new HuggingFaceService();
    }
    return HuggingFaceService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const tf = await initializeTransformers();
      if (!tf) {

        this.isInitialized = true;
        return;
      }

      // Initialize models
      // Using lightweight models that work well in browser
      try {
        this.textClassifier = await tf.pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        this.textSummarizer = await tf.pipeline('summarization', 'Xenova/distilbart-cnn-6-6');

      } catch (modelError) {
        // Failed to load specific models, using fallbacks
      }

      this.isInitialized = true;
    } catch (error) {
      // HuggingFace initialization failed, using fallback implementations
      this.isInitialized = true; // Still allow service to work with fallbacks
    }
  }

  async analyzeSentiment(text: string): Promise<string> {
    try {
      if (this.textClassifier && transformers) {
        const result = await this.textClassifier(text);
        return result[0].label === 'POSITIVE' ? 'positive' : 'negative';
      }
    } catch (error) {
      // Sentiment analysis failed, using fallback
    }
    return fallbackTextAnalysis(text).sentiment || 'neutral';
  }

  async extractKeywords(text: string, maxKeywords: number = 10): Promise<string[]> {
    try {
      if (this.textClassifier && transformers) {
        // For keyword extraction, we'll use a simple approach with the classifier
        const words = text.toLowerCase().split(/\s+/);
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could']);
        
        const keywords = words
          .filter(word => word.length > 3 && !stopWords.has(word))
          .slice(0, maxKeywords);
        
        return keywords;
      }
    } catch (error) {
      // Keyword extraction failed, using fallback
    }
    return fallbackTextAnalysis(text).keywords || [];
  }

  async summarizeText(text: string, maxLength: number = 150): Promise<string> {
    try {
      if (this.textSummarizer && transformers) {
        const result = await this.textSummarizer(text, { 
          max_length: maxLength,
          min_length: 30
        });
        return result[0].summary_text;
      }
    } catch (error) {
      // Text summarization failed, using fallback
    }
    return fallbackSummarization(text);
  }

  async analyzeNarrative(text: string): Promise<{
    emotionalTone: string;
    narrativeElements: string[];
    visualCues: string[];
    genre: string;
  }> {
    try {
      const sentiment = await this.analyzeSentiment(text);
      const keywords = await this.extractKeywords(text, 8);
      
      // Simple genre detection based on keywords and sentiment
      let genre = 'drama'; // default
      const visualCues: string[] = [];
      const narrativeElements: string[] = [];

      // Analyze text for genre indicators
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('fight') || lowerText.includes('battle') || lowerText.includes('action')) {
        genre = 'action';
        visualCues.push('dynamic movement', 'intense lighting');
      } else if (lowerText.includes('love') || lowerText.includes('romance') || lowerText.includes('relationship')) {
        genre = 'romance';
        visualCues.push('soft lighting', 'close-up shots');
      } else if (lowerText.includes('fear') || lowerText.includes('dark') || lowerText.includes('scary')) {
        genre = 'horror';
        visualCues.push('shadow play', 'low-key lighting');
      } else if (lowerText.includes('laugh') || lowerText.includes('funny') || lowerText.includes('comedy')) {
        genre = 'comedy';
        visualCues.push('bright colors', 'wide shots');
      }

      // Extract narrative elements
      if (lowerText.includes('character') || lowerText.includes('person')) narrativeElements.push('character development');
      if (lowerText.includes('scene') || lowerText.includes('location')) narrativeElements.push('setting');
      if (lowerText.includes('conflict') || lowerText.includes('problem')) narrativeElements.push('conflict');
      if (lowerText.includes('emotion') || lowerText.includes('feel')) narrativeElements.push('emotional arc');

      return {
        emotionalTone: sentiment,
        narrativeElements: narrativeElements.length > 0 ? narrativeElements : ['storytelling'],
        visualCues: visualCues.length > 0 ? visualCues : ['composition', 'lighting'],
        genre
      };
    } catch (error) {
      return {
        emotionalTone: 'neutral',
        narrativeElements: ['storytelling'],
        visualCues: ['composition', 'lighting'],
        genre: 'drama'
      };
    }
  }

  async enhancePrompt(originalPrompt: string, context: string): Promise<string> {
    try {
      const analysis = await this.analyzeNarrative(originalPrompt + ' ' + context);
      let enhancedPrompt = originalPrompt;

      // Add contextual enhancements based on analysis
      if (analysis.emotionalTone === 'negative') {
        enhancedPrompt += ' with darker undertones';
      } else if (analysis.emotionalTone === 'positive') {
        enhancedPrompt += ' with uplifting elements';
      }

      // Add visual cues based on genre
      if (analysis.visualCues.length > 0) {
        enhancedPrompt += ', featuring ' + analysis.visualCues.join(', ');
      }

      return enhancedPrompt;
    } catch (error) {
      return originalPrompt;
    }
  }

  async getContentSuggestions(content: string, contentType: 'character' | 'scene' | 'visual' = 'scene'): Promise<string[]> {
    try {
      const analysis = await this.analyzeNarrative(content);
      const suggestions: string[] = [];

      // Generate suggestions based on analysis
      if (contentType === 'character' && analysis.narrativeElements.includes('character development')) {
        suggestions.push('Focus on character motivation', 'Explore internal conflict', 'Develop character arc');
      }
      
      if (contentType === 'scene' && analysis.narrativeElements.includes('setting')) {
        suggestions.push('Enhance environmental details', 'Use setting to reflect mood', 'Create atmospheric depth');
      }
      
      if (contentType === 'visual') {
        suggestions.push(`Apply ${analysis.genre} visual style`, 'Consider lighting mood', 'Think about camera movement');
      }

      return suggestions.length > 0 ? suggestions : ['Focus on storytelling', 'Enhance visual elements', 'Consider pacing'];
    } catch (error) {
      return ['Focus on storytelling', 'Enhance visual elements', 'Consider pacing'];
    }
  }

  async generateSuggestions(context: string, questionType: string): Promise<string[]> {
    try {
      const analysis = await this.analyzeNarrative(context);
      const suggestions: string[] = [];

      // Generate specific, actionable suggestions based on question type and context
      switch (questionType) {
        case 'protagonist':
          suggestions.push('A disillusioned cop questioning their career choice');
          suggestions.push('A young artist struggling to find their voice');
          suggestions.push('A parent dealing with an empty nest syndrome');
          if (analysis.narrativeElements.includes('character development')) {
            suggestions.push('A mentor learning from their mistakes');
          }
          break;

        case 'coreWant':
          suggestions.push('To prove they are not like their parent');
          suggestions.push('To save a family member from danger');
          suggestions.push('To achieve recognition they were denied');
          if (analysis.genre === 'romance') {
            suggestions.push('To find true love after heartbreak');
          }
          break;

        case 'centralConflict':
          suggestions.push('Protecting a secret vs. telling the truth');
          suggestions.push('Choosing career vs. family obligations');
          suggestions.push('Fighting for justice in a corrupt system');
          if (analysis.visualCues.includes('intense lighting')) {
            suggestions.push('Internal struggle against external pressure');
          }
          break;

        case 'setting':
          suggestions.push('A small town where everyone knows everyone');
          suggestions.push('A bustling city that never sleeps');
          suggestions.push('An isolated location that creates tension');
          break;

        case 'emotionalTone':
          suggestions.push('Bittersweet - hope mixed with melancholy');
          suggestions.push('Suspenseful - tension building to climax');
          suggestions.push('Whimsical - light-hearted with hidden depth');
          if (analysis.genre === 'horror') {
            suggestions.push('Creepy - unease that builds to terror');
          }
          break;

        case 'stakes':
          suggestions.push('Losing everything they hold dear');
          suggestions.push('Their actions affecting innocent people');
          suggestions.push('An irreversible choice that defines them');
          break;

        case 'turningPoint':
          suggestions.push('Discovering they have a terminal illness');
          suggestions.push('Learning their parent is not who they thought');
          suggestions.push('Realizing the person they trusted is the enemy');
          break;

        default:
          suggestions.push('A character with a hidden talent');
          suggestions.push('A situation with escalating consequences');
          suggestions.push('A relationship that changes everything');
      }

      return suggestions.slice(0, 3); // Return top 3 suggestions
    } catch (error) {
      return [
        'A character facing their biggest fear',
        'A situation where choices have consequences',
        'A relationship that tests loyalty'
      ];
    }
  }

  // Check if the service is ready to use
  isReady(): boolean {
    return this.isInitialized;
  }

  // Cleanup method for disposing models
  cleanup(): void {
    this.textClassifier = null;
    this.textSummarizer = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const huggingFaceService = HuggingFaceService.getInstance();