import { describe, expect, it, vi } from 'vitest';
import { StoryIdeationService } from './storyIdeationService';
import { preloadedKnowledgeBase } from '../constants';
import { huggingFaceService } from './huggingFaceService';

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

describe('StoryIdeationService.generateSmartSuggestions', () => {
  it('returns a best suggestion with justification and preserves alternates', async () => {
    const mockSuggestions = ['Build a rival filmmaker as antagonist', 'Make the stakes about losing funding'];
    const spy = vi
      .spyOn(huggingFaceService, 'generateSuggestions')
      .mockResolvedValue(mockSuggestions);

    const result = await StoryIdeationService.generateSmartSuggestions(
      'centralConflict',
      {
        coreWant: 'to prove her creative vision',
        genre: 'drama'
      },
      {
        protagonist: 'Maya, 28-year-old filmmaker in Brooklyn',
        coreWant: 'to prove her creative vision'
      }
    );

    expect(result.targetQuestionId).toBe('centralConflict');
    expect(result.bestSuggestion).toBeDefined();
    expect(result.bestSuggestion?.text).toBe(mockSuggestions[0]);
    expect(result.bestSuggestion?.reason.length).toBeGreaterThan(0);
    expect(result.additionalSuggestions).toContain(mockSuggestions[1]);

    spy.mockRestore();
  });

  it('falls back to knowledge suggestions when generator provides none', async () => {
    const spy = vi
      .spyOn(huggingFaceService, 'generateSuggestions')
      .mockResolvedValue([]);

    const result = await StoryIdeationService.generateSmartSuggestions(
      'stakes',
      { coreWant: 'to save her community' },
      {
        protagonist: 'Maya',
        coreWant: 'to save her community'
      }
    );

    expect(result.bestSuggestion).toBeDefined();
    expect(result.bestSuggestion?.text.length).toBeGreaterThan(0);
    expect(result.bestSuggestion?.reason.length).toBeGreaterThan(0);

    spy.mockRestore();
  });
});
