import { describe, expect, it } from 'vitest';
import { StoryIdeationService } from './storyIdeationService';
import { preloadedKnowledgeBase } from '../constants';

describe('StoryIdeationService.getRelevantKnowledge', () => {
  it('falls back to techniques when themes are unavailable', () => {
    const customDoc = {
      id: 'test-knowledge',
      name: 'Technique Focused Insight',
      content: 'A focused insight on techniques without themes.',
      extractedKnowledge: {
        visualStyles: [],
        characters: [],
        techniques: ['character development technique']
      }
    } as any;

    const originalLength = preloadedKnowledgeBase.length;
    preloadedKnowledgeBase.push(customDoc);

    try {
      const insights = StoryIdeationService.getRelevantKnowledge('protagonist');
      const customInsight = insights.find(entry => entry.includes(customDoc.name));

      expect(customInsight).toBeDefined();
      expect(customInsight).not.toContain('undefined');
      expect(customInsight).toContain('character development technique');
    } finally {
      preloadedKnowledgeBase.splice(originalLength);
    }
  });
});
