/// <reference types="vitest" />

import { describe, expect, it, afterEach } from 'vitest';
import { StoryIdeationService } from '../storyIdeationService';
import { preloadedKnowledgeBase } from '../../constants';

const testKnowledgeEntry = {
  id: 'test-knowledge-entry',
  name: 'Test Knowledge Without Themes',
  content: 'Placeholder content for testing.',
  extractedKnowledge: {
    // themes intentionally omitted to simulate missing metadata
    techniques: ['character development'],
    visualStyles: [],
    characters: []
  }
} as unknown as typeof preloadedKnowledgeBase[number];

describe('StoryIdeationService.getRelevantKnowledge', () => {
  afterEach(() => {
    const index = preloadedKnowledgeBase.findIndex(entry => entry.id === testKnowledgeEntry.id);
    if (index !== -1) {
      preloadedKnowledgeBase.splice(index, 1);
    }
  });

  it('formats insights without undefined when metadata fields are missing', () => {
    preloadedKnowledgeBase.push(testKnowledgeEntry);

    const insights = StoryIdeationService.getRelevantKnowledge('protagonist');
    const insight = insights.find(entry => entry.includes(testKnowledgeEntry.name));

    expect(insight).toBeDefined();
    expect(insight).toContain('character development');
    expect(insight).not.toContain('undefined');
  });
});
